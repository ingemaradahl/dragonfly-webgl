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
    var snapshot = webgl.snapshots[ctx_id][0];
    var draw_call = snapshot.drawcalls.get_by_call(call);
    var trace_call = snapshot.trace[call];

    if (!draw_call)
    {
      this._container.innerHTML = "No framebuffer snapshot for call " + call;
      return;
    }

    var template = window.templates.webgl.drawcall(draw_call, trace_call);
    this._container.clearAndRender(template);

    return; 
  };

  var on_buffer_click = function(evt, target)
  {
    target.buffer.link.action();
  };

  var eh = window.eventHandlers;
  eh.click["webgl-drawcall-buffer"] = on_buffer_click.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = ViewBase;
