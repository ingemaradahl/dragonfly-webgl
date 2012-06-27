"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{
  this._send_texture_query = function(ctx_id)
  {
    var finalize = function(texture_data)
    {
      if (texture_data.length > 0)
      {
        window.webgl.data[ctx_id].texture_container = texture_data;
        messages.post('webgl-new-texture-list');
      }
    };

    var scoper = new WebGLUtils.Scoperer(webgl.interfaces[ctx_id].get_texture_names, finalize, this);
    scoper.set_max_depth(2);
    scoper.set_object_action(function () { return cls.Scoper.ACTIONS.EXAMINE; });
    scoper.exec();
  };


  // Retrieves the image data of a choosen texture.

  this._get_texture_data = function(rt_id, ctx_id, texture_identifier)
  {
    // TODO: Temporarily disable this function awaiting better data resolving
    return;

    var script =
      cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_texture_as_data).replace(/URL/,texture_identifier);
    // TODO replace is not very nice

    var callback = window.WebGLUtils.extract_array_callback(
        this._finalize_texture_data_query,
        null,
        true);
    var tag = tagManager.set_callback(
        this,
        window.WebGLUtils.examine_eval_callback(callback, null),
        [rt_id, ctx_id]);

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
