"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.WebGLDebugger = function ()
{
  this.injected = false;
  this.runtime_id = -1;

  // Object IDs for Wrapped Context Objects
  this.contexts = [];

  this.inject = function (rt_id, cont_callback)
  {
    // TODO perhaps listen to some sort of message notifying new context change
    // instead?
    if (this.runtime_id != rt_id)
    {
      this.runtime_id = rt_id;
      window.host_tabs.activeTab.addEventListener("webgl-debugger-ready", this._on_new_context.bind(this), false, false);
      this._send_injection(rt_id, cont_callback);
    }
  }


  this._send_injection = function (rt_id, cont_callback)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.injection);
    var tag = tagManager.set_callback(this, this._handle_injection, [rt_id, cont_callback]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, []]);
  };

  this._handle_injection = function (status, message, rt_id, cont_callback)
  {
    if (message[0] == 'completed')
    {
      this.injected = true;
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE + 
          "failed to inject WebGL wrappi)g script");
    }

    cont_callback();
  }

  this._on_new_context = function (message)
  {
    if (message.runtime_id == this.runtime_id) 
    {
      // Unfortunately, it's impossible to have the message contain the object
      // id of the WrappedContext object without heavy modification to tabs.js,
      // thus we need to query the DOM for the possible contexts.
      var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.query_contexts);
      var tag = tagManager.set_callback(this, this._handle_context_query);
      window.services["ecmascript-debugger"].requestEval(tag, [this.runtime_id, 0, 0, script, []]);
    }
  }

  this._handle_context_query = function(status, message)
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
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "no WebGL context present, yet message recieved");
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_context_query);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [this.runtime_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_context_query in WebGLDebugger");
    }
  };

  this._finalize_context_query = function(status, message)
  {
    if (status === 0)
    { 
      var gl_object_ids = [];
      // TODO: Cleanup, describing all message indices
      // ?[0] -> ObjectChainList[0] -> ObjectList[0] -> ObjectInfo[1] -> Property
      var property_list = message[0][0][0][0][1];
      for (var i=0; i < property_list.length-1; i++)
      {
        gl_object_ids.push(property_list[i][3][0]);
      }

      this.contexts = gl_object_ids;
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_context_query in WebGLDebugger");
    }
  };



  // Retrieves the state of a WebGL context denoted by it's runtime & object id
  this._send_state_query = function(obj_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_state);
    var tag = tagManager.set_callback(this, this._handle_state_query, [obj_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [this.runtime_id, 0, 0, script, [["ctx", obj_id]]]);
  };

  this._handle_state_query = function(status, message, obj_id)
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
            "failed _handle_state_query in WebGLDebugger");
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_state_query, [obj_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [this.runtime_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_state_query in WebGLDebugger");
    }
  };

  this._finalize_state_query = function(status, message, obj_id)
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

      messages.post('webgl-new-state', {"object_id" : obj_id, "state" : state });
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_state_query in WebGLDebugger");
    }
  };




}

