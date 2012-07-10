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

  this.show_texture = function (texture)
  {
    this._texture = texture;

    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_texture");
    this._render();
  };

  var on_texture_data = function(msg)
  {
    if (this._container && this._texture === msg["texture"])
    {
      this._render();
    }
  };

  messages.addListener('webgl-texture-data', on_texture_data.bind(this));
  this.init(id, name, container_class);
};

cls.WebGLTextureView.prototype = ViewBase;








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
      this._table.group = this._make_group(this._table,
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

  this._make_group = function(table, group_mutexes)
  {
    var orig_group = table.group.bind(table);
    return function (group) {
      for (var i=0; i<group_mutexes.length; i++)
      {
        var def = group_mutexes[i];
        if (def.group === group)
        {
          this.columns = this.columns.filter(function(columns) { return columns !== def.remove});
          if (this.columns.indexOf(def.add) === -1)
            this.columns.unshift(def.add);

          break;
        }
      }

      orig_group(group);
    }.bind(table);
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

  var on_snapshot_change = function(snapshot)
  {
    var i = 0;
    this._content = snapshot.textures.map(function(texture) {
      return {
        name: "Texture " + String(texture.index),
        dimension: texture.width ? String(texture.width) + "x" + String(texture.height) : "?",
        texture: texture,
        call_index_val : texture.call_index, 
        call_index : String(texture.call_index === -1 ? " " : texture.call_index+1),
        id : i++
      };
    
    });

    this._render();
  };


  var on_table_click = function(evt, target)
  {
    var item_id = Number(target.get_attr("parent-node-chain", "data-object-id"));
    var table_data = this._table.get_data();
    
    var texture = table_data[item_id].texture;

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
        label: "Group by call", // TODO
        grouper : function (res) { return res.call_index_val === -1 ? "Start of frame" : "Call #" + res.call_index; },
        sorter : function (a, b) { return a.call_index_val < b.call_index_val ? -1 : a.call_index_val > b.call_index_val ? 1 : 0 }
      },
      texture: {
        label: "Group by texture", // TODO
        grouper : function (res) { return res.name; }
      }
    }
  };

  this.groupby = {

  };

  var eh = window.eventHandlers;

  eh.click["webgl-texture-table"] = on_table_click.bind(this);
  messages.addListener('webgl-changed-snapshot', on_snapshot_change.bind(this));

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

