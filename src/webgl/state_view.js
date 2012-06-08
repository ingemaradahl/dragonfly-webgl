"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

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

