"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLState = function() 
{
  this.webgl_present = false;
  this._context_object_ids = [];

  /* Interface */
  this.get_state = function(){};

  /* Private members */
  this._send_webgl_query = function(){};
  this._handle_webgl_query = function(){};
  this._finalize_webgl_query = function(){};
  this._handle_get_state = function(){};

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
      }

      this._context_object_ids = gl_object_ids;
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_webgl_quer in WebGLState");
    }
  }
  // ----

  this._handle_get_state = function(status, msg)
  {
    console.log(msg);
  };


  this.get_state = function()
  {
    // Send webgl query to all runtimes
    var _runtimes = runtimes.getRuntimeIdsFromWindow(runtimes.getActiveWindowId());
    _runtimes.forEach(this._send_webgl_query.bind(this));
  };

};
