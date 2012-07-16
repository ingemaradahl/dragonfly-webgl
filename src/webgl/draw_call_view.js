"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLDrawCallView = function(id, name, container_class)
{
  this._container = null;
  this._element_buffer = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  var add_canvas = function()
  {
    var canvas_holder = document.getElementById("webgl-canvas-holder");
    canvas_holder.appendChild(window.webgl.gl.canvas);

    // TODO temporary
    window.webgl.gl.canvas.width = 250;
    window.webgl.gl.canvas.height = 250;
  };

  var render_preview = function()
  {
    add_canvas();
    var preview = window.webgl.preview;

    var select = document.getElementById("webgl-attribute-selector");
    var attribute = select.options[select.selectedIndex].attribute;

    preview.set_program(window.webgl.gl.programs.buffer);
    preview.set_attribute(attribute, this._element_buffer);
    preview.render();
  }.bind(this);

  this._render = function()
  {
    this._container.clearAndRender(["div", "No draw call"]);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.display_by_call = function(trace_call, call, draw_call)
  {
    var draw_template = window.templates.webgl.drawcall(draw_call, trace_call);
    
    this.render_with_header(trace_call, call, draw_template);
    
    if (draw_call && window.webgl.gl)
    {
      this._element_buffer = draw_call.element_buffer;
      render_preview();
    }

    return;
  };

  var on_attribute_select = function(evt, target)
  {
    render_preview()
  };

  var on_buffer_click = function(evt, target)
  {
    target.buffer.show();
  };

  
  this._on_argument_click = function(evt, target)
  {
    target.arg.action();
  };


  var eh = window.eventHandlers;
  eh.click["webgl-select-attribute"] = on_attribute_select.bind(this);
  eh.click["webgl-drawcall-buffer"] = on_buffer_click.bind(this);
  eh.click["webgl-draw-argument"] = this._on_argument_click.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = cls.WebGLHeaderViewBase;

