"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLHeaderViewBase
 */

cls.WebGLProgramCallView = function(id, name, container_class)
{
  this._container = null;

  var hilight_uniform = function(uniform)
  {
    var regex = new RegExp("(\\s|^)(" + uniform.name + ")(\\s|$)");
    var programs = document.getElementsByClassName("sh_glsl");

    for (var i=0; i<programs.length; i++)
    {
      var program = programs[i];
      for (var j=0; j<program.childNodes.length; j++)
      {
        var child_node = program.childNodes[j];
        if (regex.test(child_node.data))
        {
          // TODO: Only wrap non-white space characters
          var new_span = document.createElement("span");
          new_span.className = "webgl-hilight-uniform";
          new_span.appendChild(document.createTextNode(child_node.data));

          var par = child_node.parentNode;
          par.replaceChild(new_span, child_node);
        }
      }

    }
  };

  this.createView = function(container)
  {
    this._container = container;
  };

  this.display_by_call = function(snapshot, call_index)
  {
    var call = snapshot.trace[call_index];
    var template = window.templates.webgl.program(call_index, call.linked_object.program);
    this.render_with_header(snapshot, call_index, template);
    sh_highlightDocument();
    if (call.linked_object.uniform) hilight_uniform(call.linked_object.uniform);
  };

  this._ondestroy = function()
  {
    this._container = null;
  };

  this.init(id, name, container_class);
};

cls.WebGLProgramCallView.prototype = cls.WebGLHeaderViewBase;


