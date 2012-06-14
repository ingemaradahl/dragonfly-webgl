"use strict";

window.cls || (window.cls = {});

cls.WebGLState = function ()
{
  // Retrieves the state of a WebGL context denoted by it's runtime & object id
  this._send_state_query = function(ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_state);
    // TODO: have runtime_id as a parameter
    var rt_id = window.webgl.runtime_id;
    var tag = tagManager.set_callback(this, this._handle_state_query, [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._handle_state_query = function(status, message, rt_id, ctx_id)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (message[STATUS] === 'completed')
    {
      if (message[TYPE] == 'null')
      {
        // TODO better error handling
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "failed _handle_state_query in WebGLDebugger");
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_state_query, [ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [window.webgl.runtime_id, [return_arr]]);
      }
    }
    else if (message[OBJECT_VALUE][4] === "Error")
    {
      var obj_id = message[OBJECT_VALUE][OBJECT_ID];
      var tag_error = tagManager.set_callback(this, window.webgl.handle_error, [rt_id, ctx_id]);
      window.services["ecmascript-debugger"].requestExamineObjects(tag_error, [rt_id, [obj_id]]);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_state_query in WebGLDebugger");
    }
  };

  this._finalize_state_query = function(status, message, ctx_id)
  {
    if (status === 0)
    { 
      var state = {};
      var msg_vars = message[0][0][0][0][1]; 
      for (var i=0; i<msg_vars.length-1; i++) // length member included, thus -1
      {
        var param = msg_vars[i][2].split(/\|(.+)?/)[0];
        var value = msg_vars[i][2].split(/\|(.+)?/)[1];
        state[param] = value;
      }

      messages.post('webgl-new-state', {"object_id" : ctx_id, "state" : state });
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_state_query in WebGLDebugger");
    }
  };
};
