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

  this.createView = function(container)
  {
    this._container = container;
    this._trace = new cls.WebGLTrace();
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
    var ctx = window['cst-selects']['context-select'].get_selected_context();
    var trace;
    if (ctx != false && (trace = this._trace.get_last_trace(ctx)) != null)
    {
      this._table.set_data(this._format_trace_table(trace));
      this._container.clearAndRender(this._table.render());
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
    if (ctx != false)
    {
      this._trace.request_trace(ctx);
    }
  };

  this._on_new_trace = function(trace)
  {
    this._table.set_data(this._format_trace_table(trace));
    this._trace_data = trace;
    this._container.clearAndRender(this._table.render());
  };

  this._on_context_change = function(ctx)
  {
    this._current_context = ctx;
    var trace = this._trace.get_last_trace(ctx);
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
      var call_text = trace[i].function_name + "(" + trace[i].args.join(", ") + ")";
      if (trace[i].has_error) call_text += " -> Error code: " + String(trace[i].error_code)
      tbl_data.push({"number" : String(i + 1), "call" : call_text});
    }
    return tbl_data;
  };

  this.tabledef = {
    column_order: ["number", "call"],
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
  eh.click["refresh-webgl-trace"] = this._on_refresh.bind(this);

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
        handler: 'refresh-webgl-trace',
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
}

cls.WebGLTraceView.prototype = ViewBase;



cls.WebGLStateView = function(id, name, container_class)
{
  this._state = {};
  this._context = null;
  this._sortable_table;
  this._container = null;

  this.createView = function(container)
  {
    this._container = container;
    this._table = this._table || 
                           new SortableTable(this.tabledef, null, null, null, null, false, "state-table");



    if (window.webgl.available())
    {
      window.webgl.request_state();
    }

    this._render();
  };

  this.ondestroy = function() 
  {
    // TODO remove listeners

  };

  this.clear = function ()
  {
    this._state = {};
    this._context = null;

    if (window.webgl.available())
    {
      window.webgl.request_state(this._context);
    }

    this._render();
  };

  this._render = function()
  {
    if (!this._container)
    {
      return;
    }

    if ((window.webgl.available()) && (this._state[this._context])) {
      this._container.clearAndRender(this._table.render());
    }
    else if (window.webgl.available())
    {
      this._container.clearAndRender(
        ['div',
         ['p', "Loading WebGL state..."],
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

  this._on_new_state = function(msg)
  {
    var state = msg.state;
    var tbl_data = [];
    for (var pname in state)
    {
      tbl_data.push({"variable" : pname, "value" : state[pname]});
    }
    this._state[msg.object_id] = tbl_data;

    if ((msg.object_id == this._context) || (!this._context))
    {
      this._context = msg.object_id;
      this._table.set_data(tbl_data);
      this._container.clearAndRender(this._table.render());
    }
  };

  this._on_refresh = function()
  {
    delete this._state[this._context];
    window.webgl.request_state(this._context);
    this._render();
  };

  this._on_context_change = function(ctx)
  {
    this._context = ctx;
    if (ctx in this._state)
    {
      this._table.set_data(this._state[ctx]);
    }
    else
    {
      window.webgl.request_state(ctx);
    }

    this._render();
  };

  this.tabledef = {
    column_order: ["variable", "value"],
    columns: {
      variable: {
        label: "State Variable", // TODO
        classname: "col-pname"
      },
      value: {
        label: "Value",
        sorter: "unsortable"
      }
    }
  };


  var eh = window.eventHandlers;

  eh.click["refresh-webgl-state"] = this._on_refresh.bind(this);

  messages.addListener('webgl-new-state', this._on_new_state.bind(this));
  messages.addListener('webgl-clear', this.clear.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));

  this.init(id, name, container_class);
}

cls.WebGLStateView.prototype = ViewBase;



cls.WebGLStateView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'webgl_state',
    [
      {
        handler: 'refresh-webgl-state',
        title: "Refresh the state", // TODO
        icon: 'reload-webgl-state'
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



cls.WebGLContextSelect = function(id)
{
  this._option_list = [{}];
  this.disabled = true;
  this._selected_option_index = 0;

  this.getSelectedOptionText = function()
  {
    if (!this.disabled && this._option_list.length > 0)
    {
      return "WebGLContext #" + this._selected_option_index;
    }
    else 
    {
      return "No WebGLContext available...";
    }
  };

  this.getSelectedOptionValue = function()
  {

  };

  /**
   * Returns the id of the context that is currently selected.
   * Returns false if there is no context selected.
   */
  this.get_selected_context = function()
  {
    if (window.webgl.available())
      return window.webgl.contexts[this._selected_option_index];
    return false;
  };

  this.getTemplate = function()
  {
    var select = this;
    return function(view)
    {
      return window.templates['cst-select'](select, select.disabled);
    };
  };

  this.templateOptionList = function(select_obj)
  {
    var 
    ret = [],
    opt_list = select_obj._option_list,
    opt = null, 
    i = 0;

    for( ; opt = opt_list[i]; i++)
    {
      ret[i] = 
      [
        "cst-option",
        "WebGLContext #" + i,
        "opt-index", i,
        "title", opt.title || "",
        "unselectable", "on"
      ];
    }
    return ret;
  };

  this.checkChange = function(target_ele)
  {
    var index = target_ele['opt-index'];
    if (index == undefined) return false;

    if (this._selected_option_index != index)
    {
      this._selected_option_index = index;
      messages.post('webgl-context-selected', window.webgl.contexts[index]);
      return true;
    }
    return false;
  }

  this._new_context = function(contexts)
  {
    this.disabled = !window.webgl.available();
    this._option_list = window.webgl.contexts;
  };


  messages.addListener('webgl-new-context', this._new_context.bind(this));

  this.init(id);
};

cls.WebGLContextSelect.prototype = new CstSelect();

