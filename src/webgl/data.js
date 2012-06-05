"use strict";

window.cls || (window.cls = {});

cls.WebGLData = function ()
{
  this.shaders = {};

  this.states = {};
  
  // Stores all traces as a map where the key is the context id and the
  // value is a list of traces.
  this.traces = {};

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
};
