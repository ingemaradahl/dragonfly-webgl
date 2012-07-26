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
cls.WebGLBuffer.prototype.request_data = function()
{
  if (this.data_is_loaded() || this.data.downloading)
    return;

  var finalize = function (data)
  {
    this.data = data;
    messages.post('webgl-buffer-data', this);
  };

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_object(this.data, true);
  this.data.downloading = true;
};

cls.WebGLBuffer.prototype.toString = function()
{
  // TODO add setting to control if the index_snapshot or index should be used.
  return this.name ? this.name : "Buffer " + String(this.index_snapshot + 1);
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

