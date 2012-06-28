"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLTextureView = function(id, name, container_class)
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

  this.clear = function ()
  {
    if (window.webgl.available())
    {
      window.webgl.request_textures(this._context);
    }

    this._render();
  };

  this._render = function()
  {
    if (!this._container)
    {
      return;
    }

    if(window.webgl.available())
    {

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

  this._on_new_texture_list = function()
  {
    var ctx = window['cst-selects']['context-select'].get_selected_context();
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

    var ctx = window['cst-selects']['context-select'].get_selected_context();
    window.webgl.request_texture_data(ctx, tid);
  };

  this._on_context_change = function(ctx)
  {
    this._render();
  };

  this._on_new_texture_data = function(msg)
  {
    // TODO collecting data from webg.data. Would be nice with
    // a nice generic solution.
    var texture_index = msg["id"]; //TODO ugly
    var ctx = window['cst-selects']['context-select'].get_selected_context();
    var obj = window.webgl.data[ctx].texture_data[texture_index];

    this._container.clearAndRender(
      ['div',
        ['p',"Texture" + texture_index ],
        ['p',"Element Type: " + obj.element_type],
        ['p', "texture_wrap_s: " + obj.texture_wrap_s],
        ['p', "texture_wrap_t: " + obj.texture_wrap_t],
        ['p', "texture_min_filter: " + obj.texture_min_filter],
        ['p', "texture_mag_filter: " + obj.texture_mag_filter],
        ['p', "Source : " + obj.source],
        ['img', 'src',  obj.img ],
        'class', 'info-box'
      ]
    );
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
  messages.addListener('webgl-clear', this.clear.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));
  messages.addListener('webgl-new-texture-data',
      this._on_new_texture_data.bind(this));

  this.init(id, name, container_class);
}

cls.WebGLTextureView.prototype = ViewBase;


cls.WebGLTextureView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'webgl_texture',
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
        handler: 'select-webgl-context',
        title: "Select WebGL context", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['context-select'].getTemplate()
      }
    ]
  );
};

