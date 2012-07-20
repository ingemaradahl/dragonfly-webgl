"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  this._container = null;
  this._current_trace = null;

  this.createView = function(container)
  {
    this._container = container;
    this._table = this._table ||
                           new SortableTable(this.tabledef, null, null, null, null, false, "trace-table");

    this._render();
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this._render = function()
  {
    if (!this._container) return;

    var snapshot = window['cst-selects']['snapshot-select'].get_selected_snapshot();

    if (window.webgl.runtime_id === -1)
    {
      this._container.clearAndRender(window.templates.webgl.reload_info());
    }
    else if (snapshot != null)
    {
      var trace = snapshot.trace;
      this._current_trace = trace;
      var template = window.templates.webgl.trace_table(trace, this.id);
      this._container.clearAndRender(template);
    }
    else if (window.webgl.available())
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No trace available."],
         'class', 'info-box'
        ]
      );
    }
    else
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No WebGLContext present..."],
         'class', 'info-box'
        ]
      );
    }
  };

  this._on_refresh = function()
  {
    var ctx_id = window['cst-selects']['snapshot-select'].get_selected_context();
    if (ctx_id != null)
    {
      window.webgl.request_snapshot(ctx_id);
    }
  };

  // TODO Commented out by Victor, private function that is never called. Delete?
  //this._format_trace_table = function(trace)
  //{
  //  var tbl_data = [];
  //  for (var i = 0; i < trace.length; i++)
  //  {
  //    var call = trace[i];
  //    var call_text = window.webgl.api.function_call_to_string(call.function_name, call.args);
  //    if (trace[i].have_result) call_text += " = " + String(trace[i].result);
  //    if (trace[i].have_error) call_text += " -> Error code: " + String(trace[i].error_code);
  //    tbl_data.push({"number" : String(i + 1), "call" : call_text});
  //  }
  //  return tbl_data;
  //};

  this._on_row_click = function(evt, target)
  {
    var call_index = target["data-call-number"];
    var snapshot = window['cst-selects']['snapshot-select'].get_selected_snapshot();
    var trace_call = snapshot.trace[call_index];
    var template = null;

    var view;
    var tab;
    if (trace_call.drawcall)
    {
      tab = "webgl_draw_call";
      view = window.views.webgl_draw_call;
    }
    else
    {
      for (var i=0; i<trace_call.args.length; i++)
      {
        var arg = trace_call.args[i];
        var type = arg.type;
        switch (type)
        {
          case "WebGLTexture":
              arg.texture.show();
              var template = window.templates.webgl.texture(arg.texture);
              break;
          case "WebGLBuffer":
              arg.buffer.show();
              var template = window.templates.webgl.buffer_base(arg.buffer);
              break;
          default: break;
        }
      }
      tab = "webgl_call";
      view = window.views.webgl_call;
    }

    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab(tab);
    view.display_by_call(snapshot, call_index, template);
  };

  this._on_argument_click = function(evt, target)
  {
    var arg = target["data-linked-object"];
    arg.action();
  };

  this._on_take_snapshot = function()
  {
    if (this._container)
    {
      this._container.clearAndRender(window.templates.webgl.taking_snapshot());
    }
  };

  this.tabledef = {
    column_order: ["number", "call"],
    handler: "webgl-trace-table",
    idgetter: function(res) { return res; },
    columns: {
      number: {
        label: "Number",
        sorter: "unsortable"
      },
      call: {
        label: "Function call",
        sorter: "unsortable"
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["webgl-trace-refresh"] = this._on_refresh.bind(this);
  eh.click["webgl-trace-row"] = this._on_row_click.bind(this);
  eh.click["webgl-trace-argument"] = this._on_argument_click.bind(this);

  messages.addListener('webgl-changed-snapshot', this._render.bind(this));
  messages.addListener('webgl-take-snapshot', this._on_take_snapshot.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLTraceView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'trace-side-panel',
    [
      {
        handler: 'webgl-trace-refresh',
        title: "Refresh the trace",
        icon: 'reload-webgl-trace'
      }
    ],
    null,
    null,
    [
      {
        handler: 'select-webgl-snapshot',
        title: 'Select Snapshot',
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['snapshot-select'].getTemplate()
      }
    ]
  );
};

cls.WebGLTraceView.prototype = ViewBase;
