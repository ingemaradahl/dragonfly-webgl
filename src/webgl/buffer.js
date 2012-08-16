"use strict";

window.cls || (window.cls = {});

cls.WebGLBuffer = function()
{
  // Buffer layouts at draw calls, indexed by call_index
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

/**
 * Determines if the buffer is eligible for a buffer preview
 * @returns {Boolean} Whether the buffer can be used as in a preview object
 */
cls.WebGLBuffer.prototype.previewable = function()
{
  return this.target === window.webgl.gl.ARRAY_BUFFER && this.size;
};

/**
 * Constructs a buffer setting object, describing the layout, mode and so on
 * about the buffer based on the draw call it was used in, if it exists
 */
cls.WebGLBuffer.prototype.build_settings = function(snapshot, call_index)
{
  var gl = window.webgl.gl;

  // Creates a dict of all possible options settable for a draw call
  var buffer_options = function ()
  {
    var element_buffers = [];
    for (var i=0; i<snapshot.buffers.length; i++)
    {
      var buffer = snapshot.buffers[i];
      if (buffer.target === gl.ELEMENT_ARRAY_BUFFER)
        element_buffers.push(buffer);
    }
    element_buffers.push(null);

    return {
      types: [gl.BYTE, gl.SHORT, gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT, gl.FLOAT],
      modes: [gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP],
      element_types: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT],
      element_buffers: element_buffers
    };
  };

  if (!this.previewable())
    return null;

  var calls = [];
  var layout = null;

  // Find all the calls that used this buffer as a vertex attribute pointer
  for (var call in this.vertex_attribs)
  {
    if (this.vertex_attribs.hasOwnProperty(call))
    {
      var pointers = this.vertex_attribs[call];
      for (var p=0; p<pointers.length; p++)
      {
        if (pointers[p].buffer === this)
          calls.push(Number(call));
      }
    }
  }

  if (calls.length === 0)
  {
    // Buffer was never used as an VAP, so just load the default settings
    return {
      offset : 0,
      stride : 0,
      size : 3,
      type : gl.FLOAT,
      mode : gl.TRIANGLES,
      'element-array' : null,
      'element-type'  : null,
      start : 0,
      count : this.data.length
        ? Math.round(this.data.length / 3) // Default size is 3
        : Math.round(this.size / 12), // Default type is FLOAT (4 bytes), times size (3)
      options : buffer_options()
    };
  }

  // Load the next drawcall after the current call index
  var call_index = call_index;
  var call = calls.reduce(function(prev, curr) { return curr < prev && curr > call_index ? curr : prev; }, Infinity);
  var vertex_attrib = this.vertex_attribs[call];
  var draw_call = snapshot.drawcalls.get_by_call(call);
  var element_buffer = vertex_attrib.element_buffer;

  for (var i=0; i<vertex_attrib.length; i++)
  {
    var pointer = vertex_attrib[i];
    if (pointer.buffer === this)
    {
      layout = pointer.layout;
      break;
    }
  }

  return {
    offset : layout.offset,
    stride : layout.stride,
    size : layout.size,
    type : layout.type,
    mode : draw_call.parameters.mode,
    'element-array' : element_buffer ? element_buffer : null,
    'element-type' : element_buffer
      ? element_buffer.constructor === "Uint8Array"
        ? gl.UNSIGNED_BYTE
        : gl.UNSIGNED_SHORT
      : null,
    start : draw_call.parameters.first !== undefined ? draw_call.parameters.first : draw_call.parameters.offset,
    count : draw_call.parameters.count,
    options : buffer_options()
  };
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

