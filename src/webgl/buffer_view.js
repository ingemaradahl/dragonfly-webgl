"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */

cls.WebGLBufferCallView = function(id, name, container_class)
{
  var summary_tab = new cls.WebGLBufferCallSummaryTab("summary", "General", "");
  var preview_tab = new cls.WebGLBufferPreviewTab("preview", "Visual", "");
  this.set_tabs([
    summary_tab,
    preview_tab,
    new cls.WebGLStateTab("state", "State", ""),
    new cls.WebGLBufferDataTab("buffer-data", "Data", ""),
    new cls.WebGLBufferHistoryTab("buffer-history", "History", "")
  ]);

  var clear = function()
  {
    this._buffer = null;
    this._buffer_layouts = {};
    this._inputbox_hidden = true;
  }.bind(this);

  clear();

  this.set_preview_enabled = function (enabled)
  {
    this.set_tab_enabled(preview_tab, enabled)
  };

  this.set_summary_tab = function()
  {
    this.set_active_tab(summary_tab);
  };

  this.set_preview = function(buffer, settings)
  {
    var preview = window.webgl.preview;
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
      state.first = settings.start;
    }

    var pointer = { buffer: buffer, layout: layout };
    preview.set_attribute(pointer, state, settings['element-array'], false);
    preview.render();
  };

 // TODO Delete?
 // this._render = function(snapshot, call_index, buffer)
 // {
 //   if (call_index !== -1 && !buffer)
 //   {
 //     buffer = snapshot.trace[call_index].linked_object.buffer;
 //   }
 //   this._buffer = buffer;
 //   this._call_index = call_index;
 //   this._snapshot = snapshot;

 //   var coordinates;
 //   var selected_index;
 //   var start_row;

 //   if (this._buffer_layouts[this._buffer.index_snapshot])
 //   {
 //     var layout_obj = this._buffer_layouts[this._buffer.index_snapshot];
 //     coordinates = layout_obj.coordinates || "x";
 //     selected_index = layout_obj.selected_index || 0;
 //     start_row = layout_obj.start_row || 0;
 //   }

 //   this._buffer_settings = build_settings();


 //   var preview = window.webgl.gl ? window.templates.webgl.buffer_preview(this._buffer_settings) : [];
 //   var primary = [{title: "Buffer", content: preview}];

 //   buffer.request_data();
 //   this.render_with_header(snapshot, call_index, primary);
 //   //this.render_with_header(this._snapshot, this._call_index, primary, secondary);

 //   if (this._buffer_settings)
 //   {
 //     add_canvas();
 //     this.set_preview();
 //   }
 // };

  // TODO delete?
  this._on_buffer_data = function(msg)
  {
    var buffer = msg;
//    var coordinates;
//    var selected_index;

    if (this._container && this._buffer === buffer)
    {
//      if (this._buffer_layouts[this._buffer.index_snapshot])
//      {
//        coordinates = this._buffer_layouts[this._buffer.index_snapshot].coordinates;
//        selected_index = this._buffer_layouts[this._buffer.index_snapshot].selected_index;
//      }
//
//      var template = window.templates.webgl.buffer_base(buffer, this._buffer_settings, coordinates,
//        selected_index);
//
//      this.render_with_header(this._snapshot, this._call_index, template);
//
      if (this._buffer_settings)
        add_canvas();
    }
  };
  
  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));
  messages.addListener('webgl-clear', clear);

  this.init(id, name, container_class);
};

cls.WebGLBufferCallView.prototype = cls.WebGLCallView;


// -----------------------------------------------------------------------------

cls.WebGLBufferCallSummaryTab = function(id, name, container_class)
{
  this._buffer = null;

  this.createView = function(container)
  {
    cls.WebGLSummaryTab.createView.apply(this, arguments);

    var preview_container = new Container(document.createElement("container"));
    preview_container.setup("webgl_buffer_preview");
    this._preview_container = preview_container.cell;
  };

  this.set_call = function(snapshot, call_index, object)
  {
    this._buffer = object;
    if (call_index !== -1)
    {
      this._buffer = snapshot.trace[call_index].linked_object.buffer;
    }
    var buffer_call = window.views.webgl_buffer_call;
    buffer_call.set_preview_enabled(this._buffer.previewable());

    cls.WebGLSummaryTab.set_call.apply(this, arguments);
  };

  this.getBufferView = function()
  {
    if (!this._buffer.previewable())
      return null;

    return {
      title: this._buffer.toString(),
      content: window.templates.webgl.preview_canvas(),
      class: "buffer-preview"
    };
  };

  this.getBufferInfo = function()
  {
    return {
      title: "Buffer Info",
      content: window.templates.webgl.buffer_info_table(this._buffer)
    };
  };

  this.getAdditionalPrimaryViews = function()
  {
    return [this.getBufferView(), this.getBufferInfo()];
  };

  this.renderAfter = function()
  {
    if (this._buffer.previewable())
    {
      var buffer_call = window.views.webgl_buffer_call;
      window.webgl.preview.add_canvas();

      var settings = this._buffer.build_settings(this._snapshot, this._call_index);
      buffer_call.set_preview(this._buffer, settings);
    }
    cls.WebGLSummaryTab.renderAfter.call(this);
  };

  this.layoutAfter = function()
  {
    var framebuffer_item = this._container.querySelector(".framebuffer");
    var buffer_item = this._container.querySelector(".buffer-preview");
    if (!framebuffer_item || !buffer_item) return;

    var framebuffer = framebuffer_item.children[1];
    var buffer_preview = buffer_item;

    var buffer_holder = buffer_item.querySelector(".webgl-holder");

    var height = framebuffer.offsetHeight;
    if (height < 200)
      height = 200;
    if (height > 300)
      height = 300;

    buffer_holder.style.height = height + "px";
    buffer_holder.style.width =
      parseInt(buffer_preview.offsetWidth) + "px";
    window.webgl.preview.onresize();
  };

  this.init(id, name, container_class);
};
cls.WebGLBufferCallSummaryTab.prototype = cls.WebGLSummaryTab;

// -----------------------------------------------------------------------------

cls.WebGLBufferHistoryTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1)
      object = snapshot.trace[call_index].linked_object.buffer;
    this._history = object.history;
    cls.WebGLTab.set_call.apply(this, arguments);
  };


  this.init(id, name, container_class);
};

cls.WebGLBufferHistoryTab.prototype = cls.WebGLHistoryTab;

// -----------------------------------------------------------------------------

cls.WebGLBufferDataTab = function(id, name, container_class)
{
  this._buffer_layouts = {};

  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1)
      object = snapshot.trace[call_index].linked_object.buffer;
    this._buffer = object;
    this._snapshot = snapshot;
    this._call_index = call_index;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
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

    var template = window.templates.webgl.buffer_base(this._buffer, null,
      coordinates, selected_index, start_row);

    this._container.clearAndRender(template);
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
        this._buffer_layouts[this._buffer.index_snapshot].selected_index =
          select.selectedIndex;
      }
      else
      {
        this._buffer_layouts[this._buffer.index_snapshot].coordinates = coordinates;
        this._buffer_layouts[this._buffer.index_snapshot].selected_index =
          select.selectedIndex;
        this.render();
      }
    }
  };

  this._on_row_input = function(e)
  {
    if (e.keyCode !== 13 || !this._buffer) return;
    if (this._buffer.data_is_loaded())
    {
      var inputbox = document.getElementById("webgl-row-input");
      if (!this._buffer_layouts[this._buffer.index_snapshot])
      {
        this._buffer_layouts[this._buffer.index_snapshot] = {};
      }
      this._buffer_layouts[this._buffer.index_snapshot].start_row = inputbox.value;
      this.render();
    }
  };

  this._on_layout_input = function(e)
  {
    if (e.keyCode !== 13 || !this._buffer) return;
    if (this._buffer.data_is_loaded())
    {
      var inputbox = document.getElementById("webgl-layout-input");
      this._buffer_layouts[this._buffer.index_snapshot].coordinates = inputbox.value;
      if (!this._inputbox_hidden)
      {
        inputbox.hidden = false;
      }
      this.render();
    }
  };

  var eh = window.eventHandlers;
  eh.change["webgl-select-layout"] = this._on_layout_select.bind(this);
  eh.keypress["webgl-input-layout"] = this._on_layout_input.bind(this);
  eh.keypress["webgl-input-row"] = this._on_row_input.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLBufferDataTab.prototype = cls.WebGLTab;

// -----------------------------------------------------------------------------

cls.WebGLBufferPreviewTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1)
    {
      object = snapshot.trace[call_index].linked_object.buffer;
    }
    this._buffer = object;
    var buffer_call = window.views.webgl_buffer_call;

    if (!this._buffer.previewable())
    {
      // Failsafe for when tab pins are in place
      buffer_call.set_tab_enabled(this, false);
      buffer_call.set_summary_tab();
      return;
    }

    this._settings = this._buffer.build_settings(snapshot, call_index);
    this._buffer.request_data();

    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
    var buffer_call = window.views.webgl_buffer_call;

    var template = window.templates.webgl.buffer_preview(this._settings);
    this._container.clearAndRender(template);

    window.webgl.preview.add_canvas();
    buffer_call.set_preview(this._buffer, this._settings);
    this.layout();
    window.webgl.preview.onresize();
  };

  this.layout = function()
  {
    if (!this._container)
      return;
    var MAX_PREVIEW_HEIGHT = 450;
    var MIN_SETTINGS_WIDTH = 260;

    var container_offset_width = this._container.childNodes[0].offsetWidth;
    var container_width = container_offset_width -
      parseInt(this._container.childNodes[0].currentStyle.paddingLeft, 10) -
      parseInt(this._container.childNodes[0].currentStyle.paddingRight, 10);

    var holder = this._container.querySelector(".webgl-holder");
    holder.style.width = String(container_width-10) + "px";
    holder.style.height = String(container_width > MAX_PREVIEW_HEIGHT ? MAX_PREVIEW_HEIGHT : container_width) + "px";

    var settings = this._container.querySelectorAll(".buffer-settings > div");
    var columns = container_width / 2 < MIN_SETTINGS_WIDTH;

    if (columns)
    {
      for (var i=0; i<settings.length; i++)
      {
        settings[i].style.margin = "5px";
        settings[i].style.width = String(container_width-15) + "px";
      }

      if (settings.length > 0)
      {
        settings[1].style.cssText += "; float: left";
        settings[1].style.width = String(container_width-15) + "px";
      }
    }
    else
    {
      for (var i=0; i<settings.length; i++)
      {
        settings[i].style.margin = "";
        settings[i].style.width = "";
      }
    }
  };

  this.onresize = function()
  {
    this.layout();
    window.webgl.preview.onresize();
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
        this._settings[setting] = value;
        break;
      case "type":
      case "mode":
      case "element-type":
        var value = Number(target.options[target.selectedIndex].value);
        this._settings[setting] = value;
        break;
      case "element-array":
        var buffer = target.options[target.selectedIndex].buffer;
        this._settings['element-array'] = buffer;
        break;
    }

    window.views.webgl_buffer_call.set_preview(this._buffer, this._settings);
  };

  var eh = window.eventHandlers;
  eh.change["webgl-buffer-settings"] = on_settings_change.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLBufferPreviewTab.prototype = cls.WebGLTab;

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
      this._table = new SortableTable(this.tabledef, null,
          ["name", "usage", "size"], null, "call", false, "buffer-table");
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
    var i = 0;
    return buffers.map(function(buffer) {
      return {
        buffer: buffer,
        name: String(buffer),
        target: buffer.target_string(),
        usage: buffer.usage_string(),
        size: String(buffer.size),
        size_val: buffer.size,
        call_index_val: buffer.call_index,
        call_index: String(buffer.call_index === -1 ? " " : buffer.call_index + 1),
        id: i++
      };
    });
  };

  this._on_table_click = function(evt, target)
  {
    var buffer_index = Number(target.getAttribute("data-object-id"));
    var snapshot =
      window['cst-selects']['snapshot-select'].get_selected_snapshot();
    var buffer = snapshot.buffers[buffer_index];

    window.views.webgl_buffer_call.display_call(snapshot, buffer.call_index, buffer);
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
        sorter : function (a, b) {
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        }
      },
      target: {
        label: "Target",
      },
      usage: {
        label: "Usage",
      },
      size: {
        label: "Size",
        sorter: function (a,b) {
          return a.size_val < b.size_val ? -1 : a.size_val > b.size_val ? 1 : 0;
        }
      }
    },
    groups: {
      call: {
        label: "call",
        grouper: function (res) {
          return res.call_index_val === -1 ? "Start of frame" : "Call #" + res.call_index;
        },
        sorter: function (a, b) {
          return a.call_index_val < b.call_index_val ? -1 : a.call_index_val > b.call_index_val ? 1 : 0;
        }
      },
      buffer: {
        label: "buffer",
        grouper: function (res) { return res.name; },
        sorter: function (a, b) {
          a = Number(a.substr(7));
          b = Number(b.substr(7));
          return a < b ? -1 : a > b ? 1 : 0;
        }
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
