"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLSideView
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  this._render = function()
  {
    var snapshot = window['cst-selects']['snapshot-select'].get_selected_snapshot();

    if (snapshot != null)
    {
      var trace = snapshot.trace;
      var template = window.templates.webgl.trace_table(trace, this.id);
      this._container.clearAndRender(template);
    }
    else
    {
      this._container.clearAndRender(
        ['div',
          ['p', "No trace available."],
          'class', 'info-box'
        ]
      );
    }
  };

  this._on_row_click = function(evt, target)
  {
    var call_index = target["data-call-number"];
    var snapshot = window['cst-selects']['snapshot-select'].get_selected_snapshot();
    var call = snapshot.trace[call_index];

    var group = call.group;
    if (group === "uniform" || group === "attrib") group = "program";
    var tab = "webgl_" + group + "_call";
    var view = window.views["webgl_" + group + "_call"];
    if (view == null)
    {
      tab = "webgl_call";
      view = window.views.webgl_call;
    }
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab(tab);
    view.display_by_call(snapshot, call_index);
  };

  this._on_argument_click = function(evt, target)
  {
    var arg = target["data-linked-object"];
    arg.action();
  };

  var eh = window.eventHandlers;
  eh.click["webgl-trace-row"] = this._on_row_click.bind(this);
  eh.click["webgl-trace-argument"] = this._on_argument_click.bind(this);

  this.init(id, name, container_class);
  this.init_events();
};

cls.WebGLTraceView.prototype = cls.WebGLSideView;

cls.WebGLTraceView.create_ui_widgets = function()
{
  cls.WebGLSideView.create_ui_widgets("trace-side-panel");
};
