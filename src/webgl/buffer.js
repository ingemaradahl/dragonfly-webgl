"use strict";

window.cls || (window.cls = {});

cls.WebGLBuffer = function() 
{
  /**
   * Keeps track of how many requests that have been made per context to limit 
   * the number of concurrent requests per context to one.
   * Removes redundant requests since all buffers are gathered.
   */
  this._requests = {};

  this._on_buffer_created = function(msg)
  {
    var rt_id = msg.runtime_id;
    // TODO: figure out which context the event originates from, or poll all of them.
    var ctx_id = window.webgl.contexts[0];

    // If it's already running for a specific context then let the current one 
    // finish and later run it again when the current run is done.
    if (ctx_id in this._requests && this._requests[ctx_id] > 0)
    {
      this._requests[ctx_id]++;
      return;
    }
    this._requests[ctx_id] = 1;

    var len = window.webgl.data.buffers.length;

    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_buffers).replace(/START_INDEX/g, len);
    var tag = tagManager.set_callback(this, this._handle_buffer_created, [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, 
        [rt_id, 0, 0, script, [["gl", ctx_id]]]);
  };

  this._handle_buffer_created = function(status, message, rt_id, ctx_id)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (message[STATUS] == 'completed')
    {
      if (message[TYPE] == 'null')
      {
        // TODO better error handling
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "failed to recieve buffers.");
      }
      else
      {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_buffer_created, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else if (message[OBJECT_VALUE][4] == "Error")
    {
      var obj_id = message[OBJECT_VALUE][OBJECT_ID];
      var tag = tagManager.set_callback(this, this._handle_error, [rt_id, ctx_id]);
      window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [obj_id]]);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_buffer_created in WebGLBuffer");
    }
  }

  this._handle_error = function(status, message, rt_id, ctx_id)
  { 
    if (status === 0)
    { 
      var msg_vars = message[0][0][0][0][1];
      var obj = {};
      for (var i = 0; i < msg_vars.length; i++)
      {
        obj[msg_vars[i][0]] = msg_vars[i][2];
      }
      console.log("Error:");
      console.log(obj);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_error");
    }
  };

  this._finalize_buffer_created = function(status, message, rt_id, ctx_id)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (status === 0)
    { 
      var ctx_id = window.webgl.contexts[0];
      var msg_vars = message[0][0][0][0][1]; 

      var len = msg_vars.length - 1;

      var object_ids = [];
      for (var i = 0; i < len; i++)
      {
        var id = msg_vars[i][OBJECT_VALUE][OBJECT_ID];
        object_ids.push(id);
        window.webgl.data.create_buffer();
      }

      if (object_ids.length > 0)
      {
        var tag = tagManager.set_callback(this, this._finalize_buffers_data, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, object_ids]);
      }
      
      var run = this._requests[ctx_id] > 1;
      this._requests[ctx_id] = 0;
      if (run) this._on_buffer_created({runtime_id: rt_id});
      messages.post('webgl-new-buffer');
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _finalize_buffer_created in WebGLTrace");
    }
  };

  /*
   * @param buffer_indices should be an array with indices of buffers.
   */
  this.get_buffers_data = function(rt_id, ctx_id, buffer_indices)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_buffers_indices).replace(/__INDICES__/g, buffer_indices.join(","));
    var tag = tagManager.set_callback(this, this._handle_buffers_data, [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, 
        [rt_id, 0, 0, script, [["gl", ctx_id]]]);
  };

  this.get_buffers_data_all = function(rt_id, ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_buffers).replace(/START_INDEX/g, 0);
    var tag = tagManager.set_callback(this, this._handle_buffers_data, [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, 
        [rt_id, 0, 0, script, [["gl", ctx_id]]]);
  };

  this._handle_buffers_data = function(status, message, rt_id, ctx_id)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (message[STATUS] == 'completed')
    {
      if (message[TYPE] == 'null')
      {
        // TODO better error handling
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "failed to recieve buffers.");
      }
      else
      {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._examine_buffers_data, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_buffer_data in WebGLbuffer");
    }
  };

  this._examine_buffers_data = function(status, message, rt_id, ctx_id)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (status === 0)
    { 
      var ctx_id = window.webgl.contexts[0];
      var msg_vars = message[0][0][0][0][1]; 

      var len = msg_vars.length - 1;

      var object_ids = [];
      for (var i = 0; i < len; i++)
      {
        var id = msg_vars[i][OBJECT_VALUE][OBJECT_ID];
        object_ids.push(id);
      }

      if (object_ids.length > 0)
      {
        var tag = tagManager.set_callback(this, this._finalize_buffers_data, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, object_ids]);
      }
      
      var run = this._requests[ctx_id] > 1;
      this._requests[ctx_id] = 0;
      if (run) this._on_buffer_created({runtime_id: rt_id});
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _finalize_buffer_created in WebGLTrace");
    }
  };

  this._finalize_buffers_data = function(status, message, rt_id, ctx_id)
  {
    if (status === 0)
    { 
      if (message.length == 0) return;

      for (var i = 0; i < message[0].length; i++)
      {
        var msg_vars = message[0][i][0][0][1]; 

        var buffer = {};
        var values = [];
        var len = msg_vars.length;
        for (var j = 0; j < len; j++)
        {
          var key = msg_vars[j][0];
          var type = msg_vars[j][1];
          var value = msg_vars[j][2];
          if (isNaN(key)) buffer[key] = type == "number" ? Number(value) : value;
          else values.push(Number(value));
          // Assumes that the keys are in the correct order.
        }

        buffer.values = values;
        delete buffer.length;
        delete buffer.buffer;

        window.webgl.data.update_buffer_data(buffer);

        // TODO: only send one message?
        messages.post('webgl-buffer-data-changed', buffer);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _finalize_buffer_data in WebGLTrace");
    }
  };

  window.host_tabs.activeTab.addEventListener("webgl-buffer-created", 
      this._on_buffer_created.bind(this), false, false);
};
