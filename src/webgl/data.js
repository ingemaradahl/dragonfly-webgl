"use strict";

window.cls || (window.cls = {});

/*
 * Manages data that concerns one single WebGL context.
 */
cls.WebGLData = function (context_id)
{
  this.texture_container = [];
  this.texture_data = [];

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
  };

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

  this.add_snapshots = function(snapshots)
  {
    var to_download = [];

    for (var s in snapshots)
    {
      var snapshot = snapshots[s];

      if (!snapshot.pixels && !snapshot.downloading)
      {
        to_download.push(snapshot.pixels_object);
        snapshot.downloading = true;
      }

      this.add_snapshot(snapshot);
    }

    var tag = tagManager.set_callback(this, this._received_pixels, [snapshot]);
    window.services["ecmascript-debugger"].requestExamineObjects(tag, [webgl.runtime_id, to_download]);
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

      for (var i=0; i<message[0].length; i++)
      {
        var pixels = message[0][i][0][0][1];

        var array_buffer = new ArrayBuffer(snapshot.size);
        snapshot.pixels = new Uint8Array(array_buffer);

        for (var i=0; i<snapshot.size; i++)
        {
          snapshot.pixels[i] = pixels[i][2];
        }

        snapshot.downloading = false;
      }
    }
  };

  /*
   * Gets the appropriate FBO snapshot determined by trace and call index
   */
  this.get_snapshot_by_call = function(trace, call)
  {
    if (!this.snapshots[trace]) return null;

    var c = -1;
    var result = null;
    for (var s in this.snapshots[trace])
    {
      var snapshot = this.snapshots[trace][s];
      if (snapshot.call_idx <= call && snapshot.call_idx > c)
      {
        result = this[i];
      }
    }

    return result;
  };

  // Gets the latest test data for speed test of data transmission
  this.get_test_data = function()
  {
    var data = this.test_data;
    if (typeof(data) !== "number") return null;
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
      if (message.length === 0) return;

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
};
