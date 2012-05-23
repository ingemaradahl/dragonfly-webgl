"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  this._state = null;

  this.createView = function(container)
  {
    // TODO temporary
    window.services["ecmascript-debugger"].onConsoleLog = function (status, message)
    {
      alert(message);
    };
  };

  this.ondestroy = function() 
  {
    window.services["ecmascript-debugger"].onConsoleLog = function (status, message) {};
  };

  this.init(id, name, container_class);
};

cls.WebGLTraceView.prototype = ViewBase;



cls.WebGLStateView = function(id, name, container_class)
{
  this._state = null;

  this.createView = function(container)
  {
    // TODO temporary
    this._state = new cls.WebGLState();
    this._state.get_state();
    // Determine if execution is paused
    //   > if not, smart stuff
    // Get state

  };

  this.ondestroy = function() 
  {

  };

  this.init(id, name, container_class);
}

cls.WebGLStateView.prototype = ViewBase;

