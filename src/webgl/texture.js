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
    messages.post('webgl-texture-data', { texture : this });
  };

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_object(this.img);
};

cls.WebGLTexture.prototype.show = function()
{
  window.views.webgl_texture.show_texture(this);

  if (!this.img.data)
  {
    this.get_texture_data();
  }
};

cls.WebGLTexture.prototype.toString = function()
{
  return this.name ? this.name : "Texture " + String(this.index + 1);
};
