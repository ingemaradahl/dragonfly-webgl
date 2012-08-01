"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLHeaderViewBase
 */
cls.WebGLTextureCallView = function(id, name, container_class)
{
  this._container = null;
  this._snapshot = null;
  this._call_index = null;

  this.createView = function(container)
  {
    this._container = container;
  };

  this.display_by_call = function(snapshot, call_index, texture)
  {
    if (call_index !== -1 && !texture)
    {
      texture = snapshot.trace[call_index].linked_object.texture;
    }
    this._snapshot = snapshot;
    this._call_index = call_index;
    this._texture = texture;

    texture.request_data();

    var template = window.templates.webgl.texture(texture);
    this.render_with_header(snapshot, call_index, template);
  };

  this._ondestroy = function()
  {
    this._container = null;
  };

  this._on_texture_data = function(msg)
  {
    var texture = msg.texture;
    if (this._container && this._texture === texture)
    {
      var template = window.templates.webgl.texture(msg.texture);
      this.render_with_header(this._snapshot, this._call_index, template);
    }
  };

  var on_texture_end_drag = function(evt)
  {
    evt.stopPropagation();
    evt.preventDefault();
    window.onmousemove = null;
    window.onmouseup = null;
  };

  var on_texture_start_drag = function(evt, target)
  {
    evt.stopPropagation();
    evt.preventDefault();
    var parent = target.parentElement;
    var x_start = evt.clientX + parent.scrollLeft;
    var y_start = evt.clientY + parent.scrollTop;

    var max_top = Math.max(0, evt.target.offsetHeight - parent.clientHeight);
    var max_left = Math.max(0, evt.target.offsetWidth - parent.clientWidth);
    this._target = target;

    window.onmousemove = function(e)
    {
      e.stopPropagation();
      e.preventDefault();
      var top = Math.min(max_top, Math.max(0, y_start - e.clientY));
      var left = Math.min(max_left, Math.max(0, x_start - e.clientX));

      parent.scrollTop = top;
      parent.scrollLeft = left;
    };

    window.onmouseup = on_texture_end_drag;
  };


  messages.addListener('webgl-texture-data', this._on_texture_data.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLTextureCallView.prototype = cls.WebGLHeaderViewBase;

// ----------------------------------------------------------------------------

/**
 * @constructor
 * @extends cls.WebGLSideView
 */
cls.WebGLTextureSideView = function(id, name, container_class)
{
  this._content = null;

  var clear = function()
  {
    this._content = null;
  };

  this.createView = function(container)
  {
    this._container = container;
    if (!this._table)
    {
      this._table = new SortableTable(this.tabledef, null, ["name", "dimension"], null, "call", false, "texture-table");
      this._table.group = WebGLUtils.make_group(this._table,
        [ {group: "call",    remove: "call_index", add: "name"},
          {group: "texture", remove: "name",       add: "call_index"} ]
      );
    }

    this.render();
  };

  this._render = function()
  {
    if (!this._container)
      return;

    if (this._content)
    {
      this._table.set_data(this._content);
      this._container.clearAndRender(this._table.render());
    }
    else
    {
      this._container.clearAndRender(
        ['div',
         ['p', "COMMON MAN TAKE A SNAPPY-SHOT!"], // TODO not really no
         'class', 'info-box'
        ]
      );
    }
  };

  this._on_snapshot_change = function(snapshot)
  {
    var i=0;
    this._content = snapshot.textures.map(function(texture) {
      var lvl0 = texture.levels[0];
      return {
        name: String(texture),
        dimension: lvl0 && lvl0.width ? String(lvl0.width) + "x" + String(lvl0.height) : "?",
        size: lvl0 && lvl0.width && lvl0.height ? lvl0.width*lvl0.height: 0,
        texture: texture,
        call_index_val: texture.call_index,
        call_index: String(texture.call_index === -1 ? " " : texture.call_index+1),
        id: i++
      };
    });
  };

  this._on_table_click = function(evt, target)
  {
    var item_id = Number(target.get_attr("parent-node-chain", "data-object-id"));
    var table_data = this._table.get_data();
    var snapshot =
      window['cst-selects']['snapshot-select'].get_selected_snapshot();
    var texture = snapshot.textures[item_id];

    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_texture_call");
    window.views.webgl_texture_call.display_by_call(snapshot, texture.call_index, texture);
  };

  this.tabledef = {
    handler: "webgl-texture-table",
    column_order: ["call_index", "name", "dimension"],
    idgetter: function(res) { return String(res.id); },
    columns: {
      call_index : {
        label: "Call",
        sorter: function(a,b) { return a.call_index_val < b.call_index_val ? -1 :
          a.call_index_val > b.call_index_val ? 1 : 0; }
      },
      name: {
        label: "Texture",
        sorter: "unsortable"
      },
      dimension: {
        label: "Dimension",
        sorter: function(a,b) { return a.size < b.size ? -1 : a.size > b.size ? 1 : 0; } 
      }
    },
    groups: {
      call: {
        label: "call", // TODO
        grouper : function (res) 
          { return res.call_index_val === -1 ? "Start of frame" : "Call #" + res.call_index; },
        sorter : function (a, b) 
          { return a.call_index_val < b.call_index_val ? -1 : a.call_index_val > b.call_index_val ? 1 : 0 }
      },
      texture: {
        label: "texture", // TODO
        grouper : function (res) { return res.name; },
        sorter: "unsortable"
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["webgl-texture-table"] = this._on_table_click.bind(this);

  messages.addListener('webgl-clear', clear.bind(this));

  this.init(id, name, container_class);
  this.init_events();
};

cls.WebGLTextureSideView.prototype = cls.WebGLSideView;

cls.WebGLTextureSideView.create_ui_widgets = function()
{
  cls.WebGLSideView.create_ui_widgets("texture-side-panel");
};
