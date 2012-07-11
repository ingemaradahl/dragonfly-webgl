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

  var add_canvas = function()
  {
    var canvas_holder = document.getElementById("webgl-canvas-holder");
    canvas_holder.appendChild(window.webgl.gl.canvas);

    // TODO temporary
    window.webgl.gl.canvas.width = 250;
    window.webgl.gl.canvas.height = 250;
  };

  var draw_mesh = function(gl)
  {
    var buffer = this._buffer;
    if (!buffer.data_is_loaded() || buffer.target === gl.ELEMENT_ARRAY_BUFFER)
      return;

    if (!buffer.gl_buffer)
    {
      buffer.gl_buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer.gl_buffer); // TODO: actual target
      gl.bufferData(gl.ARRAY_BUFFER, buffer.data, gl.STATIC_DRAW);
    }
    
    var width = gl.canvas.width;
    var height = gl.canvas.height;

    var program = gl.programs.buffer;

    gl.clearColor(Math.random(), Math.random(), Math.random(), 1.0);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    var pMatrix = mat4.create();
    mat4.perspective(45, width / height, 0.1, 100.0, pMatrix);

    var mvMatrix = mat4.create();
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0.0, 0.0, 2.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.gl_buffer);
    gl.vertexAttribPointer(program.positionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(program.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, Math.floor(buffer.data.length/3));
  }.bind(this);

  this._render = function()
  {
    if (this._content == null) return;
    this._container.clearAndRender(this._content);

    var gl = window.webgl.gl;
    if (gl)
    {
      add_canvas();
      draw_mesh(gl);
    }
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.show_buffer = function(buffer)
  {
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_buffer");

    this._buffer = buffer;
    this._content = window.templates.webgl.buffer_base(buffer);
    this._render();
  };

  var on_buffer_data = function(buffer)
  {
    this._content = window.templates.webgl.buffer_base(buffer);
    this._render();
  };

  messages.addListener('webgl-buffer-data', on_buffer_data.bind(this));
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

  var on_changed_snapshot = function(snapshot)
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

  var on_table_click = function(evt, target)
  {
    var buffer_index = Number(target.getAttribute("data-object-id"));
    var table_data = this._table.get_data();
    var buffer = table_data[buffer_index].buffer;

    buffer.show();
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
  eh.click["webgl-buffer-table"] = on_table_click.bind(this);
  messages.addListener('webgl-changed-snapshot', on_changed_snapshot.bind(this));

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
        handler: 'select-webgl-snapshot',
        title: "Select WebGL snapshot", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['snapshot-select'].getTemplate()
      }
    ]
  );
};
