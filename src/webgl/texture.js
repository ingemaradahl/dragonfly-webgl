"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{
  // Retrieves all the texture names in a WebGL context
  this._send_texture_query = function(rt_id, ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_texture_names);
    var callback = window.WebGLUtils.extract_array_callback(
        this._finalize_texture_query, null, true);
    var tag = tagManager.set_callback(this,
        window.WebGLUtils.examine_array_eval_callback(callback, null),
        [rt_id, ctx_id]
        );


    window.services["ecmascript-debugger"].requestEval(
        tag, [rt_id, 0, 0, script, [["handler", ctx_id]]]);
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
    var callback = window.WebGLUtils.extract_array_callback(
        this._finalize_texture_data_query,
        null,
        true);
    var tag = tagManager.set_callback(
        this,
        window.WebGLUtils.examine_eval_callback(callback, null),
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
