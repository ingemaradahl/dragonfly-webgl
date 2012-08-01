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

    var view = window.views["webgl_" + group + "_call"];
    if (view == null) view = window.views.webgl_generic_call;

    view.display_call(snapshot, call_index);
  };

  var eh = window.eventHandlers;
  eh.click["webgl-trace-row"] = this._on_row_click.bind(this);

  this.init(id, name, container_class);
  this.init_events();
};

cls.WebGLTraceView.prototype = cls.WebGLSideView;

cls.WebGLTraceView.create_ui_widgets = function()
{
  cls.WebGLSideView.create_ui_widgets("trace-side-panel");
};
