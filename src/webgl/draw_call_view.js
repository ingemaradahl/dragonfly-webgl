"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */
cls.WebGLDrawCallView = function(id, name, container_class)
{
  this.set_tabs([
    new cls.WebGLDrawCallSummaryTab("summary", "Summary", ""),
    new cls.WebGLStateTab("state", "State", "")
  ]);

  this.init(id, name, container_class);
};
cls.WebGLDrawCallView.prototype = cls.WebGLCallView;

cls.WebGLDrawCallSummaryTab = function(id, name, container_class)
{
  this._draw_call = null;

  var render_preview = function()
  {
    var preview = window.webgl.preview;
    preview.add_canvas();

    var select = document.getElementById("webgl-attribute-selector");
    var pointer = select.options[select.selectedIndex].pointer;

    preview.set_attribute(pointer, this._state, this._element_buffer);
    preview.render();
  }.bind(this);

  this.getBufferView = function()
  {
    var buffer_display = window.templates.webgl.drawcall_buffer(this._draw_call);
    return {title: "Buffer", content: buffer_display, class: "buffer-preview"};
  };

  this.getAdditionalPrimaryViews = function()
  {
    return [this.getBufferView()];
  };

  this.getAttributeView = function()
  {
    var attribute_content = window.templates.webgl.attribute_table(this._call_index, this._draw_call.program);
    return {title: "Attributes", content: attribute_content};
  };

  this.getUniformView = function()
  {
    var uniform_content = window.templates.webgl.uniform_table(this._call_index, this._draw_call.program);
    return {title: "Uniforms", content: uniform_content};
  };

  this.getSecondaryViews = function()
  {
    return [this.getAttributeView(), this.getUniformView()];
  };

  this.renderAfter = function()
  {
    if (window.webgl.gl)
    {
      var draw_call = this._snapshot.drawcalls.get_by_call(this._call_index);
      this._element_buffer = draw_call.element_buffer;
      this._state = draw_call.parameters;
      render_preview();
    }
    cls.WebGLSummaryTab.renderAfter.call(this);
  };

  this.layoutAfter = function()
  {
    var framebuffer_item = this._container.querySelector(".framebuffer");
    var buffer_item = this._container.querySelector(".buffer-preview");
    if (!framebuffer_item || !buffer_item) return;

    var framebuffer = framebuffer_item.children[1];
    var buffer_preview = buffer_item.children[1];

    var height = framebuffer.offsetHeight - buffer_preview.children[0].offsetHeight;
    var width = framebuffer.offsetWidth;
    buffer_preview.children[1].style.width = width + "px";
    buffer_preview.children[1].style.height = height + "px";
    window.webgl.preview.onresize();
  };

  var on_attribute_select = function(event, target)
  {
    render_preview();
  };

  window.eventHandlers.change["webgl-select-attribute"] = on_attribute_select.bind(this);

  this.init(id, name, container_class);
};
cls.WebGLDrawCallSummaryTab.prototype = cls.WebGLSummaryTab;
