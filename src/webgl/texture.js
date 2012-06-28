"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{
  this._send_texture_query = function(ctx_id)
  {
    var runtime_id;

    var finalize = function(texture_data)
    {
      if (texture_data.length > 0)
      {
        window.webgl.data[ctx_id].texture_container = texture_data.map(function (t) {
          t.get_data = { object_id : t.get_data.object_id, runtime_id : runtime_id }
          return t;
        });
        messages.post('webgl-new-texture-list');
      }
    };

    var scoper = new WebGLUtils.Scoperer(webgl.interfaces[ctx_id].get_texture_names, finalize, this);
    runtime_id = scoper.runtime_id;
    scoper.set_max_depth(2);
    scoper.set_object_action(function () { return cls.Scoper.ACTIONS.EXAMINE; });
    scoper.exec();
  };

  this.resolve_texture = function(ctx_id, texture_identifier)
  {
    var textures = window.webgl.data[ctx_id].texture_container;
    for (var i=0; i<textures.length; i++)
    {
      if (textures[i].id === texture_identifier)
      {
        return textures[i];
      }
    }

    return null;
  };


  // Retrieves the image data of a choosen texture.
  this._get_texture_data = function(ctx_id, texture_identifier)
  {
    var texture = this.resolve_texture(ctx_id, texture_identifier);

    var finalize = function (data)
    {
      window.webgl.data[ctx_id].texture_data[data.id] = data;
      messages.post('webgl-new-texture-data', { id : data.id });
    };

    var scoper = new WebGLUtils.Scoperer(texture.get_data, finalize, this);
    scoper.set_max_depth(2);
    scoper.set_object_action(function () { return cls.Scoper.ACTIONS.EXAMINE; });
    scoper.exec();
  };
};
