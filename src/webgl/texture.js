"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{

};

// Retrieves the image data
cls.WebGLTexture.prototype.request_data = function()
{
  var finalize = function (level_imgs)
  {
    for (var i=0; i<this.levels.length; i++)
    {
      if (this.levels[i])
      {
        this.levels[i].img = level_imgs.shift();
      }
    }
    
    messages.post('webgl-texture-data', { texture : this });
  };

  var levels = this.levels.map(function(l) { if (l) { return l.img } });

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_objects(levels);
};

cls.WebGLTexture.prototype.show = function()
{
  window.views.webgl_texture.show_texture(this);
  if (this.img && !this.img.data)
  {
    this.request_data();
   }
};

cls.WebGLTexture.prototype.toString = function()
{
  // TODO add setting to control if the index_snapshot or index should be used.
  return this.name ? this.name : "Texture " + String(this.index_snapshot + 1);
};
