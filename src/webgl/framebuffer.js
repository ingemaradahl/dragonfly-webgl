"use strict";

window.cls || (window.cls = {});

cls.WebGLFramebuffer = function ()
{
  this.downloading = false;
};

cls.WebGLFramebuffer.prototype.is_loaded = function()
{
  return this.type === "draw" 
    ? Boolean(this.image.img.data)
    : true;
};

cls.WebGLFramebuffer.prototype.request_data = function()
{
  if (this.is_loaded() || this.downloading) return;

  var finalize = function(img)
  {
    this.image.img = img;

    this.downloading = false;
    messages.post('webgl-fbo-data', {framebuffer:this});
  };

  this.downloading = true;

  var scoper = new cls.Scoper(finalize, this);
  scoper.examine_object(this.image.img, true);
};

cls.WebGLFramebuffer.prototype.toString = function()
{
  return "Framebuffer " + String(this.index);
};

