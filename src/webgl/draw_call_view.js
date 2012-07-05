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

  this.createView = function(container)
  {
    this._container = container;
    this._render();
  };

  this._render = function()
  {
    this._container.clearAndRender(["div", "No draw call"]);
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  this.display_by_call = function(call)
  {
    var ctx_id = window['cst-selects']['context-select'].get_selected_context();

    // TODO: TEMPORARY
    var drawcall = webgl.snapshots[ctx_id][0].drawcalls.get_call_by_call(call);
    if (!drawcall)
    {
      this._container.innerHTML = "No framebuffer snapshot for call " + call;
      return;
    }

    var fbo = drawcall.fbo;

    if (fbo.downloading)
    {
      this._container.innerHTML = "Snapshot still downloading...";
      return;
    }

    // TODO: Only temporary of course
    this._container.innerHTML = "";
    this._container.appendChild(window.webgl.gl.canvas);
    var gl;
    if (!(gl = window.webgl.gl))
    {
      this._container.innerHTML = "WebGLContext unavailable, try using Opera Next";
      return;
    }

    gl.canvas.width = fbo.width;
    gl.canvas.height = fbo.height;
    gl.viewport(0, 0, fbo.width, fbo.height);

    var program = gl.programs["texture"];

    // Make sure we don't upload texture to GPU unnecessarily
    if (!fbo.texture || fbo.texture.gl !== gl)
    {
      fbo.texture = {};
      fbo.texture.gl = gl;
      fbo.texture.tex = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, fbo.texture.tex);

      // WebGL has limited NPOT texturing support
      // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fbo.width, fbo.height,
                    0, gl.RGBA, gl.UNSIGNED_BYTE, fbo.pixels);

      // Free pixels object
      fbo.pixels = null;
    }

    WebGLUtils.draw_texture(program, fbo.texture.tex);
  };

  this.init(id, name, container_class);
};

cls.WebGLDrawCallView.prototype = ViewBase;
