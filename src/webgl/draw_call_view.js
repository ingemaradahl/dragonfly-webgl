"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */
cls.WebGLDrawCallView = function(id, name, container_class)
{
  this._element_buffer = null;
  this._state = null;

  this._snapshot = null;
  this._call_index = 0;

  this.createView = function(container)
  {
    cls.WebGLCallView.createView.apply(this, arguments);

    var preview_container = new Container(document.createElement("container"));
    preview_container.setup("webgl_buffer_preview");
    this._preview_container = preview_container.cell;
  };

  var add_canvas = function()
  {
    var canvas_holder = document.getElementById("webgl-canvas-holder");
    canvas_holder.appendChild(window.webgl.gl.canvas);
    canvas_holder.appendChild(this._preview_container);

    this.onresize = window.webgl.preview.onresize.bind(window.webgl.preview);
  }.bind(this);

  var render_preview = function()
  {
    add_canvas();
    var preview = window.webgl.preview;
    var preview_help = document.getElementById("webgl-preview-help");

    var select = document.getElementById("webgl-attribute-selector");
    var pointer = select.options[select.selectedIndex].pointer;


    preview.set_help_container(preview_help);
    preview.set_info_container(this._preview_container);
    preview.set_attribute(pointer, this._state, this._element_buffer);
    preview.render();
  }.bind(this);

  var render = function()
  {
    if (!this._container || !this._snapshot) return;

    var draw_call = this._snapshot.drawcalls.get_by_call(this._call_index);
    var trace_call = this._snapshot.trace[this._call_index];

    // Make sure the fbo image is downloading if isn't but exists
    if (draw_call.fbo.img && !draw_call.fbo.img.data && !draw_call.fbo.img.downloading)
    {
      draw_call.fbo.request_data();
    }

    var draw_template = window.templates.webgl.drawcall(draw_call, trace_call);
    this.render_with_header(this._snapshot, this._call_index, draw_template);

    if (window.webgl.gl)
    {
      this._element_buffer = draw_call.element_buffer;
      this._state = draw_call.parameters;

      render_preview();
    }
  }.bind(this);

  this._render = function(snapshot, call_index)
  {
    this._snapshot = snapshot;
    this._call_index = call_index;
    render();
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

  messages.addListener('webgl-fbo-data', render.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = cls.WebGLCallView;

