"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * TODO: currently a temporary design of the view which displays data in a non user-friendly way.
 * @constructor
 * @extends ViewBase
 */
cls.WebGLBufferView = function(id, name, container_class)
{
  this._container = null;
  this._current_context = null;

  this.createView = function(container)
  {
    this._container = container;
    this._table = this._table || 
                           new SortableTable(this.tabledef, null, null, null, null, false, "buffer-table");

    this._render();
  };

  this.ondestroy = function() 
  {
    // TODO remove listeners
  };

  this._render = function()
  {
    if(!this._container) return;
    var ctx = window['cst-selects']['context-select'].get_selected_context();
    if (window.webgl.data.buffers.length > 0)
    {
      this._container.clearAndRender(this._table.render());
    }
    else if (window.webgl.available())
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No buffer available."],
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
      for(var i = 0; i < window.webgl.data.buffers.length; i++)
      {
        window.webgl.buffer._get_buffer_data(ctx, i);
      }
    }
  };

  this._on_new_buffer = function()
  {
    // TODO: do stuff.
  };

  this._on_buffer_data_changed = function()
  {
    var buffers = window.webgl.data.buffers;
    this._table.set_data(this._format_buffer_table(buffers));

    this._render();
  };

  this._on_context_change = function(ctx)
  {
    this._current_context = ctx;
    var buffers = window.webgl.data.buffers;
    if (buffers != null)
    {
      this._table.set_data(this._format_buffer_table(buffers));
    }

    this._render();
  };


  this._format_buffer_table = function(buffers)
  {
    var tbl_data = [];
    for (var key in buffers)
    {
      if (buffers.hasOwnProperty(key) && !isNaN(key)){
        var buffer = buffers[key];
        if (buffer == undefined) continue;
        tbl_data.push({"number" : String(buffer.index), "target" : String(buffer.target), "usage" : String(buffer.usage), "data" : buffer.data.join(", ")});
      }
    }
    return tbl_data;
  };

  this.tabledef = {
    column_order: ["number", "target", "usage", "data"],
    columns: {
      number: {
        label: "#",
        sorter: "unsortable"
      },
      target: {
        label: "Target",
        sorter: "unsortable"
      },
      usage: {
        label: "Usage",
        sorter: "unsortable"
      },
      data: {
        label: "Buffer data",
        sorter: "unsortable"
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["refresh-webgl-buffer"] = this._on_refresh.bind(this);

  messages.addListener('webgl-new-buffer', this._on_new_buffer.bind(this));
  messages.addListener('webgl-buffer-data-changed', this._on_buffer_data_changed.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLBufferView.prototype = ViewBase;

cls.WebGLBufferView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'webgl_buffer',
    [
      {
        handler: 'refresh-webgl-buffer',
        title: "Refresh buffers",
        icon: 'reload-webgl-buffer'
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
