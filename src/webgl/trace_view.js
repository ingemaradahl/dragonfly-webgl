"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  this._state = null;
  this._container = null;
  this._current_context = null;
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
    // TODO remove listeners
  };

  this._render = function()
  {
    var ctx_id = window['cst-selects']['context-select'].get_selected_context();
    var trace;
    if (ctx_id != null && (trace = window.webgl.data[ctx_id].get_latest_trace()) != null)
    {
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
    var ctx = window['cst-selects']['context-select'].get_selected_context();
    if (ctx != null)
    {
      window.webgl.request_trace(ctx);
    }
  };

  this._on_new_trace = function(trace)
  {
    this._render();
  };

  this._on_context_change = function(ctx_id)
  {
    this._current_context = ctx_id;
    var trace = window.webgl.data[ctx_id].get_latest_trace(ctx_id);
    if (trace != null)
    {
      this._table.set_data(this._format_trace_table(trace));
    }

    this._render();
  };

  this._format_trace_table = function(trace)
  {
    var tbl_data = [];
    for (var i = 0; i < trace.length; i++)
    {
      var call = trace[i];
      var call_text = window.webgl.api.function_call_to_string(call.function_name, call.args);
      if (trace[i].have_result) call_text += " = " + String(trace[i].result)
      if (trace[i].have_error) call_text += " -> Error code: " + String(trace[i].error_code)
      tbl_data.push({"number" : String(i + 1), "call" : call_text});
    }
    return tbl_data;
  };

  this._on_row_click = function(evt, target)
  {
    var call_number = target["data-call-number"];

    this.display_snapshot_by_call(call_number);
  };

  this._on_argument_click = function(evt, target)
  {
    var arg = this._current_trace[target["data-call-number"]].args[target["data-argument-number"]];
    if (arg.tab)
    {
      window.views.webgl_panel.cell.children[0].tab.setActiveTab("webgl_" + arg.tab);
    }

    if (arg.action)
    {
      arg.action();
    }
  };

  this.display_snapshot_by_call = function(call)
  {
    var ctx_id = window['cst-selects']['context-select'].get_selected_context();

    var snapshot = webgl.data[ctx_id].get_snapshot_by_call(0, call);
    if (!snapshot)
    {
      this._container.innerHTML = "No snapshot for call " + call;
      return;
    }

    if (snapshot.downloading)
    {
      this._container.innerHTML = "Snapshot still downloading...";
      return;
    }

    // TODO: Only temporary of course
    this._container.innerHTML = "";
    this._container.appendChild(window.webgl.gl.canvas);
    var gl;
    if (!(gl = window.webgl.gl))
    {
      this._container.innerHTML = "WebGLContext unavailable, try using Opera Next";
      return;
    }

    gl.canvas.width = snapshot.width;
    gl.canvas.height = snapshot.height;
    gl.viewport(0, 0, snapshot.width, snapshot.height);

    var program = gl.programs["texture"];

    // Make sure we don't upload texture to GPU unnecessarily
    if (!snapshot.texture || snapshot.texture.gl !== gl)
    {
      snapshot.texture = {};
      snapshot.texture.gl = gl;
      snapshot.texture.tex = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, snapshot.texture.tex);

      // WebGL has limited NPOT texturing support
      // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, snapshot.width, snapshot.height,
                    0, gl.RGBA, gl.UNSIGNED_BYTE, snapshot.pixels);
    }

    WebGLUtils.draw_texture(program, snapshot.texture.tex);
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

  messages.addListener('webgl-new-trace', this._on_new_trace.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLTraceView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'webgl_trace',
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
        handler: 'select-webgl-context',
        title: "Select WebGL context", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['context-select'].getTemplate()
      }
    ]
  );
};

cls.WebGLTraceView.prototype = ViewBase;
