"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLTextureView = function(id, name, container_class)
{
  this._container = null;
  this._texture = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    if (this._container && this._texture)
    {
      var content = window.templates.webgl.texture(this._texture);
      this._container.clearAndRender(content);
    }
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.show_texture = function(texture)
  {
    this._texture = texture;

    this._render();
  };

  this._on_texture_data = function(msg)
  {
    if (this._container && this._texture === msg["texture"])
    {
      this._render();
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

  var eh = window.eventHandlers;
  eh.mousedown["webgl-texture-image"] = on_texture_start_drag.bind(this);
  eh.mouseup["webgl-texture-image"] = on_texture_end_drag.bind(this);

  messages.addListener('webgl-texture-data', this._on_texture_data.bind(this));
  this.init(id, name, container_class);
};

cls.WebGLTextureView.prototype = cls.WebGLHeaderViewBase;

// ----------------------------------------------------------------------------

cls.WebGLTextureSideView = function(id, name, container_class)
{
  this._container = null;
  this._content = null;

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

    this._render();
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this._render = function()
  {
    if (!this._container)
      return;

    if (this._content)
    {
      this._table.set_data(this._content)
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
    var i = 0;
    this._content = snapshot.textures.map(function(texture) {
      return {
        name: String(texture),
        dimension: texture.width ? String(texture.width) + "x" + String(texture.height) : "?",
        texture: texture,
        call_index_val : texture.call_index,
        call_index : String(texture.call_index === -1 ? " " : texture.call_index+1),
        id : i++
      };

    });

    this._render();
  };


  this._on_table_click = function(evt, target)
  {
    var item_id = Number(target.get_attr("parent-node-chain", "data-object-id"));
    var table_data = this._table.get_data();

    var texture = table_data[item_id].texture;

    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_texture");
    texture.show();
  };


  this.tabledef = {
    handler: "webgl-texture-table",
    column_order: ["call_index", "name", "dimension"],
    idgetter: function(res) { return String(res.id); },
    columns: {
      call_index : {
        label: "Call",
      },
      name: {
        label: "Texture",
      },
      dimension: {
        label: "Dimension",
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
        label: "texture", // TODO
        grouper : function (res) { return res.name; }
      }
    }
  };

  this.groupby = {

  };

  var eh = window.eventHandlers;

  eh.click["webgl-texture-table"] = this._on_table_click.bind(this);
  //eh.click["refresh-webgl-texture"] = this._on_refresh.bind(this);

  messages.addListener('webgl-changed-snapshot', this._on_snapshot_change.bind(this));
  //messages.addListener('webgl-take-snapshot', this._on_take_snapshot.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLTextureSideView.prototype = ViewBase;


cls.WebGLTextureSideView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'texture-side-panel',
    [
      {
        handler: 'refresh-webgl-texture',
        title: "Refresh textures", // TODO
        icon: 'reload-webgl-texture'
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
