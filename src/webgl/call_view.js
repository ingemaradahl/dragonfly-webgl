"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */

cls.WebGLCallView = function(id, name, container_class)
{
  this._container = null;
  this._snapshot = null;
  this._call_index = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    this._container.clearAndRender(["div", "No call"]);
  };

  this.display_by_call = function(snapshot, call_index, template)
  {
    this._snapshot = snapshot;
    this._call_index = call_index;
    
    this.render_with_header(snapshot, call_index, template);
  };

  this._ondestroy = function()
  {
    this._container = null;
  };

  this._on_texture_data = function(msg)
  {
    if (this._container)
    {
      var template = window.templates.webgl.texture(msg.texture);
      this.render_with_header(this._snapshot, this._call_index, template);
    }
  };

  this._on_buffer_data = function(msg)
  {
    if (this._container)
    {
      var template = window.templates.webgl.buffer_base(msg);
      this.render_with_header(this._snapshot, this._call_index, template); 
    }
  };
  
  messages.addListener('webgl-texture-data', this._on_texture_data.bind(this));
  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLCallView.prototype = cls.WebGLHeaderViewBase;


