"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{
  // Retrieves all the texture names in a WebGL context
  this._send_texture_query = function(ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_texture_names);
    var tag = tagManager.set_callback(this, this._handle_texture_query, [ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag,
[window.webgl.runtime_id, 0, 0, script, [["gl", ctx_id]]]);
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

  this._finalize_texture_query = function(status, message, ctx_id)
  {
    if (status === 0)
    {
      var msg_vars = message[0][0][0][0][1];
      window.webgl.data[ctx_id].texture_container = msg_vars;
      messages.post('webgl-new-texture-list');
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_texture_query in WebGLDebugger");
    }
  };


// Retrieves the image data of a choosen texture.

 this._get_texture_data = function(ctx_id, texture_url)
 {
    var script =
        cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_texture_as_data2).replace(/URL/,texture_url);
    var tag = tagManager.set_callback(this, this._handle_texture_data, [ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag,
        [window.webgl.runtime_id, 0, 0, script, [["gl", ctx_id]]]);
 };

  this._handle_texture_data = function(status, message, rt_id, ctx_id)
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
            "failed _handle_texture_data_query in WebGLDebugger");
      }
      else
      {
        // Sending back image data to view with messages.post.
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, 
                            this._finalize_texture_data_query,[ctx_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag,
            [window.webgl.runtime_id, [return_arr]]);
  
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
          "failed _handle_texture_data_query in WebGLDebugger");
    }
  };
  
  this._finalize_texture_data_query = function(status, message, ctx_id)
  {
    var texture_data_unit = {};

    if (status === 0)
    {
      // TODO ugly with array indexing
      var msg_vars = message[0][0][0][0][1];
      for (var i=0; i < msg_vars.length; i++)
      {
        switch(msg_vars[i][0])
        {
          case "id": 
            texture_data_unit.id = msg_vars[i][2];
            break;
          case "type":
            texture_data_unit.type = msg_vars[i][2];
            break;
          case "object":
            texture_data_unit.object = msg_vars[i][3];
            break;
          case "texture_wrap_s":
            texture_data_unit.texture_wrap_s = msg_vars[i][2];
            break;
          case "texture_wrap_t":
            texture_data_unit.texture_wrap_t = msg_vars[i][2];
            break;
          case "img":
            texture_data_unit.img = msg_vars[i][2];
            break;
          case "texture_min_filter":
            texture_data_unit.texture_min_filter = msg_vars[i][2];
            break;
          case "texture_mag_filter":
            texture_data_unit.texture_mag_filter = msg_vars[i][2];
            break;
          case "source":
            texture_data_unit.source = msg_vars[i][2];
            break;
          default: break;
        }
      }

      // TODO texture_data should be assosiative
      window.webgl.data[ctx_id].texture_data[texture_data_unit.id] = texture_data_unit;
      messages.post('webgl-new-texture-data',
          { "id" : texture_data_unit.id });
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_texture_query in WebGLDebugger");
    }
  }

};
