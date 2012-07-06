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

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_max_depth(2);
    scoper.set_object_action(cls.Scoper.ACTIONS.EXAMINE);
    scoper.execute_remote_function(window.webgl.interfaces[ctx_id].get_texture_names);
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

  this.show_texture = function (texture)
  {
    messages.post('webgl-show-texture', { texture : texture });

    if (!texture.img.data)
    {
      this.get_texture_data(texture);
    }
  };

  // Retrieves the image data of a choosen texture.
  this.get_texture_data = function(texture)
  {
    var finalize = function (img)
    {
      texture.img = img;
      messages.post('webgl-new-texture-data', { texture : texture });
    };

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_reviver_tree({
      object: {
        _action: cls.Scoper.ACTIONS.NOTHING
      },
      _action: cls.Scoper.ACTIONS.EXAMINE,
      _depth: 2,
      _reviver: scoper.reviver_basic
    });
    scoper.examine_object(texture.img)
  };
};
