"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 */
cls.WebGLMeshDrawer = function(gl)
{
  this.gl = gl;
  this.program = null;
  this.draw_mode = gl.TRIANGLES;
  this.baerentzen = false;

  this.mouse = {x:0, y:0};
  this.prev_mouse = {x:0, y:0};
  this.rot = {x:0, y:0};
  this.zoom = -10;

  var on_mousemove = function(event)
  {
    this.prev_mouse.x = this.mouse.x;
    this.prev_mouse.y = this.mouse.y;
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    this.render();
  }.bind(this);

  var on_mouseup = function(evt, target)
  {
    document.removeEventListener('mousemove', on_mousemove, false);
    document.removeEventListener('mouseup', on_mouseup, false);
  }.bind(this);

  var on_mousedown = function(evt, target)
  {
    this.mouse.x = evt.clientX;
    this.mouse.y = evt.clientY;
    document.addEventListener('mousemove', on_mousemove, false);
    document.addEventListener('mouseup', on_mouseup, false);
  };

  var on_mousewheel = function(evt, target)
  {
    this.prev_mouse.x = this.mouse.x;
    this.prev_mouse.y = this.mouse.y;
    this.zoom *= 1-evt.wheelDelta / 400; // TODO 400 :S
    this.render();
  };

  var eh = window.eventHandlers;
  eh.mousedown["webgl-canvas"] = on_mousedown.bind(this);
  eh.mousewheel["webgl-canvas"] = on_mousewheel.bind(this);
};

cls.WebGLMeshDrawer.prototype.set_program = function(program)
{
  this.program = program;
};

cls.WebGLMeshDrawer.prototype.init_buffer = function(buffer)
{
  if (!buffer.gl_buffer)
  {
    if (buffer.data_is_loaded())
    {
      // Make sure there's no funky stuff going on
      var constructor;
      switch (buffer.constructor)
      {
        case "Float32Array":
        case "Uint8Array":
        case "Uint16Array":
        case "Uint32Array":
        case "Int8Array":
        case "Int16Array":
        case "Int32Array":
          constructor = eval(buffer.constructor);
          break;
        default:
          throw "Invalid constructor: " + buffer.constructor + " in init_buffer";
      }

      var gl = this.gl;
      buffer.gl_buffer = gl.createBuffer();
      gl.bindBuffer(buffer.target, buffer.gl_buffer);
      gl.bufferData(buffer.target, new constructor(buffer.data),gl.STATIC_DRAW);

      if (buffer.target === gl.ELEMENT_ARRAY_BUFFER)
      {
        buffer.type = constructor === Uint8Array 
          ? gl.UNSIGNED_BYTE
          : gl.UNSIGNED_SHORT;
      }
    }
    else
    {
      buffer.get_buffer_data();
      return false;
    }
  }

  return true;
};

cls.WebGLMeshDrawer.prototype.buffers_ready = function()
{
  return this.element_buffer 
    ? this.element_buffer.gl_buffer && this.buffer.gl_buffer
    : Boolean(this.buffer.gl_buffer);
}


cls.WebGLMeshDrawer.prototype.set_attribute = function(attribute, element_buffer)
{
  this.buffer = attribute.buffer;
  this.init_buffer(this.buffer);
  this.layout = attribute.pointer.layout;
  this.element_buffer = element_buffer;

  this.rot = {x:0, y:0};
  this.zoom = -5;

  var element_ok;
  if (this.element_buffer)
  {
    element_ok = this.init_buffer(element_buffer);
  }

  if (!this.buffers_ready())
  {
    this._listener = cls.WebGLMeshDrawer.prototype.on_buffer_data.bind(this);
    messages.addListener('webgl-buffer-data', this._listener);
  }
};

cls.WebGLMeshDrawer.prototype.on_buffer_data = function(buffer)
{
  if (this.buffer === buffer || this.element_buffer === buffer)
  {
    this.init_buffer(buffer);
  }

  if (this.buffers_ready())
  {
    messages.removeListener('webgl-buffer-data', this._listener);
    this.render();
  }
};

/* Enable wireframe rendering based on the work by J. A. Bærentzen et.al
 * http://cgg-journal.com/2008-2/06/index.html
 */
cls.WebGLMeshDrawer.prototype.set_baerentzen = function()
{
  this.baerentzen = true;

  if (this.buffers_ready())
  {
    // TODO :P
  }
};

cls.WebGLMeshDrawer.prototype.model_view_matrix = function()
{
  var mvMatrix = mat4.create();
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, [0.0, 0.0, this.zoom]);
  mat4.rotate(mvMatrix, this.deg_to_rad(this.rot.y), [1, 0, 0]);
  mat4.rotate(mvMatrix, this.deg_to_rad(this.rot.x), [0, 1, 0]);

  return mvMatrix;
};

cls.WebGLMeshDrawer.prototype.set_rotation = function()
{
  this.rot.x += this.mouse.x-this.prev_mouse.x;
  this.rot.y += this.mouse.y-this.prev_mouse.y;
}

cls.WebGLMeshDrawer.prototype.deg_to_rad = function(degrees)
{
  return degrees * Math.PI / 180;
};

cls.WebGLMeshDrawer.prototype.render = function(program)
{
  program = program || this.program;

  var gl = this.gl;

  var width = gl.canvas.width;
  var height = gl.canvas.height;

  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!this.buffers_ready() || !program)
    return;

  this.set_rotation();

  var pMatrix = mat4.create();
  mat4.perspective(45, width / height, 0.1, 100.0, pMatrix);
  var mvMatrix = this.model_view_matrix();

  gl.useProgram(program);

  gl.uniformMatrix4fv(program.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.gl_buffer);
  gl.vertexAttribPointer(program.positionAttrib, this.layout.size, this.layout.type,
    this.layout.normalized, this.layout.stride, this.layout.offset);

  // TODO cleanup, fix length
  if (this.element_buffer)
  {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.element_buffer.gl_buffer);
    gl.drawElements(this.draw_mode, this.element_buffer.data.length, this.element_buffer.type, 0);
  }
  else
  {
    gl.drawArrays(this.draw_mode, 0, this.buffer.data.length/this.layout.size);
  }
};

