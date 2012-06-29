"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLProgramView = function(id, name, container_class)
{
  this._context = null;
  this._container = null;

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
    if (!this._container)
    {
      return;
    }
    this._container.clearAndRender(
      ['pre',
       'varying highp vec2 uv;\nuniform sampler2D uTexture;\n\nvoid main(void) {\n  gl_FragColor = texture2D(uTexture, uv);\n}',
       'class', 'sh_glsl'
      ]
    );
    sh_highlightDocument();
  };

  this._on_context_change = function(ctx)
  {
    this._context = ctx;
  };

  this._on_error = function(error)
  {
  };

  messages.addListener('webgl-clear', this.clear.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));
  messages.addListener('webgl-error', this._on_error.bind(this));

  this.init(id, name, container_class);
}

cls.WebGLProgramView.prototype = ViewBase;

cls.WebGLProgramView.create_ui_widgets = function()
{
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

