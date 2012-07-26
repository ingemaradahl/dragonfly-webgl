"use strict";

window.WebGLUtils || (window.WebGLUtils = {});

window.WebGLUtils.compile_program = function (vs, fs, gl)
{
  if (!gl)
  {
    if (!(gl = window.webgl.gl))
    {
      return null;
    }
  }

  var compile = function (shd)
  {
    var shader = gl.createShader(shd.type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, shd.src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "An error occurred compiling shader " + shd.id + ": " + gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  };

  var vertex_shader = compile(vs);
  var fragment_shader = compile(fs);

  var program = gl.createProgram();
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
        "An error occured while linking shaders.");
    return null;
  }

  return program;
};

window.WebGLUtils.get_fullscreen_quad = function()
{
  return {
    position : [ -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0 ],
    uv : [ 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0 ]
  };
};

window.WebGLUtils.draw_texture = function(program, texture, gl)
{
  if (!gl)  {
    if (!(gl = window.webgl.gl))
      return null;
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!gl._quad)
  {
    var quad = WebGLUtils.get_fullscreen_quad();

    gl._quad = {};
    gl._quad.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad.position), gl.STATIC_DRAW);

    gl._quad.uv = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.uv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad.uv), gl.STATIC_DRAW);
  }

  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.position);
  gl.vertexAttribPointer(program.positionAttrib, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.uv);
  gl.vertexAttribPointer(program.uvAttrib, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(program.samplerUniform, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

/**
 * Wraps up default group function of a sortable table into a function that
 * changes visible columns based on object describing what column to remove/add
 * when changing group
 * @param {SortableTable} table
 * @param {Object} group_mutexes Describes each group by what to add and what to
 *  remove. Example: {group: "foo", remove: "foo-column", add: "bar-column"}
 */
window.WebGLUtils.make_group = function(table, group_mutexes)
{
  var orig_group = table.group.bind(table);
  return function (group) {
    for (var i=0; i<group_mutexes.length; i++)
    {
      var def = group_mutexes[i];
      if (def.group === group)
      {
        this.columns = this.columns.filter(function(columns) { return columns !== def.remove});
        if (this.columns.indexOf(def.add) === -1)
          this.columns.unshift(def.add);

        break;
      }
    }

    orig_group(group);
  }.bind(table);
};

