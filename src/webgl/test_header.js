"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */

cls.WebGLContentView = Object.create(ViewBase, {
  _container: {
    writable: true,
    value: null
  },
  _content_header: {
    writable: true,
    value: null
  },
  _content_tabs: {
    writable: true,
    value: null
  },
  _content_body: {
    writable: true,
    value: null
  },
  createView: {
    writable: true,
    value : function(container)
    {
      this._container = container;
      this._render_base();

      this._createView(container.children[0], container.children[2]);
    }
  },
  ondestroy: {
    writable: true,
    value: function()
    {
      this._container = null;
    }
  },
  _render_base: {
    value: function()
    {
      var header = ["div"];
      var tabbar = ["div", this._content_tabs, ["div", "style", "clear:both;"], "class", "tabs"];

      var content = ["div", [], "class", "scroll"];
      var template = [header, tabbar, content];

      this._container.clearAndRender(template);

      this.onresize();
    }
  },
  _render_header: {
    value: function(template)
    {
      this._content_header = template;
      if (this._container)
      {
        this._container.childNodes[0].clearAndRender(template);
        this.onresize();
      }
    }
  },
  _render_tabbar: {
    value: function(template)
    {
      this._content_tabs = template;
      if (this._container)
      {
        this._container.childNodes[1].clearAndRender(template);
        this.onresize();
      }
    }
  },
  onresize: {
    writable: true, configurable: true,
    value: function()
    {
      var content_height = this._container.offsetHeight;
      var header_height = this._container.childNodes[0].offsetHeight;
      var tabbar_height = this._container.childNodes[1].offsetHeight;
      content_height -= header_height + tabbar_height;

      var content_width = this._container.offsetWidth - 2; //TODO get real width

      this._container.childNodes[2].style.height = content_height + "px";
      this._container.childNodes[2].style.width = content_width + "px";

      this._onresize();
    }
  }
});
