"use strict";

window.cls || (window.cls = {});

cls.WebGLTexture = function ()
{
  this.loading = false;
  this.downloaded = false;
};

// Retrieves the image data
cls.WebGLTexture.prototype.request_data = function()
{
  if (this.loading || this.downloaded) return;

  var finalize = function (level_imgs)
  {
    this.loading = false;
    this.downloaded = true;
    for (var i = 0; i < this.levels.length; i++)
    {
      if (this.levels[i])
      {
        this.levels[i].img = level_imgs.shift();
      }
    }

    messages.post('webgl-texture-data', {texture: this});
  };

  var levels = [];
  var runtime_id;
  this.levels.forEach(function(l) {
    if (l && l.img && l.img.object_id) {
      levels.push(l.img.object_id);
      runtime_id = l.img.runtime_id;
    }
  });

  this.loading = true;

  if (levels.length === 0) return;

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_objects(runtime_id, levels, true);
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

cls.WebGLTexture.prototype.toStringLong = function()
{
  // TODO add setting to control if the index_snapshot or index should be used.
  var texture = "Texture " + String(this.index_snapshot + 1);
  if (this.name) texture += " (" + this.name + ")";
  return texture;
};
