"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLState = function() 
{
  this.webgl_present = false;
  this.state = {};
  this._gl_object_ids = [];

  /* Interface */
  this.get_state = function(){};

  /* Private members */
  this._send_webgl_query = function(){};
  this._handle_webgl_query = function(){};
  this._finalize_webgl_query = function(){};

  this._send_state_query = function(){};


  // Queries the runtime whether there's an existing WebGL context present
  this._send_webgl_query = function(rt_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.query_contexts);
    var tag = tagManager.set_callback(this, this._handle_webgl_query, [rt_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, []]);
  };

  this._handle_webgl_query = function(status, message, rt_id)
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
        // TODO: indicate no WebGL stuff present D:
        this.webgl_present = false;
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_webgl_query, [rt_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_webgl_query in WebGLState");
    }
  };

  this._finalize_webgl_query = function(status, message, rt_id)
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

        // TODO: Temporary
        this._send_state_query(rt_id, property_list[i][3][0]);
      }

      this._gl_object_ids = gl_object_ids;
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_webgl_query in WebGLState");
    }
  };
  // ---------------------------------------------------------------------------


  // Retrieves the state of a WebGL context denoted by it's runtime & object id
  this._send_state_query = function(rt_id, obj_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_state);
    var tag = tagManager.set_callback(this, this._handle_state_query, [rt_id, obj_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [["gl", obj_id]]]);
  };

  this._handle_state_query = function(status, message, rt_id, obj_id)
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
            "trying to get state of non WebGLRenderingContext");
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_state_query, [rt_id, obj_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_state_query in WebGLState");
    }
  };

  this._finalize_state_query = function(status, message, rt_id, obj_id)
  {
    if (status === 0)
    { 
      var data = {};
      var msg_vars = message[0][0][0][0][1]; 
      for (var i=0; i<msg_vars.length-1; i++) // length member included, thus -1
      {
        var param = msg_vars[i][2].split(/\|(.+)?/)[0];
        var value = msg_vars[i][2].split(/\|(.+)?/)[1];
        data[param] = value;
      }

      this.state[obj_id] = data;
      messages.post('webgl-new-state', obj_id);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_state_query in WebGLState");
    }
  };
  // ---------------------------------------------------------------------------


  this.get_state = function()
  {
    // Send webgl query to all runtimes
    // TODO: This will result in one call to _finalize_webgl_query for each
    // runtime, which will overwrite the current _gl_object_ids array.
    var _runtimes = runtimes.getRuntimeIdsFromWindow(runtimes.getActiveWindowId());
    _runtimes.forEach(this._send_webgl_query.bind(this));
  };

  this.tabledef = {
    column_order: ["variable", "value"],
    columns: {
      variable: {
        label: "State Variable", // TODO
        classname: "col-pname"
      },
      value: {
        label: "Value",
        sorter: "unsortable"
      }
    }
  };

};
