"use strict";

window.cls || (window.cls = {});

cls.WebGLTrace = function(api) 
{
  this._current_context = null;

  this.api = api;

  // Retrieves the frame trace for the last rendered frame of a WebGL context denoted by it's runtime & object id
  this._send_trace_request = function(rt_id, ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.request_trace);
    this._current_context = ctx_id;
    window.services["ecmascript-debugger"].requestEval(0, [rt_id, 0, 0, script, [["gl", ctx_id]]]);
  };

  this._on_trace_complete = function(msg)
  {
    var rt_id = msg.runtime_id;
    var ctx_id = this._current_context;
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_trace);
    var tag = tagManager.set_callback(this, this._handle_trace_complete, [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [["gl", ctx_id]]]);

    //var script_ = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_snapshots);
    //var tag_ = tagManager.set_callback(this, this._handle_)

  };

  this._handle_trace_complete = function(status, message, rt_id, ctx_id)
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
            "failed to recieve a trace.");
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._examine_trace_complete, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_trace_query in WebGLTrace");
    }
  };

  this._examine_trace_complete = function(status, message, rt_id, ctx_id)
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
        var tag = tagManager.set_callback(this, this._finalize_trace_complete, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, object_ids]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _finalize_buffer_created in WebGLTrace");
    }
  };

  this._finalize_trace_complete = function(status, message, rt_id, ctx_id)
  {
    if (status === 0)
    { 
      if (message.length == 0) return;

      for (var i = 0; i < message[0].length; i++)
      {
        var msg_vars = message[0][i][0][0][1]; 
        var data = [];
        var fbo_ids = [];
        for (var j = 0; j < msg_vars.length - 1; j++)
        {
          if (msg_vars[j][1] == "object")
          {
            // FBO snapshot object
            fbo_ids.push(msg_vars[j][3][0]);
          }
          else
          {
            // WebGL Function call
            var parts = msg_vars[j][2].split("|");
            if (parts.length < 3)
            {
              opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
                "A trace entry had incorrect data: [" + parts.join(", ") + "]");
              continue;
            }
            var function_name = parts[0];
            var error_code = Number(parts[1]);
            var result = parts[2];
            var args = parts.slice(3);

            data.push(new TraceEntry(function_name, error_code, result, args));
          }
        }

        // Send a request to retrieve the FBO snapshot objects
        var tag = tagManager.set_callback(this, this._examine_snapshots_complete, [rt_id, ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, fbo_ids]);

        window.webgl.data[ctx_id].add_trace(data);
        messages.post('webgl-new-trace', data);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _finalize_trace_query in WebGLTrace");
    }
  };

  this._examine_snapshots_complete = function(status, message, rt_id, ctx_id)
  {
    var 
      NAME  = 0,
      TYPE  = 1,
      VALUE = 2;
    if (status === 0)
    { 
      if (message.length == 0) return;

      for (var i = 0; i < message[0].length; i++)
      {
        var msg_vars = message[0][i][0][0][1]; 
        var snapshot = {};
        for (var j in msg_vars)
        {
          var field = msg_vars[j];

          if (field[TYPE] === "number")
          {
            snapshot[field[NAME]] = Number(field[VALUE]);
          }
          else if (field[TYPE] === "object")
          {
            snapshot["pixels_object"] =  field[3][0];
          }
        }
        snapshot.pixels = null;
        snapshot.downloading = false;

        window.webgl.data[ctx_id].add_snapshot(snapshot);
      }
    }
    
  };
  // ---------------------------------------------------------------------------

  window.host_tabs.activeTab.addEventListener("webgl-trace-completed", 
      this._on_trace_complete.bind(this), false, false);
};

/**
 * Used to store a single function call in a frame trace.
 */
function TraceEntry(function_name, error_code, result, args, img_id)
{
  this.function_name = function_name;
  this.error_code = error_code;
  this.have_error = error_code !== 0; // WebGLRenderingContext.NO_ERROR
  this.result = result;
  this.have_result = result !== "";
  this.args = args;
  this.img_id = img_id || null;
}
