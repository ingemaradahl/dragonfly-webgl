"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{
  // Retrieves all the texture names in a WebGL context
  this._send_texture_query = function(rt_id, ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_texture_names);
    var callback = window.webgl.extract_array_callback(
      this._finalize_texture_query, null, true);
    var tag = tagManager.set_callback(this, 
                                      window.webgl.examine_array_objects_eval_callback(callback, null), 
                                      [rt_id, ctx_id]
                                     );
       

    window.services["ecmascript-debugger"].requestEval(
        tag, [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._handle_texture_query = function(status, message, ctx_id)
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
            "failed _handle_texture_query in WebGLDebugger");
      }
      else
      {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_texture_query, [ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag,
              [window.webgl.runtime_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_texture_query in WebGLDebugger");
    }
  };

  this._finalize_texture_query = function(data, rt_id, ctx_id)
  {
    window.webgl.data[ctx_id].texture_container = data;
    messages.post('webgl-new-texture-list');
    
  };


// Retrieves the image data of a choosen texture.

  this._get_texture_data = function(rt_id, ctx_id, texture_identifier)
  {
    var script =
        cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_texture_as_data).replace(/URL/,texture_identifier);
        // todo replace is not very nice
    var callback = window.webgl.extract_array_callback(
        this._finalize_texture_data_query,
        null,
        true);
    var tag = tagManager.set_callback(
        this, 
        window.webgl.eval_examine_callback(callback, null),
        [rt_id, ctx_id]
    );
    
    window.services["ecmascript-debugger"].requestEval(tag,
        [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._finalize_texture_data_query = function(data, rt_id, ctx_id)
  {
    data = data[0];

    window.webgl.data[ctx_id].texture_data[data.id] = data;
    messages.post('webgl-new-texture-data',
        { "id" : data.id });
  };
    
  this._error = function(status, message)
  {
    messages.post('webgl-error', {"origin": "state", status : status, message
:message});
  };

};
