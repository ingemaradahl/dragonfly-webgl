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
  this._content = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    if (this._content == null) return;
    this._container.clearAndRender(this._content);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.show_buffer = function(buffer)
  {
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_buffer");
    if (!buffer.data_is_loaded())
    {
      window.webgl.buffer.get_buffer_data(buffer);
    }
    this._content = window.templates.webgl.buffer_base(buffer);
    this._render();
  };

  this._on_buffer_data = function(buffer)
  {
    this._content = window.templates.webgl.buffer_base(buffer);
    this._render();
  };

  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));
  this.init(id, name, container_class);
};

cls.WebGLBufferView.prototype = ViewBase;

/**
 * TODO: currently a temporary design of the view which displays data in a non user-friendly way.
 * @constructor
 * @extends ViewBase
 */
cls.WebGLBufferSideView = function(id, name, container_class)
{
  this._container = null;
  this._table = null;
  this._current_context = null;
  this._table_data = null;

  this.createView = function(container)
  {
    this._container = container;
    this._table = this._table || new SortableTable(this.tabledef, null, null, null, null, false, "buffer-table");

    this._render();
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this._render = function()
  {
    if(!this._container) return;

    if (this._table_data != null)
    {
      this._table.set_data(this._table_data);
      this._container.clearAndRender(this._table.render());
    }
    else if (window.webgl.available())
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No buffers available."],
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
  };

  this._on_changed_snapshot = function(snapshot)
  {
    var buffers = snapshot.buffers;
    this._table_data = this._format_buffer_table(buffers);

    this._render();
  };

  this._format_buffer_table = function(buffers)
  {
    var tbl_data = [];
    for (var key in buffers)
    {
      if (buffers.hasOwnProperty(key) && !isNaN(key)){
        var buffer = buffers[key];
        if (buffer == null) continue;

        // Ugly and temporary.
        else tbl_data.push({"number" : String(buffer.index), "target" : buffer.target_string(), "usage" : buffer.usage_string(), "size": String(buffer.size)});
      }
    }
    return tbl_data;
  };

  this._on_table_click = function(evt, target)
  {
    var buffer_index = target.getAttribute("data-object-id");
    var snapshot = window['cst-selects']['context-select'].get_selected_snapshot();
    var buffer = snapshot.buffers[buffer_index];
    window.views.webgl_buffer.show_buffer(buffer);
  };

  this.tabledef = {
    handler: "webgl-buffer-table",
    idgetter: function(res) { return String(res.number); },
    column_order: ["number", "target", "usage", "size"],
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
      size: {
        label: "Size",
        sorter: "unsortable"
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["refresh-webgl-buffer"] = this._on_refresh.bind(this);
  eh.click["webgl-buffer-table"] = this._on_table_click.bind(this);

  messages.addListener('webgl-changed-snapshot', this._on_changed_snapshot.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLBufferSideView.prototype = ViewBase;

cls.WebGLBufferSideView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'buffer-side-panel',
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
};
