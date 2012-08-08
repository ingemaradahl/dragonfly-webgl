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
  this._header;
  this._tabs = [];
  this._content;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  // Argument tabs is a list of strings which represents
  // the views unique tabs.
  this._set_tabs = function(tabs)
  {
    for (var i=0; i<tabs.length; i++)
    {
      this._tabs.push(["tab", tabs[i], "id", String(i), "handler", "webgl-tab-handler"]);
    }
    return this._tabs;
  };

  this.ondestroy = function()
  {
    cls.WebGLCallView.ondestroy.apply(this, arguments);
  };


  this._render = function()
  {
    var content_width =
      this._container.offsetWidth-2; //TODO get real width   
    var content_height = 
      this._container.offsetHeight;
    
    var header = ["div", "Header", "class" ,"header"];
    var tabbar = ["div", this._tabs,
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
  
  this._long_text = function(x)
  {
    var ret;
    for (var i=0; i<x; i++)
    {
      ret = ret + "hej ";
    }
    return ret;
  };

  var eh = window.eventHandlers;
  eh.click["webgl-tab-handler"] = this._on_tab_click.bind(this);

  this._content = this._long_text(1000);
  this._tabs = this._set_tabs(["Choice 1", "Choice 2"]);
  this.init(id, name, container_class);
};

cls.WebGLTestHeaderView.prototype = ViewBase;
