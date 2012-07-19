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
    if (this._content == null || !this._container) return;
    this._container.clearAndRender(this._content);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.show_buffer = function(buffer)
  {

    this._buffer = buffer;
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
  this._current_context = null;
  this._table_data = null;

  this.createView = function(container)
  {
    this._container = container;
    if (!this._table)
    {
      this._table = new SortableTable(this.tabledef, null, ["name", "usage", "size"], null, "call", false, "buffer-table");
      this._table.group = WebGLUtils.make_group(this._table,
        [ {group: "call",    remove: "call_index", add: "name"},
          {group: "buffer",  remove: "name",       add: "call_index"} ]
      );
    }

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

  this._on_changed_snapshot = function(snapshot)
  {
    var buffers = snapshot.buffers;
    this._table_data = this._format_buffer_table(buffers);

    this._render();
  };

  this._format_buffer_table = function(buffers)
  {
    var tbl_data = [];
    var i = 0;
    return buffers.map(function(buffer) {
      return {
        buffer : buffer,
        name: String(buffer),
        target : buffer.target_string(),
        usage : buffer.usage_string(),
        size : String(buffer.size),
        call_index_val : buffer.call_index,
        call_index : String(buffer.call_index === -1 ? " " : buffer.call_index+1),
        id : i++
      };
    });
  };

  this._on_table_click = function(evt, target)
  {
    var buffer_index = Number(target.getAttribute("data-object-id"));
    var table_data = this._table.get_data();
    var buffer = table_data[buffer_index].buffer;

    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_buffer");
    buffer.show();
  };

  this._on_take_snapshot = function()
  {
    if (this._container)
    {
      this._container.clearAndRender(window.templates.webgl.taking_snapshot());
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

  this.tabledef = {
    handler: "webgl-buffer-table",
    idgetter: function(res) { return String(res.id); },
    column_order: ["name", "target", "usage", "size"],
    columns: {
      call_index: {
        label: "Call"
      },
      name: {
        label: "Buffer",
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
    },
    groups: {
      call: {
        label: "call", // TODO
        grouper : function (res) { return res.call_index_val === -1 ? "Start of frame" : "Call #" + res.call_index; },
        sorter : function (a, b) { return a.call_index_val < b.call_index_val ? -1 : a.call_index_val > b.call_index_val ? 1 : 0 }
      },
      texture: {
        label: "buffer", // TODO
        grouper : function (res) { return res.name; }
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["webgl-buffer-table"] = this._on_table_click.bind(this);
  eh.click["webgl-buffer-refresh"] = this._on_refresh.bind(this);

  messages.addListener('webgl-changed-snapshot', this._on_changed_snapshot.bind(this));
  messages.addListener('webgl-take-snapshot', this._on_take_snapshot.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLBufferSideView.prototype = ViewBase;

cls.WebGLBufferSideView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'buffer-side-panel',
    [
      {
        handler: 'webgl-buffer-refresh',
        title: "Refresh buffers",
        icon: 'reload-webgl-buffer'
      }
    ],
    null,
    null,
    [
      {
        handler: 'select-webgl-snapshot',
        title: "Select WebGL snapshot", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['snapshot-select'].getTemplate()
      }
    ]
  );
};
