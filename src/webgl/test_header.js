"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */

cls.WebGLTestHeaderView = function(id, name, container_class)
{
  this._container;
  this._content;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this.ondestroy = function()
  {
    cls.WebGLCallView.ondestroy.apply(this, arguments);
  };

  this._long_text = function(x)
  {
    var ret;
    for (var i=0; i<x; i++)
    {
      ret = ret + "hej ";
    }
    return ret;
  };

  this._render = function()
  {
    var content_width =
      this._container.offsetWidth-2; //TODO get real width   
    var content_height = 
      this._container.offsetHeight;
    
    var header = ["div", "Header", "class" ,"header"];
    var tabbar = ["div",
        ["tab", "Choice 1", "id", "1", "handler", "webgl-tab-handler"],
        ["tab", "Choice 2", "id", "2", "handler", "webgl-tab-handler"],
        ["tab", "Choice 3", "id", "3", "handler", "webgl-tab-handler"],
        ["div", "style", "clear:both;"],
        "class", "tabs"
      ];

    var content = ["div", this._content, "class", "content", 
      "style", "width:" + content_width + "px;" + "overflow:auto;"];
    var template = ["div", header,tabbar, content];


    this._container.clearAndRender(template);
    
    var header_height = this._container.querySelector(".header").offsetHeight;
    var tabbar_height = this._container.querySelector(".tabs").offsetHeight;
    content_height -= header_height + tabbar_height;
  
    this._container.querySelector(".content").style.height = content_height +"px";
 
  };

  this.onresize = function()
  {
    this._render();
  };

  this._on_tab_click = function(evt, target)
  {
    this._content = target.textContent + this._long_text(1000); 
    this._render();
  };

  var eh = window.eventHandlers;
  eh.click["webgl-tab-handler"] = this._on_tab_click.bind(this);

  this._content = this._long_text(1000);
  this.init(id, name, container_class);
};

cls.WebGLTestHeaderView.prototype = ViewBase;
