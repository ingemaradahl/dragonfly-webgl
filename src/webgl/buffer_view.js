"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLHeaderViewBase
 */

cls.WebGLBufferCallView = function(id, name, container_class)
{
  var clear = function()
  {
    this._call_index = null;
    this._snapshot = null;
    this._buffer = null;
    this._buffer_layouts = {};
    this._inputbox_hidden = true;
  }.bind(this);
  clear();

  this.createView = function(container)
  {
    this._container = container;
  };

  this._ondestroy = function()
  {
    this._container = null;
  };

  this.display_by_call = function(snapshot, call_index, buffer)
  {
    if (call_index !== -1 && !buffer)
    {
      buffer = snapshot.trace[call_index].linked_object.buffer;
    }
    this._buffer = buffer;
    this._call_index = call_index;
    this._snapshot = snapshot;

    var coordinates;
    var selected_index;
    var start_row;

    if (this._buffer_layouts[this._buffer.index_snapshot])
    {
      var layout_obj = this._buffer_layouts[this._buffer.index_snapshot];
      coordinates = layout_obj.coordinates || "x";
      selected_index = layout_obj.selected_index || 0;
      start_row = layout_obj.start_row || 0;
    }

    var template = window.templates.webgl.buffer_base(buffer, coordinates,
      selected_index, start_row);

    buffer.request_data();
    this.render_with_header(snapshot, call_index, template);
  };

  this._on_buffer_data = function(msg)
  {
    var buffer = msg;
    var coordinates;
    var selected_index;

    if (this._container && this._buffer === buffer)
    {
      if (this._buffer_layouts[this._buffer.index_snapshot])
      {
        coordinates = this._buffer_layouts[this._buffer.index_snapshot].coordinates;
        selected_index = this._buffer_layouts[this._buffer.index_snapshot].selected_index;
      }

      var template = window.templates.webgl.buffer_base(buffer, coordinates,
        selected_index);

      this.render_with_header(this._snapshot, this._call_index, template);
    }
  };

  this._on_layout_select = function()
  {
    if (!this._buffer) return;
    if (this._buffer.data_is_loaded())
    {
      var select = document.getElementById("webgl-layout-selector");
      var coordinates = select.options[select.selectedIndex].value;
      if(!this._buffer_layouts[this._buffer.index_snapshot])
      {
        this._buffer_layouts[this._buffer.index_snapshot] = {};
        this._buffer_layouts[this._buffer.index_snapshot].selected_index =
          select.selectedIndex;
      }
      if (coordinates === "custom")
      {
        var inputbox = document.getElementById("webgl-layout-input");
        inputbox.hidden = false;
        this._inputbox_hidden = false;
        return;
      }
      else
      {
        this._buffer_layouts[this._buffer.index_snapshot].coordinates = coordinates;
        this.display_by_call(this._snapshot, this._call_index, this._buffer);
      }
    }
  };

  this._on_row_input = function(e)
  {
    if (e.keyCode !== 13) return;
    if (!this._buffer) return;
    if (this._buffer.data_is_loaded())
    {
      var inputbox = document.getElementById("webgl-row-input");
      if (!this._buffer_layouts[this._buffer.index_snapshot])
      {
        this._buffer_layouts[this._buffer.index_snapshot] = {};
      }
      this._buffer_layouts[this._buffer.index_snapshot].start_row = inputbox.value;
      this.display_by_call(this._snapshot, this._call_index, this._buffer);
    }
  };

  this._on_layout_input = function(e)
  {
    if (e.keyCode !== 13) return;
    if (!this._buffer) return;
    if (this._buffer.data_is_loaded())
    {
      var inputbox = document.getElementById("webgl-layout-input");
      this._buffer_layouts[this._buffer.index_snapshot].coordinates = inputbox.value;
      if (!this._inputbox_hidden)
      {
        inputbox.hidden = false;
      }
      this.display_by_call(this._snapshot, this._call_index, this._buffer);
    }
  };

  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));
  messages.addListener('webgl-clear', clear);

  var eh = window.eventHandlers;
  eh.change["webgl-select-layout"] = this._on_layout_select.bind(this);
  eh.keypress["webgl-input-layout"] = this._on_layout_input.bind(this);
  eh.keypress["webgl-input-row"] = this._on_row_input.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLBufferCallView.prototype = cls.WebGLHeaderViewBase;

// -----------------------------------------------------------------------------

/**
 * @constructor
 * @extends cls.WebGLSideView
 */
cls.WebGLBufferSideView = function(id, name, container_class)
{
  this._table_data = null;

  var clear = function()
  {
    this._table_data = null;
  };

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

    this.render();
  };

  this._render = function()
  {
    if (this._table_data != null)
    {
      this._table.set_data(this._table_data);
      this._container.clearAndRender(this._table.render());
    }
    else
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No buffers available."],
         'class', 'info-box'
        ]
      );
    }
  };

  this._on_snapshot_change = function(snapshot)
  {
    var buffers = snapshot.buffers;
    this._table_data = this._format_buffer_table(buffers);

    this.render();
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
    var snapshot =
      window['cst-selects']['snapshot-select'].get_selected_snapshot();

    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_buffer_call");
    window.views.webgl_buffer_call.display_by_call(snapshot,
      buffer.call_index, buffer);
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
        sorter : function (a, b) { return a.call_index_val < b.call_index_val ? -1 : a.call_index_val > b.call_index_val ? 1 : 0; }
      },
      texture: {
        label: "buffer", // TODO
        grouper : function (res) { return res.name; }
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["webgl-buffer-table"] = this._on_table_click.bind(this);

  messages.addListener('webgl-clear', clear.bind(this));

  this.init(id, name, container_class);
  this.init_events();
};

cls.WebGLBufferSideView.prototype = cls.WebGLSideView;

cls.WebGLBufferSideView.create_ui_widgets = function()
{
  cls.WebGLSideView.create_ui_widgets("buffer-side-panel");
};
