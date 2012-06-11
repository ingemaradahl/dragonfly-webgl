"use strict";

window.cls || (window.cls = {});

// TODO: have one WebGLData object per context
cls.WebGLData = function ()
{
  this.shaders = {};

  this.states = {};

	this.test_data;
  
  // Stores all traces as a map where the key is the context id and the
  // value is a list of traces.
  this.traces = {};

  this.buffers = [];

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
