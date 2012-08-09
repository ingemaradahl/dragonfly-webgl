"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */

cls.WebGLGenericCallView = function(id, name, container_class)
{
  this.set_tabs([
    new cls.WebGLGenericCallSummaryTab("summary", "Summary", "")
  ]);

  this.init(id, name, container_class);
};

cls.WebGLGenericCallView.prototype = cls.WebGLCallView2;


cls.WebGLGenericCallSummaryTab = function(id, name, container_class)
{
  this.init(id, name, container_class);
};
cls.WebGLGenericCallSummaryTab.prototype = cls.WebGLSummaryTab;
