"use strict";

window.cls || (window.cls = {});

// TODO: have one WebGLData object per context
cls.WebGLData = function ()
{
  this.shaders = {};

  this.states = {};
  
  // Stores all traces as a map where the key is the context id and the
  // value is a list of traces.
  this.traces = {};

  this.buffers = [];
  this.buffers_requested_start = 0;

  /*
   * Gets the latest trace data for a specified context id, null if not available.
   */
  this.get_latest_trace = function(ctx)
  {
    var data = this.traces[ctx];
    if (typeof(data) != "array" || data.length == 0) return null;
    return data[data.length-1];
  }

  this.add_trace = function(ctx_id, trace)
  {
    if (ctx_id in this.traces == false)
    {
      this.traces[ctx_id] = [];
    }
    this.traces[ctx_id].push(trace);
  };

  /*
   * Inserts a buffer into the collection. Uses the index from the object.
   * If it already exists in it then the value is updated and the old value is returned.
   * Else null is returned.
   */
  this.insert_buffer = function(buffer)
  {
    if (!(buffer.index in this.buffers))
    {
      this.buffers[buffer.index] = buffer;
      return null;
    }
    
    var old = this.buffers[buffer.index];
    this.buffers[buffer.index] = buffer;
    return old;
  };

  /**
   * Updates the number of requested buffers.
   */
  this.requested_buffers = function(number)
  {
    this.buffers_requested_start = Math.max(number, this.buffers_requested_start);
  };
};
