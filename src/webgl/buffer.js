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
    var obj_id = window.webgl.contexts[0];

    // If it's already running for a specific context then let the current one 
    // finish and later run it again when the current run is done.
    if (obj_id in this._requests && this._requests[obj_id] > 0)
    {
      this._requests[obj_id]++;
      return;
    }
    this._requests[obj_id] = 1;

    var len = window.webgl.data.buffers_requested_start;

    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_buffers).replace(/START_INDEX/g, len);
    var tag = tagManager.set_callback(this, this._handle_buffer_created, [rt_id, obj_id]);
    window.services["ecmascript-debugger"].requestEval(tag, 
        [rt_id, 0, 0, script, [["gl", obj_id]]]);
  };

  this._handle_buffer_created = function(status, message, rt_id, obj_id)
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
        var tag = tagManager.set_callback(this, this._finalize_buffer_created, [rt_id, obj_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_buffer_created in WebGLbuffer");
    }
  }

  this._finalize_buffer_created = function(status, message, rt_id, obj_id)
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

      window.webgl.data.requested_buffers(len);

      var object_ids = [];
      for (var i = 0; i < len; i++)
      {
        object_ids.push(msg_vars[i][OBJECT_VALUE][OBJECT_ID]);
      }

      if (object_ids.length > 0)
      {
        var tag = tagManager.set_callback(this, this._finalize_buffers_data, [rt_id, obj_id]);
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

  this._get_buffer_data = function(rt_id, ctx_id, buffer_number)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_buffer).replace(/__INDEX__/g, buffer_number);
    var tag = tagManager.set_callback(this, this._handle_buffer_data, [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, 
        [rt_id, 0, 0, script, [["gl", ctx_id]]]);
  };

  this._handle_buffer_data = function(status, message, rt_id, obj_id)
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
        var tag = tagManager.set_callback(this, this._finalize_buffers_data, [rt_id, obj_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_buffer_data in WebGLbuffer");
    }
  }

  this._finalize_buffers_data = function(status, message, rt_id, obj_id)
  {
    if (status === 0)
    { 
      if (message.length == 0) return;

      for (var i = 0; i < message[0].length; i++)
      {
        var msg_vars = message[0][i][0][0][1]; 

        var buffer = {};
        var data = [];
        var len = msg_vars.length;
        for (var j = 0; j < len; j++)
        {
          var key = msg_vars[j][0];
          var type = msg_vars[j][1];
          var value = msg_vars[j][2];
          if (isNaN(key)) buffer[key] = type == "number" ? Number(value) : value;
          else data.push(Number(value));
          // Assumes that the keys are in the correct order.
        }

        buffer.data = data;
        delete buffer.length;
        delete buffer.buffer;

        var old = window.webgl.data.insert_buffer(buffer);

        if (old == null) messages.post('webgl-new-buffer', buffer);
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
