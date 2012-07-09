"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{

};

// Retrieves the image data
cls.WebGLTexture.prototype.get_texture_data = function()
{
  var finalize = function (img)
  {
    this.img = img;
    messages.post('webgl-new-texture-data', { texture : this });
  };

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_object(this.img)
};

cls.WebGLTexture.prototype.show = function()
{
  messages.post('webgl-show-texture', { texture : this });

  if (!this.img.data)
  {
    this.get_texture_data();
  }
};
