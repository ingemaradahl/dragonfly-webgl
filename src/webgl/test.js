"use strict";

window.cls || (window.cls = {});

cls.WebGLTest = function ()
{
  // Retrieves the state of a WebGL context denoted by it's runtime & object id
  this._send_test_query = function(obj_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.query_test);
    var tag = tagManager.set_callback(this, this._handle_test_query, [obj_id]);
    // TODO: have runtime_id as a parameter
    window.services["ecmascript-debugger"].requestEval(tag, [window.webgl.runtime_id, 0, 0, script, [["ctx", obj_id]]]);
  };

  this._handle_test_query = function(status, message, obj_id)
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
      else 
			{
				window.webgl.data[obj_id].add_test_data(
					(new Date()).getTime() - window.webgl._start_time);
				messages.post('webgl-new-test', 
					{ "test-length" : message[VALUE].length, "ctx" : obj_id}
				);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_state_query in WebGLDebugger");
    }
  };

};
