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

  this._ondestroy = function()
  {
    this._container = null;
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

  this.init(id, name, container_class);
};

cls.WebGLCallView.prototype = cls.WebGLHeaderViewBase;
