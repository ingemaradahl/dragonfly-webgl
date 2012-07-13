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
    var snapshot = window['cst-selects']['snapshot-select'].get_selected_snapshot();

    var draw_call = snapshot.drawcalls.get_by_call(call);
    var trace_call = snapshot.trace[call];

    var template = window.templates.webgl.generic_call(trace_call, draw_call, call);
    this._container.clearAndRender(template);

    return;
  };

  this._on_buffer_click = function(evt, target)
  {
    target.buffer.show();
  };

  this._on_speclink_click = function(evt, target) 
  {
      window.open(target.getAttribute("function_name"));
  };
  
  this._on_argument_click = function(evt, target)
  {
    target.arg.action();
  };

  this._on_goto_script_click = function(evt, target)
  {
    var line = parseInt(target.getAttribute("data-line"));
    var script_id = parseInt(target.getAttribute("data-script-id"));

    var sourceview = window.views.js_source;
    window.runtimes.setSelectedScript(script_id);
    UI.get_instance().show_view("js_mode");
    if (sourceview)
    {
      sourceview.show_and_flash_line(script_id, line);
    }
  };

  var eh = window.eventHandlers;
  eh.click["webgl-drawcall-buffer"] = this._on_buffer_click.bind(this);
  eh.click["webgl-speclink-click"] = this._on_speclink_click.bind(this);
  eh.click["webgl-drawcall-goto-script"] = this._on_goto_script_click.bind(this);
  eh.click["webgl-draw-argument"] = this._on_argument_click.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = ViewBase;
