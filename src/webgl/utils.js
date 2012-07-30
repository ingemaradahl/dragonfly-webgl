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

