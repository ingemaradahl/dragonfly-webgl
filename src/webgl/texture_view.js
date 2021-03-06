"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */
cls.WebGLTextureCallView = function(id, name, container_class)
{
  var shared_settings = {};

  var texture_mipmap = new cls.WebGLTextureMipmapTab("texture-mipmap", "Mipmaps", "scroll");
  var full_texture = new cls.WebGLFullTextureTab("full-texture", "Texture", "scroll texture");

  texture_mipmap.settings = full_texture.settings = shared_settings;

  this.set_tabs([
    new cls.WebGLTextureCallSummaryTab("summary", "Summary", "scroll"),
    full_texture,
    texture_mipmap,
    new cls.WebGLStateTab("state", "State", "scroll state-tab"),
    new cls.WebGLTextureHistoryTab("texture-history", "History", "scroll history-tab")
  ]);

  this.display_call = function(snapshot, call_index, object)
  {
    var texture = object ? object :
      snapshot.trace[call_index].linked_object.texture;
    this.set_tab_enabled(this._lookup_tab("texture-mipmap"), texture.mipmapped &&
      texture.levels.length > 1);
    cls.WebGLCallView.display_call.apply(this, arguments);
  };

  this.set_call = function(snapshot, call_index)
  {
    cls.WebGLSummaryTab.set_call.apply(this, arguments);
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
      content = window.templates.webgl.image(level0, ["thumbnail"]);
      content.push("handler", "webgl-summary-view-goto-tab");
    }

    return {
      title: "Texture",
      content: content,
      class: "texture fit",
      onclick: {
        tab: "full-texture"
      }
    };
  };

  this.getTextureInfoView = function()
  {
    var info_content = window.templates.webgl.texture_info(this._texture);
    if (info_content)
    {
      return {
        title: "Texture info",
        content: info_content
      };
    }
    else
    {
      return null;
    }
  };

  this.getAdditionalPrimaryViews = function()
  {
    return [this.getTextureView()];
  };

  this.getSecondaryViews = function()
  {
    return [this.getTextureInfoView()];
  };

  this.set_call = function(snapshot, call_index, object)
  {
    this._texture = object ? object :
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
    this._texture = object ? object :
      snapshot.trace[call_index].linked_object.texture;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
    var template = window.templates.webgl.mipmaps(this._texture,
      this.settings[this._texture]);
    this._container.clearAndRender(template);
    this.layout();
  };

  var on_select_mipmap = function(evt, target)
  {
    this.settings[this._texture] = target.selectedIndex;
    this.render();
  };

  this._from_mipmap_tab = function(target)
  {
    this.render();
  };

  this.layout = function()
  {
    var content_height = this._container.offsetHeight;
    var content_width = this._container.offsetWidth;

    var img_container = this._container.lastChild;
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

  window.eventHandlers.change["webgl-mipmap-select"] = on_select_mipmap.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLFullTextureTab.prototype = cls.WebGLTab;

// ----------------------------------------------------------------------------

cls.WebGLTextureHistoryTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1 && object == null)
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

  var on_mipmap_click = function(evt, target)
  {
    var mipmap_index = target.getAttribute("index");
    this.settings[this._texture] = parseInt(mipmap_index);
    cls.WebGLCallView.active_view.show_tab("full-texture");
  };

  window.eventHandlers.click["webgl-mipmap-click"] = on_mipmap_click.bind(this);
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
      this._table = new SortableTable(this.tabledef, null, ["name", "dimensions"], null, "call", false, "texture-table");
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
        dimensions: lvl0 && lvl0.width ? String(lvl0.width) + "×" + String(lvl0.height) : "?",
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
    column_order: ["call_index", "name", "dimensions"],
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
      dimensions: {
        label: "Dimensions",
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
