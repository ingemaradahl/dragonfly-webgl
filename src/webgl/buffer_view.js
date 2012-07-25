"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * TODO: currently a temporary design of the view which displays data in a non user-friendly way.
 * @constructor
 * @extends ViewBase
 */
cls.WebGLBufferView = function(id, name, container_class)
{
  this._container = null;
  this._content = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    if (this._content == null || !this._container) return;
    this._container.clearAndRender(this._content);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.show_buffer = function(buffer)
  {

    this._buffer = buffer;
    this._content = window.templates.webgl.buffer_base(buffer);
    this._render();
  };

  this._on_buffer_data = function(buffer)
  {
    this._content = window.templates.webgl.buffer_base(buffer);
    this._render();
  };

  //messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));
  this.init(id, name, container_class);
};

cls.WebGLBufferView.prototype = ViewBase;



