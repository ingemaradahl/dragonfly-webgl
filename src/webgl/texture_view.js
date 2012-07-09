"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLTextureView = function(id, name, container_class)
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
    if (this._content != null)
    {
      this._container.clearAndRender(this._content);
    }
    else
    {
      this._container.clearAndRender(['div', 'Choose texture to inspect']);
    }
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this._on_texture_data = function(msg)
  {
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_texture");
    var texture = msg.texture;

    var template = ["div", window.templates.webgl.texture(texture)];
    this._content = template;
    this._render();
  };

  messages.addListener('webgl-new-texture-data', this._on_texture_data.bind(this));
  this.init(id, name, container_class);
};

cls.WebGLTextureView.prototype = ViewBase;

cls.WebGLTextureSideView = function(id, name, container_class)
{
  this._container = null;

  this.createView = function(container)
  {
    this._container = container;
    this._table = this._table ||
                    new SortableTable(this.tabledef, null, null, null, null,
                        false, "texture-table");

    if (window.webgl.available())
    {
      // TODO: request from correct context
      window.webgl.request_textures();
    }

    this._render();
  };

  this.ondestroy = function()
  {
    // TODO remove listeners

  };

  this._render = function()
  {
    if (!this._container)
    {
      return;
    }

    if(!window.webgl.available())
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No WebGLContext present..."],
         'class', 'info-box'
        ]
      );
    }
  };

  this._on_new_texture_list = function()
  {
    var ctx = window['cst-selects']['snapshot-select'].get_selected_context();
    var tbl_data = [];
    var ids = window.webgl.data[ctx].texture_container;
    var i = 0;

    for (i=0; i < ids.length; i++)
    {
      tbl_data.push({"texture" : "Texture" + ids[i].id, id : ids[i].id});
    }
    this._table.set_data(tbl_data);
    this._container.clearAndRender(this._table.render());
  };

  this._on_refresh = function()
  {
    window.webgl.request_textures(this._context);
    this._render();
  };

  this._on_table_click = function(evt, target)
  {
    var tid = Number(target.getAttribute("data-object-id"));

    var ctx = window['cst-selects']['snapshot-select'].get_selected_context();
    window.webgl.request_texture_data(ctx, tid);
  };

  this._on_context_change = function(ctx)
  {
    this._render();
  };

  this._on_new_texture_data = function(msg)
  {

  };

  this.tabledef = {
  handler: "webgl-texture-table",
  column_order: ["texture"],
  idgetter: function(res) { return String(res.id); },
    columns: {
      texture: {
        label: "Texture",
        sorter: "unsortable",
      },
    }
  };

  var eh = window.eventHandlers;

  eh.click["refresh-webgl-texture"] = this._on_refresh.bind(this);
  eh.click["webgl-texture-table"] = this._on_table_click.bind(this);

  messages.addListener('webgl-new-texture-list', this._on_new_texture_list.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));

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

