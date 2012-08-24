"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */
cls.WebGLDrawCallView = function(id, name, container_class)
{
  var shared_settings = {framebuffer: null};

  var summary = new cls.WebGLDrawCallSummaryTab("summary", "Summary", "scroll");
  var framebuffer = new cls.WebGLFramebufferTab("framebuffer", "Framebuffer", "scroll framebuffer-full");

  summary.settings = framebuffer.settings = shared_settings;

  this.set_tabs([
    summary,
    framebuffer,
    new cls.WebGLStateTab("state", "State", "scroll state-tab")
  ]);

  this.display_call = function(snapshot, call_index, object)
  {
    shared_settings.framebuffer = null;
    cls.WebGLCallView.display_call.apply(this, arguments);
  };

  this.init(id, name, container_class);
};
cls.WebGLDrawCallView.prototype = cls.WebGLCallView;

cls.WebGLDrawCallSummaryTab = function(id, name, container_class)
{
  this._draw_call = null;

  this.ondestroy = function()
  {
    this.settings.framebuffer = this._framebuffer;
    cls.WebGLSummaryTab.ondestroy.call(this);
  };

  this.set_call = function(snapshot, call_index)
  {
    this._framebuffer = this.settings.framebuffer;
    cls.WebGLSummaryTab.set_call.apply(this, arguments);
  };

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
    return {title: "Vertex attributes", content: buffer_display, class: "buffer-preview fit"};
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
    var uniform_content = window.templates.webgl.uniform_table(this._call_index,
      this._draw_call.program);
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


cls.WebGLFramebufferTab = function(id, name, container_class)
{
  this._framebuffer = null;

  this.ondestroy = function()
  {
    cls.WebGLTab.ondestroy.call(this);
    this.settings.framebuffer = this._framebuffer;
  };

  this.set_call = function(snapshot, call_index)
  {
    this._framebuffer = this.settings.framebuffer;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
    var framebuffers = this._snapshot.framebuffers.lookup_all(this._call_index);

    // Make sure the fbo image is downloading if isn't
    for(var f in framebuffers)
    {
      var framebuffer = framebuffers[f];
      if (!framebuffer.is_loaded())
      {
        framebuffer.request_data();
      }
    }

    var framebuffer_binding;
    if (this._framebuffer)
    {
      framebuffer_binding = this._framebuffer;
    }
    else
    {
      framebuffer_binding = this._snapshot.state.get_parameter("FRAMEBUFFER_BINDING", this._call_index);
      // Framebuffer === null => default framebuffer (framebuffers[0])
      framebuffer_binding = framebuffer_binding ? framebuffer_binding.framebuffer : framebuffers[0];
    }

    var image = window.templates.webgl.framebuffer_image(framebuffer_binding, ["full-framebuffer"]);
    var select = window.templates.webgl.framebuffer_selector(framebuffers, framebuffer_binding);
    var content = [
      select,
      [
        "div", image,
        "style", "position: relative;"
      ],
    ];

    this._container.clearAndRender(content);
    this.layout();
  };

  this.layout = function()
  {
    var content_height = this._container.offsetHeight;
    var content_width = this._container.offsetWidth;

    var img_container = this._container.lastChild;
    var img = img_container.childNodes[0];
    var top = Math.max(0, (content_height - img.offsetHeight) / 2);
    img_container.style.top = String(top) + "px";
    var left = Math.max(0, (content_width - img.offsetWidth) / 2);
    img_container.style.left = String(left) + "px";
    img_container.style.width = String(img.offsetWidth) + "px";
  };

  this.onresize = function()
  {
    this.layout();
  };

  this.init(id, name, container_class);
};
cls.WebGLFramebufferTab.prototype = cls.WebGLTab;
