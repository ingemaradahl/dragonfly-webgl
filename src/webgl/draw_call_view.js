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
  this._state = null;

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  var add_canvas = function()
  {
    var canvas_holder = document.getElementById("webgl-canvas-holder");
    canvas_holder.appendChild(window.webgl.gl.canvas);

    this.onresize = window.webgl.preview.onresize.bind(window.webgl.preview);
  }.bind(this);

  var render_preview = function()
  {
    add_canvas();
    var preview = window.webgl.preview;

    var select = document.getElementById("webgl-attribute-selector");
    var attribute = select.options[select.selectedIndex].attribute;

    preview.set_program(window.webgl.gl.programs.buffer);
    preview.set_attribute(attribute, this._state, this._element_buffer);
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

  this.display_by_call = function(snapshot, call_index)
  {
    var draw_call = snapshot.drawcalls.get_by_call(call_index);
    var trace_call = snapshot.trace[call_index];

    var draw_template = window.templates.webgl.drawcall(draw_call, trace_call);

    this.render_with_header(snapshot, call_index, draw_template);

    if (draw_call && window.webgl.gl)
    {
      this._element_buffer = draw_call.element_buffer;
      var state = {
        indexed : trace_call.function_name === "drawElements",
        mode : trace_call.args[0],
      };

      if (state.indexed)
      {
        state.count = trace_call.args[1];
        state.offset = trace_call.args[3];
      }
      else
      {
        state.first = trace_call.args[1];
        state.count = trace_call.args[2];
      }

      this._state = state;

      render_preview();
    }

    return;
  };

  var on_attribute_select = function(evt, target)
  {
    render_preview();
  };

  var on_buffer_click = function(evt, target)
  {
    target.buffer.show();
  };


  this._on_argument_click = function(evt, target)
  {
    target.argument.action();
  };


  var eh = window.eventHandlers;
  eh.click["webgl-select-attribute"] = on_attribute_select.bind(this);
  eh.click["webgl-drawcall-buffer"] = on_buffer_click.bind(this);
  eh.click["webgl-draw-argument"] = this._on_argument_click.bind(this);

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = cls.WebGLHeaderViewBase;

