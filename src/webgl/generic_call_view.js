"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */

cls.WebGLGenericCallView = function(id, name, container_class)
{
  this._render = function(snapshot, call_index)
  {
    this.render_with_header(snapshot, call_index);
  };

  this.init(id, name, container_class);
};

cls.WebGLGenericCallView.prototype = cls.WebGLCallView;
