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

    this._buffer_settings = null;
    this._preview_container = null;
  }.bind(this);

  clear();

  this.createView = function(container)
  {
    this._container = container;

    var preview_container = new Container(document.createElement("container"));
    preview_container.setup("webgl_buffer_preview");

    this._preview_container = preview_container.cell;
  };

  this._ondestroy = function()
  {
    this._container = null;
    this._preview_container = null;
  };

  /**
   * Adds the canvas used to display buffer previews
   */
  var add_canvas = function()
  {
    var canvas_holder = document.getElementById("webgl-canvas-holder");
    canvas_holder.appendChild(window.webgl.gl.canvas);
    canvas_holder.appendChild(this._preview_container)

    this.onresize = window.webgl.preview.onresize.bind(window.webgl.preview);
    window.webgl.preview.set_info_container(this._preview_container);
  }.bind(this);

  /**
   * Constructs a buffer setting object, describing the layout, mode and so on
   * about a buffer based on the draw call it was used in, if it exists
   */
  var build_settings = function()
  {
    var gl = window.webgl.gl;

    var buffer_options = function ()
    {
      var element_buffers = [];
      for (var i=0; i<this._snapshot.buffers.length; i++)
      {
        var buffer = this._snapshot.buffers[i];
        if (buffer.target == gl.ELEMENT_ARRAY_BUFFER)
          element_buffers.push(buffer);
      }
      element_buffers.push(null);

      return {
        types: [gl.BYTE, gl.SHORT, gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT, gl.FLOAT],
        modes: [gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP],
        element_types: [gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT],
        element_buffers: element_buffers
      }
    }.bind(this);

    if (this._buffer.target === gl.ELEMENT_ARRAY_BUFFER)
      return null;

    var calls = [];
    var vertex_attrib = null;
    var layout = null;

    // Find all the calls that used this buffer as a vertex attribute pointer
    for (var call in this._buffer.vertex_attribs)
    {
      if (this._buffer.vertex_attribs.hasOwnProperty(call))
      {
        calls.push(Number(call));
      }
    }

    if (calls.length === 0)
    {
      // Buffer was never used as an VAP, so just load the default settings
      return null; // TODO;
    }

    // Load the next drawcall after the current call index
    var call_index = this._call_index;
    var call = calls.reduce(function(prev, curr) { return curr < prev && curr > call_index ? curr : prev; }, Infinity);
    vertex_attrib = this._buffer.vertex_attribs[call];
    var draw_call = this._snapshot.drawcalls.get_by_call(call);
    var element_buffer = vertex_attrib.element_buffer;

    for (var i=0; i<vertex_attrib.length; i++)
    {
      for (var j=0; j<vertex_attrib[i].pointers.length; j++)
      {
        var pointer = vertex_attrib[i].pointers[j];
        if (pointer.buffer.index === this._buffer.index)
        {
          layout = pointer.layout;
          break;
        }
      }

      if (layout)
        break;
    }

    return {
      offset : layout.offset,
      stride : layout.stride,
      size : layout.size,
      type : layout.type,
      mode : draw_call.parameters.mode,
      'element-array' : element_buffer ? element_buffer : null,
      'element-type' : element_buffer
        ? element_buffer.constructor === "Uint8Array"
          ? gl.UNSIGNED_BYTE
          : gl.UNSIGNED_SHORT
        : null,
      start : draw_call.parameters.first !== undefined ? draw_call.parameters.first : draw_call.parameters.offset,
      count : draw_call.parameters.count,
      options : buffer_options(gl)
    };

  }.bind(this);

  this.set_preview = function()
  {
    var preview = window.webgl.preview;
    var settings = this._buffer_settings;
    var layout = {
      offset : settings.offset,
      stride : settings.stride,
      size  : settings.size,
      type : settings.type
    };

    var state = {
      indexed : Boolean(settings['element-array']),
      mode : settings.mode,
      count : settings.count
    };

    if (state.indexed)
    {
      state.offset = settings.start;
    }
    else
    {
      state.first = settings.start
    }

    var pointer = { buffer: this._buffer, layout: layout };
    preview.set_attribute(pointer, state, settings['element-array'], false);
    preview.render();
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

    this._buffer_settings = build_settings();

    var template = window.templates.webgl.buffer_base(buffer, this._buffer_settings, coordinates,
      selected_index, start_row);

    buffer.request_data();
    this.render_with_header(snapshot, call_index, template);

    add_canvas();
    this.set_preview();
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
      };

      var template = window.templates.webgl.buffer_base(buffer, this._buffer_settings, coordinates,
        selected_index);

      this.render_with_header(this._snapshot, this._call_index, template);
      add_canvas();
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

  var on_settings_change = function(event, target)
  {
    var setting = target.getAttribute('setting');
    switch (setting)
    {
      case "offset":
      case "stride":
      case "size":
      case "start":
      case "count":
        var value = Number(target.value);
        this._buffer_settings[setting] = value;
        break;
      case "type":
      case "mode":
      case "element-type":
        var value = Number(target.options[target.selectedIndex].value);
        this._buffer_settings[setting] = value;
        break;
      case "element-array":
        var buffer = target.options[target.selectedIndex].buffer;
        this._buffer_settings['element-array'] = buffer;
        break;
    }

    this.set_preview();
  };

  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));
  messages.addListener('webgl-clear', clear.bind(this));

  var eh = window.eventHandlers;
  eh.click["webgl-select-layout"] = this._on_layout_select.bind(this);
  eh.keypress["webgl-input-layout"] = this._on_layout_input.bind(this);
  eh.keypress["webgl-input-row"] = this._on_row_input.bind(this);

  eh.change["webgl-buffer-settings"] = on_settings_change.bind(this);

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

  messages.addListener('webgl-clear', clear.bind(this));

  this.init(id, name, container_class);
  this.init_events();
};

cls.WebGLBufferSideView.prototype = cls.WebGLSideView;

cls.WebGLBufferSideView.create_ui_widgets = function()
{
  cls.WebGLSideView.create_ui_widgets("buffer-side-panel");
};
