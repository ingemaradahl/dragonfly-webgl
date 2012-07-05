"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLDrawCallView = function(id, name, container_class)
{
  this._container = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    this._container.clearAndRender(["div", "No draw call"]);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.display_by_call = function(call)
  {
    var ctx_id = window['cst-selects']['context-select'].get_selected_context();

    // TODO: TEMPORARY
    var drawcall = webgl.snapshots[ctx_id][0].drawcalls.get_call_by_call(call);
    if (!drawcall)
    {
      this._container.innerHTML = "No framebuffer snapshot for call " + call;
      return;
    }

    var fbo = drawcall.fbo;

    var template = ["div", window.templates.webgl.drawcall(fbo)];
    this._container.clearAndRender(template);

    return; 
  };

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = ViewBase;
