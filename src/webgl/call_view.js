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

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    this._container.clearAndRender(["div", "No call"]);
  };

  this.display_by_call = function(snapshot, call_index)
  {
    this.render_with_header(snapshot, call_index);
  };

  this._ondestroy = function()
  {
    this._container = null;
  };

  this.init(id, name, container_class);
};

cls.WebGLCallView.prototype = cls.WebGLHeaderViewBase;


