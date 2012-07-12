"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 */
cls.WebGLMeshDrawer = function(gl, program, buffer, element_buffer)
{
  if (!buffer.data_is_loaded() || !(element_buffer && element_buffer.data_is_loaded()))
    return;

  this.gl = gl;
  this.program = program;
  this.draw_mode = gl.TRIANGLES;

  this.init_buffer(buffer)

  if (element_buffer)
  {
    this.init_buffer(element_buffer);
    this.element_buffer = element_buffer;
  }

  this.buffer = buffer;


  this.gl.useProgram(program);
};

cls.WebGLMeshDrawer.prototype.init_buffer = function(buffer)
{
  if (!buffer.gl_buffer)
  {
    var gl = this.gl;
    buffer.gl_buffer = gl.createBuffer();
    gl.bindBuffer(buffer.target, buffer.gl_buffer);
    // TODO: ArrayBufferView dependent on buffer?
    gl.bufferData(
      buffer.target, 
      buffer.target === gl.ELEMENT_ARRAY_BUFFER 
        ? new Uint16Array(buffer.data)
        : new Float32Array(buffer.data),
      gl.STATIC_DRAW
    );
  }
};

/**
 * Sets a new buffer which to draw
 * @param {cls.WebGLBuffer} buffer Buffer to draw
 * @param {cls.WebGLBuffer} [element_buffer] Which element array buffer to use.
 * @param {cls.WebGLSnapshot} [snapshot] Optionally also change snapshot.
 */
cls.WebGLMeshDrawer.prototype.set_buffer = function(buffer, element_buffer, snapshot)
{
  this.buffer = buffer;
  this.snapshot = snapshot || this.snapshot;

  this.init_buffer(buffer);
  this.element_buffer = element_buffer;
  if (this.element_buffer)
  {
    this.init_buffer(this.element_buffer);
  }
};

cls.WebGLMeshDrawer.prototype.draw_buffer_layout = function(buffer, layout, element_buffer)
{
  this.buffer = buffer;
  this.element_buffer = element_buffer;

  this.init_buffer(this.buffer);
  if (this.element_buffer)
  {
    this.init_buffer(this.element_buffer);
  }

  var gl = this.gl;
  var program = this.program;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.gl_buffer);
  gl.vertexAttribPointer(program.positionAttrib, layout.size, layout.type, 
    layout.normalized, layout.stride, layout.offset
  );
};

cls.WebGLMeshDrawer.prototype.render = function()
{
  var gl = this.gl;
  var program = this.program;

  var width = gl.canvas.width;
  var height = gl.canvas.height;

  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var pMatrix = mat4.create();
  mat4.perspective(45, width / height, 0.1, 100.0, pMatrix);

  var mvMatrix = mat4.create();
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, [0.0, 0.0, -2.0]);

  gl.uniformMatrix4fv(program.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);

  if (this.element_buffer)
  {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.element_buffer.gl_buffer);
    gl.drawElements(this.draw_mode, this.element_buffer.data.length, gl.UNSIGNED_BYTE, 0);
  }
  else
  {
    gl.drawArray(this.draw_mode, 0, Math.floor(this.buffer.data.length/3));
  }
};

//cls.WebGLMeshDrawer.prototype.render_drawcall = function(drawcall)
//{
//  var attributes = drawcall.program.attributes;
//
//  if (drawcall.element_buffer)
//  {
//    this.element_buffer = drawcall.element_buffer;
//    this.init_buffer(this.element_buffer);
//  }
//  else
//  {
//    this.element_buffer = null;
//  }
//
//  var position = null;
//  for (var i=0; i<attributes.length; i++)
//  {
//    var buffer = attributes[i].buffer;
//    this.init_buffer(buffer);
//    var pointer = attributes[i].pointer;
//
//
//  }
//}

