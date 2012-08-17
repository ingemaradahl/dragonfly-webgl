"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */
cls.WebGLTextureCallView = function(id, name, container_class)
{
  this.set_tabs([
    new cls.WebGLTextureCallSummaryTab("summary", "Summary", ""),
    new cls.WebGLFullTextureTab("full-texture", "Texture", ""),
    new cls.WebGLTextureMipmapTab("texture-mipmap", "Mipmaps", ""),
    new cls.WebGLStateTab("state", "State", ""),
    new cls.WebGLTextureHistoryTab("texture-history", "History", "")
  ]);

  this.display_call = function(snapshot, call_index, object)
  {
    var texture = call_index === -1 ? object :
      snapshot.trace[call_index].linked_object.texture;
    this.set_tab_enabled(this._lookup_tab("texture-mipmap"), texture.mipmapped &&
      texture.levels.length > 1);
    cls.WebGLCallView.display_call.apply(this, arguments);
  };

  var on_texture_data = function(msg)
  {
    var texture = msg.texture;
    var call_texture = this._object == null ?
      this._call.linked_object.texture : this._object;
    if (this._body && call_texture === texture)
    {
      this.active_tab.render();
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
    var parent = target.parentElement.parentElement;
    var x_start = evt.clientX + parent.scrollLeft;
    var y_start = evt.clientY + parent.scrollTop;

    var max_top = Math.max(0, evt.target.offsetHeight + evt.target.offsetTop * 2 - parent.clientHeight);
    var max_left = Math.max(0, evt.target.offsetWidth + evt.target.offsetLeft * 2 - parent.clientWidth);
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
  eh.mousedown["webgl-scroll-image"] = on_texture_start_drag.bind(this);
  eh.mouseup["webgl-scroll-image"] = on_texture_end_drag.bind(this);

  messages.addListener('webgl-texture-data', on_texture_data.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLTextureCallView.prototype = cls.WebGLCallView;

// ----------------------------------------------------------------------------

cls.WebGLTextureCallSummaryTab = function(id, name, container_class)
{
  this.getTextureView = function()
  {
    this._texture.request_data();
    var level0 = this._texture.levels[0];
    var content;
    if (!level0 || level0.img == null && !this._texture.mipmapped)
    {
      content = ["span", "No data."];
    }
    else
    {
      var image = window.templates.webgl.image(level0);
      content = window.templates.webgl.thumbnail_container(image);
    }
    // TODO use the right index based on setting
    return {title: "Texture", content: content, class: "texture fit"};
  };

  this.getTextureInfoView = function()
  {
    // TODO show the texture name somewhere
    var info_content = window.templates.webgl.texture_info(this._texture);
    return {title: "Texture info", content: info_content};
  };

  this.getTextureHistoryView = function()
  {
    var history_content = window.templates.webgl.history(this._texture.history);
    return {title: "History", content: history_content};
  };

  this.getAdditionalPrimaryViews = function()
  {
    return [this.getTextureView()];
  };

  this.getSecondaryViews = function()
  {
    return [this.getTextureInfoView(), this.getTextureHistoryView()];
  };

  this.set_call = function(snapshot, call_index, object)
  {
    this._texture = call_index === -1 ? object :
      snapshot.trace[call_index].linked_object.texture;
    cls.WebGLSummaryTab.set_call.apply(this, arguments);
  };

  this.init(id, name, container_class);
};

cls.WebGLTextureCallSummaryTab.prototype = cls.WebGLSummaryTab;

// ----------------------------------------------------------------------------

cls.WebGLFullTextureTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    this._texture = call_index === -1 ? object :
      snapshot.trace[call_index].linked_object.texture;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
    var texture = this._texture;
    texture.request_data();
    var level0 = texture.levels[0];
    var image;
    if (!level0 || level0.img == null && !texture.mipmapped)
    {
      image = ["span", "No data."];
    }
    else
    {
      image = window.templates.webgl.image(level0, ["full-texture"]);
      image = [
        "div", image,
        "style", "position: relative;"
      ];
    }
    this._container.clearAndRender(image);
    this.layout();
  };

  this.layout = function()
  {
    var content_height = this._container.offsetHeight;
    var content_width = this._container.offsetWidth;

    var img_container = this._container.childNodes[0];
    var img = img_container.childNodes[0];
    var top = Math.max(0, (content_height - img.offsetHeight) / 2);
    img_container.style.top = String(top) + "px";
    var left = Math.max(0, (content_width - img.offsetWidth) / 2);
    img_container.style.left = String(left) + "px";
    img_container.style.width = String(img.offsetWidth) + "px";
  };

  this.onresize = function()
  {
    this.layout();
  };

  this.init(id, name, container_class);
};

cls.WebGLFullTextureTab.prototype = cls.WebGLTab;

// ----------------------------------------------------------------------------

cls.WebGLTextureHistoryTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1)
      object = snapshot.trace[call_index].linked_object.texture;
    this._history = object.history;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.init(id, name, container_class);
};

cls.WebGLTextureHistoryTab.prototype = cls.WebGLHistoryTab;

// ----------------------------------------------------------------------------

cls.WebGLTextureMipmapTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1)
      object = snapshot.trace[call_index].linked_object.texture;
    this._texture = object;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
    var template = window.templates.webgl.mipmap_table(this._texture);
    this._container.clearAndRender(template);
  };

  this.init(id, name, container_class);
};

cls.WebGLTextureMipmapTab.prototype = cls.WebGLTab;
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
         ['p', "No textures available."],
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
    var snapshot =
      window['cst-selects']['snapshot-select'].get_selected_snapshot();
    var texture = snapshot.textures[item_id];

    window.views.webgl_texture_call.display_call(snapshot, texture.call_index, texture);
  };

  this.tabledef = {
    handler: "webgl-texture-table",
    column_order: ["call_index", "name", "dimension"],
    idgetter: function(res) { return String(res.id); },
    columns: {
      call_index : {
        label: "Call",
        sorter: function(a,b) {
          return a.call_index_val < b.call_index_val ? -1 :
            a.call_index_val > b.call_index_val ? 1 : 0;
        }
      },
      name: {
        label: "Texture",
        sorter : function (a, b) {
          var a_name = a.name.toLowerCase();
          var b_name = b.name.toLowerCase();
          return a_name < b_name ? -1 :
            a_name > b_name ? 1 : 0;
        }
      },
      dimension: {
        label: "Dimension",
        sorter: function(a,b) {
          return a.size < b.size ? -1 : a.size > b.size ? 1 : 0;
        }
      }
    },
    groups: {
      call: {
        label: "call", // TODO
        grouper : function (res) {
          return res.call_index_val === -1 ? "Start of frame" :
            "Call #" + res.call_index;
        },
        sorter : function (a, b) {
          return a.call_index_val < b.call_index_val ? -1 :
            a.call_index_val > b.call_index_val ? 1 : 0;
        }
      },
      texture: {
        label: "texture", // TODO
        grouper : function (res) { return res.name; }
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
