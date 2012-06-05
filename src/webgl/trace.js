"use strict";

window.cls || (window.cls = {});

cls.WebGLTrace = function() 
{
  this._current_context = null;

  this.api = new cls.WebGLAPI();

  // Retrieves the frame trace for the last rendered frame of a WebGL context denoted by it's runtime & object id
  this._send_trace_request = function(rt_id, obj_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.request_trace);
    this._current_context = obj_id;
    window.services["ecmascript-debugger"].requestEval(0, [rt_id, 0, 0, script, [["gl", obj_id]]]);
  };

  this._on_trace_complete = function(msg)
  {
    var rt_id = msg.runtime_id;
    var obj_id = this._current_context;
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_trace);
    var tag = tagManager.set_callback(this, this._handle_trace_complete, [rt_id, obj_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [["gl", obj_id]]]);
  };

  this._handle_trace_complete = function(status, message, rt_id, obj_id)
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
        var tag = tagManager.set_callback(this, this._finalize_trace_complete, [rt_id, obj_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_trace_query in WebGLTrace");
    }
  };

  this._finalize_trace_complete = function(status, message, rt_id, obj_id)
  {
    if (status === 0)
    { 
      var data = [];
      var msg_vars = message[0][0][0][0][1]; 
      for (var i = 0; i < msg_vars.length - 1; i++)
      {
        var parts = msg_vars[i][2].split("|");
        if (parts.length < 2)
        {
          opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "A trace entry had incorrect data: [" + parts.join(", ") + "]");
          continue;
        }
        var function_name = parts[0];
        var error_code = parts[1];
        var args = parts.slice(2);
        data.push(new TraceEntry(function_name, error_code, args));
      }

      window.webgl.data.add_trace(obj_id, data);
      messages.post('webgl-new-trace', data);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _finalize_trace_query in WebGLTrace");
    }
  };
  // ---------------------------------------------------------------------------

  window.host_tabs.activeTab.addEventListener("webgl-trace-complete", 
      this._on_trace_complete.bind(this), false, false);
};

/**
 * Used to store a single function call in a frame trace.
 */
function TraceEntry(function_name, error_code, args)
{
  this.function_name = function_name;
  this.error_code = error_code;
  this.has_error = error_code === WebGLRenderingContext.NO_ERROR;
  this.args = args;
}
