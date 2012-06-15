"use strict";

window.cls || (window.cls = {});

/*
 * Manages data that concerns one single WebGL context.
 */
cls.WebGLData = function (context_id)
{
  this.context_id = context_id;
  this.texture_names = [];

  this.shaders = {};

  this.states = [];

  this.test_data;

  /*
   * Call traces of WebGL calls.
   * Stored in the same order as they are recived.
   */
  this.traces = [];

  /*
   * FBO snapshots coupled with WebGL calls in a trace
   * Stored with same indexing as traces
   */
  this.snapshots = [];

  /*
   * Buffers are stored as Buffer objects where they are ordered in the same 
   * order as they are created on the remote side.
   */
  this.buffers = [];

  /*
   * Gets the latest trace data for a specified context id, null if not available.
   */
  this.get_latest_trace = function()
  {
    return this.traces[this.traces.length-1];
  }

  this.add_trace = function(trace)
  {
    this.traces.push(trace);
  };

  this.add_snapshot = function(snapshot)
  {
    this.snapshots[snapshot.trace_idx] || (this.snapshots[snapshot.trace_idx] = []);
    this.snapshots[snapshot.trace_idx].push(snapshot);

    if (!snapshot.pixels && !snapshot.downloading)
    {
      var tag = tagManager.set_callback(this, this._received_pixels, [snapshot]);
      window.services["ecmascript-debugger"].requestExamineObjects(tag, [webgl.runtime_id, [snapshot.pixels_object]]);
      snapshot.downloading = true;
    }
  };

  // Gets the latest test data for speed test of data transmission
  this.get_test_data = function()
  {
    var data = this.test_data;
    if (typeof(data) != "number") return null;
    return data;
  };

  // Put speed test results in the data stack
  this.add_test_data = function(data)
  {
    this.test_data = data;
  };

  /*
   * Since it's (for now) impossible to transfer typed arrays via scope, the
   * entire fbo data has to be casted from an array of strings (scopes message
   * system) to a native typed array
   */
  this._received_pixels = function(status, message, snapshot)
  {
    if (status === 0)
    { 
      if (message.length == 0) return;

      var array_buffer = new ArrayBuffer(snapshot.size);
      snapshot.pixels = new Uint8Array(array_buffer);

      var pixels = message[0][0][0][0][1];
      for (var i=0; i<snapshot.size; i++)
      {
        snapshot.pixels[i] = pixels[i][2];
      }

      snapshot.downloading = false;
    }
  };

  // Gets the latest test data for speed test of data transmission
  this.get_test_data = function()
  {
    var data = this.test_data;
    if (typeof(data) != "number") return null;
    return data;
  };

  // Put speed test results in the data stack
  this.add_test_data = function(data)
  {
    this.test_data = data;
  };

  this.create_buffer = function()
  {
    this.buffers.push(new Buffer(this.buffers.length));
  };

  /*
   * Inserts a buffer into the collection. Uses the index from the object.
   * If it already exists in it then the value is updated and the old value is returned.
   * Else null is returned.
   */
  this.update_buffer_data = function(buffer_data)
  {
    var buffer;
    if (buffer_data.index in this.buffers)
    {
      buffer = this.buffers[buffer_data.index];
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
        "Failed to find buffer with id " + id);
    }

    buffer.set_data(buffer_data);
  };

  function Buffer(index)
  {
    this.index = index;
  }

  Buffer.prototype.available = function ()
  {
    return this.values !== undefined;
  };

  Buffer.prototype.set_data = function (data)
  {
    this.target = data.target;
    this.values = data.values;
    this.usage = data.usage;
  };

  Buffer.prototype.usage_string = function ()
  {
    return window.webgl.api.function_argument_to_string("bufferData", "usage", this.usage);
  };

  Buffer.prototype.target_string = function ()
  {
    return window.webgl.api.function_argument_to_string("bufferData", "target", this.target);
  };
};
