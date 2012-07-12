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

    if (!draw_call)
    {
      var template = window.templates.webgl.generic_call(trace_call, call);
      this._container.clearAndRender(template);
      return;
    }

    var template = window.templates.webgl.drawcall(draw_call, trace_call);
    this._container.clearAndRender(template);

    return;
  };

  var on_buffer_click = function(evt, target)
  {
    target.buffer.show();
  };

  var on_speclink_click = function(evt, target) 
  {
      window.open(target.getAttribute("function_name"));
  };
  
  var on_argument_click = function(evt, target)
  {
    target.arg.action();
  };

  var on_goto_script_click = function(evt, target)
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
  eh.click["webgl-drawcall-buffer"] = on_buffer_click.bind(this);
  eh.click["webgl-speclink-click"] = on_speclink_click.bind(this);
  eh.click["webgl-drawcall-goto-script"] = on_goto_script_click.bind(this);
  eh.click["webgl-draw-argument"] = on_argument_click.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = ViewBase;
