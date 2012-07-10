"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLProgramView = function(id, name, container_class)
{
  this._context = null;
  this._container = null;
  this._content = null;

  this.createView = function(container)
  {
    this._container = container;

    this._render();
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.clear = function ()
  {
    this._context = null;
  };

  this._render = function()
  {
    if (this._container == null || this._content == null) return;
    this._container.clearAndRender(this._content);
    sh_highlightDocument();
  };

  this._on_context_change = function(ctx)
  {
    this._context = ctx;
  };

  this._on_error = function(error)
  {
  };

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
          var new_span = document.createElement("span");
          new_span.className = "webgl-hilight-uniform";
          new_span.appendChild(document.createTextNode(child_node.data));

          var par = child_node.parentNode;
          par.replaceChild(new_span, child_node);
        }
      }

    }
  };

  this.show_program = function(program)
  {
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_program");

    var content = [];
    this._content= window.templates.webgl.program(program);
    this._render();
  }.bind(this);

  this.show_uniform = function(program, uniform)
  {
    this.show_program(program);
    hilight_uniform(uniform);
  };

  messages.addListener('webgl-clear', this.clear.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));
  messages.addListener('webgl-error', this._on_error.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLProgramView.prototype = ViewBase;

cls.WebGLProgramView.create_ui_widgets = function()
{
  return;
  new ToolbarConfig(
    'webgl_program',

  //new CstSelectToolbarSettings
  //(
  //  'webgl_program',
  //  [
  //    'link',
  //    'visited',
  //    'hover',
  //    'active',
  //    'focus',
  //    'selection'
  //  ],
  //  'webgl_items'
  //);

    [
      {
        handler: 'refresh-webgl-buffer',
        title: "Refresh buffers",
        icon: 'reload-webgl-buffer'
      }
    ],
    null,
    null,
    [
      {
        handler: 'select-webgl-context',
        title: "Select WebGL context", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['context-select'].getTemplate()
      },
      {
        handler: 'select-webgl-context',
        title: "Select trace", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['trace-select'].getTemplate()
      }
    ]
  );
};

