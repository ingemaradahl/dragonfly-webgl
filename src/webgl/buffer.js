"use strict";

window.cls || (window.cls = {});

cls.WebGLBuffer = function()
{
  this.gl_buffer = null;

  // Buffer layouts as specified by vertexAttribPointer, indexed by call_index
  this.vertex_attribs = {};
};


/* Initiates a sequence of calls to update the metadata of a buffer and get the 
 * current data.
 */
cls.WebGLBuffer.prototype.get_buffer_data = function()
{
  var finalize = function (data)
  {
    this.data = data;
    messages.post('webgl-buffer-data', this);
  };

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_object(this.data, true);
};

cls.WebGLBuffer.prototype.show = function()
{
  window.views.webgl_buffer.show_buffer(this);

  if (!this.data_is_loaded())
  {
    this.get_buffer_data();
  }
};

cls.WebGLBuffer.prototype.toString = function()
{
  return this.name ? this.name : "Buffer " + String(this.index);
};

cls.WebGLBuffer.prototype.usage_string = function()
{
  return window.webgl.api.function_argument_to_string("bufferData", "usage", this.usage);
};

cls.WebGLBuffer.prototype.target_string = function()
{
  return window.webgl.api.function_argument_to_string("bufferData", "target", this.target);
};

cls.WebGLBuffer.prototype.data_is_loaded = function()
{
  return this.data.object_id === undefined;
};

