"use strict";

window.cls = window.cls || {};

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  
  this.createView = function(container)
  {
    console.log("view created");
    window.services["ecmascript-debugger"].onConsoleLog = function (status, message) {
      alert(message);
    };
    
  };

  this.ondestroy = function() {
    console.log("view destroyed");

    window.services["ecmascript-debugger"].onConsoleLog = function (status, message) {};

  };

  this.init(id, name, container_class);
};

cls.WebGLTraceView.prototype = ViewBase;

