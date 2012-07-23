"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLTextureView = function(id, name, container_class)
{
  this._container = null;
  this._texture = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    if (this._container && this._texture)
    {
      var content = window.templates.webgl.texture(this._texture);
      this._container.clearAndRender(content);
    }
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.show_texture = function(texture)
  {
    this._texture = texture;

    this._render();
  };

  this._on_texture_data = function(msg)
  {
    if (this._container && this._texture === msg["texture"])
    {
      this._render();
    }
  };

  var on_texture_end_drag = function(evt)
  {
    evt.stopPropagation();
    evt.preventDefault();
    window.onmousemove = null;
    window.onmouseup = null;
  };

  var on_texture_start_drag = function(evt, target)
  {
    evt.stopPropagation();
    evt.preventDefault();
    var parent = target.parentElement;
    var x_start = evt.clientX + parent.scrollLeft;
    var y_start = evt.clientY + parent.scrollTop;

    var max_top = Math.max(0, evt.target.offsetHeight - parent.clientHeight);
    var max_left = Math.max(0, evt.target.offsetWidth - parent.clientWidth);
    this._target = target;

    window.onmousemove = function(e)
    {
      e.stopPropagation();
      e.preventDefault();
      var top = Math.min(max_top, Math.max(0, y_start - e.clientY));
      var left = Math.min(max_left, Math.max(0, x_start - e.clientX));

      parent.scrollTop = top;
      parent.scrollLeft = left;
    };

    window.onmouseup = on_texture_end_drag;
  };

  var eh = window.eventHandlers;
  eh.mousedown["webgl-texture-image"] = on_texture_start_drag.bind(this);
  eh.mouseup["webgl-texture-image"] = on_texture_end_drag.bind(this);

  messages.addListener('webgl-texture-data', this._on_texture_data.bind(this));
  this.init(id, name, container_class);
};

cls.WebGLTextureView.prototype = cls.WebGLHeaderViewBase;


