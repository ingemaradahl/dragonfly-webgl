"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */

cls.WebGLProgramCallView = function(id, name, container_class)
{
  // Can be used to hilight attributes as well
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
          // Some processing is needed to not wrap whitespace characters in the
          // hilight
          var span = document.createElement("span");
          var em = document.createElement("em");
          em.className = "search-highlight-selected";
          var non_ws = child_node.data.replace(/^\s+|\s+$/g, '');
          em.appendChild(document.createTextNode(non_ws));

          // Add whitespace before the uniform symbol
          var start_ws = child_node.data.match(/^\s+/);
          if (start_ws)
            span.appendChild(document.createTextNode(start_ws[0]));

          span.appendChild(em);

          // ..and add whitespace after the uniform symbol
          var end_ws = child_node.data.match(/\s+$/);
          if (end_ws)
            span.appendChild(document.createTextNode(end_ws));

          var par = child_node.parentNode;
          par.replaceChild(span, child_node);
        }
      }

    }
  };

  this._render = function(snapshot, call_index)
  {
    var call = snapshot.trace[call_index];
    var template = window.templates.webgl.program(call_index, call.linked_object.program);
    this.render_with_header(snapshot, call_index, template);

    sh_highlightDocument();

    // Hilight eventual uniform/attribute
    var uniattrib = call.linked_object.uniform || call.linked_object.attribute;
    if (uniattrib) hilight_uniform(uniattrib);
  };

  this.init(id, name, container_class);
};

cls.WebGLProgramCallView.prototype = cls.WebGLCallView;


