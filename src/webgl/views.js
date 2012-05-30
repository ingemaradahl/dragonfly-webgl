"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  this._state = null;

  this.createView = function(container)
  {
    // TODO temporary
    //window.services["ecmascript-debugger"].onConsoleLog = function (status, message)
    //{
    //  alert(message);
    //};
  };

  this.ondestroy = function() 
  {
    //window.services["ecmascript-debugger"].onConsoleLog = function (status, message) {};
  };

  this.init(id, name, container_class);
};

cls.WebGLTraceView.prototype = ViewBase;



cls.WebGLStateView = function(id, name, container_class)
{
  this._state = null;
  this._sortable_table;
  this._container = null;

  this.createView = function(container)
  {
    this._container = container;
    this._table = this._table || 
                           new SortableTable(this.tabledef, null, null, null, null, false, "state-table");



    // TODO temporary
    if (window.webgl.contexts.length > 0)
    {
      window.webgl._send_state_query(window.webgl.contexts[0]);
    }
    this._render();
  };

  this.ondestroy = function() 
  {
    // TODO remove listeners

  };

  this._render = function()
  {
    if ((window.webgl.contexts.length > 0) && (this._state)) {
      this._container.clearAndRender(this._table.render());
    }
    else if (window.webgl.contexts.length > 0)
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
    this._table.set_data(tbl_data);
    this._state = msg.state;
    this._container.clearAndRender(this._table.render());
  };

  this._on_no_state = function()
  {
    this._render();
  }

  this._on_refresh = function()
  {
    if (this._state.webgl_present)
    {
      this._state.get_state();
    }
  };

  this._on_new_window = function(window_id)
  {
    if (this._state)
    {
      this._state.get_state(window_id);
    }
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
  // TODO: This doesn't work, runtimes aren't set properly when the message is
  // posted :(
  //messages.addListener("window-changed", this._on_new_window.bind(this));

  messages.addListener('webgl-new-state', this._on_new_state.bind(this));
  messages.addListener("webgl-no-state", this._on_no_state.bind(this));

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
}


cls.ContextSelect = function(id)
{
  var selected_value = "LOL";



  this.init(id);
};

cls.ContextSelect.prototype = new CstSelect();

