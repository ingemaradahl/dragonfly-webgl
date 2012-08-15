"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLStartView = function(id, name, container_class)
{
  this.createView = function(container)
  {
    this._container = container;
    this._container.clearAndRender(window.templates.webgl.start_view());
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab(id);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.init(id, name, container_class);
};
cls.WebGLStartView.prototype = ViewBase;

