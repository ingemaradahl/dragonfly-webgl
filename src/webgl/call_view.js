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
  this._element_buffer = null;
  this._trace_call = null;
  this._call = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };
 
  this._render = function()
  {
    this._container.clearAndRender(["div", "No call"]);
  };

  this.display_by_call = function(trace_call, call, template)
  {
    this._trace_call = trace_call;
    this._call = call;
    this.render_with_header(trace_call, call, template);
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
      this.render_with_header(this._trace_call, this._call, template);
    }
  };

  this._on_buffer_data = function(msg)
  {
    if (this._container)
    {
      var template = window.templates.webgl.buffer_base(msg);
      this.render_with_header(this._trace_call, this._call, template); 
    }
  };
  
  messages.addListener('webgl-texture-data', this._on_texture_data.bind(this));
  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLCallView.prototype = cls.WebGLHeaderViewBase;


