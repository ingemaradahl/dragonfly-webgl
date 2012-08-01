"use strict";

window.cls || (window.cls = {});

cls.WebGLState = function ()
{
};

cls.WebGLState.prototype.get_parameter = function(param_name, call_index, include_old_value)
{
  var param = this[param_name];
  if (call_index == null || call_index === -1) return param[-1];

  var max_call = -1;
  var second_max_call = -1;
  for (var c in param)
  {
    if (!param.hasOwnProperty(c)) continue;

    var call = Number(c);
    if (call <= call_index && max_call < call)
    {
      second_max_call = max_call;
      max_call = call;
    }
  }

  if (!include_old_value) return param[max_call];

  var result = {value: param[max_call]};
  if (max_call === call_index && second_max_call !== max_call)
  {
    result.old_value = param[second_max_call];
  }

  return result;
};

cls.WebGLState.prototype.get_function_parameters = function(function_name, call_index, include_old_value)
{
  include_old_value = Boolean(include_old_value);
  var group = cls.WebGLState.FUNCTION_GROUPS[function_name];
  var params = cls.WebGLState.PARAMETER_GROUPS[group];
  if (params == null) params = cls.WebGLState.PARAMETER_GROUPS.uncategorized; // TODO remove when we have correct groups

  var result = {};
  for (var i = 0; i < params.length; i++)
  {
    var param = params[i];
    result[param] = this.get_parameter(param, call_index, include_old_value);
  }

  return result;
};

cls.WebGLState.FUNCTION_GROUPS = {
  "disableVertexAttribArray": "attrib",
  "enableVertexAttribArray": "attrib",
  "getActiveAttrib": "attrib",
  "getActiveUniform": "uniform",
  "getAttribLocation": "attrib",
  "getUniform": "uniform",
  "getUniformLocation": "uniform",
  "getVertexAttrib": "attrib",
  "getVertexAttribOffset": "attrib",
  "uniform": "uniform",
  "uniform1fv": "uniform",
  "uniform1i": "uniform",
  "uniform1iv": "uniform",
  "uniform2f": "uniform",
  "uniform2fv": "uniform",
  "uniform2i": "uniform",
  "uniform2iv": "uniform",
  "uniform3f": "uniform",
  "uniform3fv": "uniform",
  "uniform3i": "uniform",
  "uniform3iv": "uniform",
  "uniform4f": "uniform",
  "uniform4fv": "uniform",
  "uniform4i": "uniform",
  "uniform4iv": "uniform",
  "uniformMatrix": "uniform",
  "uniformMatrix2fv": "uniform",
  "uniformMatrix3fv": "uniform",
  "uniformMatrix4fv": "uniform",
  "vertexAttrib": "attrib",
  "vertexAttrib1f": "attrib",
  "vertexAttrib1fv": "attrib",
  "vertexAttrib2f": "attrib",
  "vertexAttrib2fv": "attrib",
  "vertexAttrib3f": "attrib",
  "vertexAttrib3fv": "attrib",
  "vertexAttrib4f": "attrib",
  "vertexAttrib4fv": "attrib",
  "vertexAttribPointer": "attrib",
  "clear": "clear",
  "drawArrays": "draw",
  "drawElements": "draw",
  "finish": "draw",
  "flush": "draw",
  "activeTexture": "generic",
  "blendColor": "generic",
  "blendEquation": "generic",
  "blendEquationSeparate": "generic",
  "blendFunc": "generic",
  "blendFuncSeparate": "generic",
  "clearColor": "generic",
  "clearDepth": "generic",
  "clearStencil": "generic",
  "colorMask": "generic",
  "cullFace": "generic",
  "depthFunc": "generic",
  "depthMask": "generic",
  "depthRange": "generic",
  "disable": "generic",
  "enable": "generic",
  "frontFace": "generic",
  "getError": "generic",
  "getParameter": "generic",
  "hint": "generic",
  "isEnabled": "generic",
  "lineWidth": "generic",
  "pixelStorei": "generic",
  "polygonOffset": "generic",
  "sampleCoverage": "generic",
  "stencilFunc": "generic",
  "stencilFuncSeparate": "generic",
  "stencilMask": "generic",
  "stencilMaskSeparate": "generic",
  "stencilOp": "generic",
  "stencilOpSeparate": "generic",
  "scissor": "viewport",
  "viewport": "viewport",
  "bindBuffer": "buffer",
  "bufferData": "buffer",
  "bufferSubData": "buffer",
  "createBuffer": "buffer",
  "deleteBuffer": "buffer",
  "getBufferParameter": "buffer",
  "isBuffer": "buffer",
  "bindFramebuffer": "framebuffer",
  "checkFramebufferStatus": "framebuffer",
  "createFramebuffer": "framebuffer",
  "deleteFramebuffer": "framebuffer",
  "framebufferRenderbuffer": "framebuffer",
  "framebufferTexture2D": "framebuffer",
  "getFramebufferAttachmentParameter": "framebuffer",
  "isFramebuffer": "framebuffer",
  "bindRenderbuffer": "renderbuffer",
  "createRenderbuffer": "renderbuffer",
  "deleteRenderbuffer": "renderbuffer",
  "getRenderbufferParameter": "renderbuffer",
  "isRenderbuffer": "renderbuffer",
  "renderbufferStorage": "renderbuffer",
  "bindTexture": "texture",
  "compressedTexImage2D": "texture",
  "compressedTexSubImage2D": "texture",
  "copyTexImage2D": "texture",
  "copyTexSubImage2D": "texture",
  "createTexture": "texture",
  "deleteTexture": "texture",
  "generateMipmap": "texture",
  "getTexParameter": "texture",
  "isTexture": "texture",
  "texImage2D": "texture",
  "texParameterf": "texture",
  "texParameteri": "texture",
  "texSubImage2D": "texture",
  "attachShader": "shader",
  "bindAttribLocation": "attrib",
  "compileShader": "shader",
  "createProgram": "shader",
  "createShader": "shader",
  "deleteProgram": "shader",
  "deleteShader": "shader",
  "detachShader": "shader",
  "getAttachedShaders": "shader",
  "getProgramInfoLog": "shader",
  "getProgramParameter": "shader",
  "getShaderInfoLog": "shader",
  "getShaderParameter": "shader",
  "getShaderPrecisionFormat": "shader",
  "getShaderSource": "shader",
  "isProgram": "shader",
  "isShader": "shader",
  "linkProgram": "shader",
  "shaderSource": "shader",
  "useProgram": "shader",
  "validateProgram": "shader"
};

cls.WebGLState.PARAMETER_GROUPS = {
  uncategorized: [
    "ALIASED_LINE_WIDTH_RANGE",
    "ALIASED_POINT_SIZE_RANGE",
    "ALPHA_BITS",
    "BLEND",
    "BLEND_COLOR",
    "BLEND_DST_ALPHA",
    "BLEND_DST_RGB",
    "BLEND_EQUATION_ALPHA",
    "BLEND_EQUATION_RGB",
    "BLEND_SRC_ALPHA",
    "BLEND_SRC_RGB",
    "BLUE_BITS",
    "COLOR_WRITEMASK",
    "COMPRESSED_TEXTURE_FORMATS",
    "CULL_FACE",
    "CULL_FACE_MODE",
    "CURRENT_PROGRAM",
    "DEPTH_BITS",
    "DEPTH_FUNC",
    "DEPTH_RANGE",
    "DEPTH_TEST",
    "DEPTH_WRITEMASK",
    "DITHER",
    "FRAMEBUFFER_BINDING",
    "FRONT_FACE",
    "GENERATE_MIPMAP_HINT",
    "GREEN_BITS",
    "LINE_WIDTH",
    "NUM_COMPRESSED_TEXTURE_FORMATS",
    "PACK_ALIGNMENT",
    "POLYGON_OFFSET_FACTOR",
    "POLYGON_OFFSET_FILL",
    "POLYGON_OFFSET_UNITS",
    "RED_BITS",
    "RENDERBUFFER_BINDING",
    "SAMPLES",
    "SAMPLE_BUFFERS",
    "SAMPLE_COVERAGE_INVERT",
    "SAMPLE_COVERAGE_VALUE",
    "STENCIL_BACK_FAIL",
    "STENCIL_BACK_FUNC",
    "STENCIL_BACK_PASS_DEPTH_FAIL",
    "STENCIL_BACK_PASS_DEPTH_PASS",
    "STENCIL_BACK_REF",
    "STENCIL_BACK_VALUE_MASK",
    "STENCIL_BACK_WRITEMASK",
    "STENCIL_BITS",
    "STENCIL_FAIL",
    "STENCIL_FUNC",
    "STENCIL_PASS_DEPTH_FAIL",
    "STENCIL_PASS_DEPTH_PASS",
    "STENCIL_REF",
    "STENCIL_TEST",
    "STENCIL_VALUE_MASK",
    "STENCIL_WRITEMASK",
    "SUBPIXEL_BITS",
    "UNPACK_ALIGNMENT",
    "UNPACK_COLORSPACE_CONVERSION_WEBGL",
    "UNPACK_FLIP_Y_WEBGL",
    "UNPACK_PREMULTIPLY_ALPHA_WEBGL"
  ],
  viewport: [
    "VIEWPORT",
    "SCISSOR_BOX",
    "SCISSOR_TEST"
  ],
  buffer: [
    "ARRAY_BUFFER_BINDING",
    "ELEMENT_ARRAY_BUFFER_BINDING"
  ],
  constants: [
    "MAX_COMBINED_TEXTURE_IMAGE_UNITS",
    "MAX_CUBE_MAP_TEXTURE_SIZE",
    "MAX_RENDERBUFFER_SIZE",
    "MAX_FRAGMENT_UNIFORM_VECTORS",
    "MAX_TEXTURE_IMAGE_UNITS",
    "MAX_TEXTURE_SIZE",
    "MAX_VARYING_VECTORS",
    "MAX_VERTEX_ATTRIBS",
    "MAX_VERTEX_TEXTURE_IMAGE_UNITS",
    "MAX_VERTEX_UNIFORM_VECTORS",
    "MAX_VIEWPORT_DIMS",
    "RENDERER",
    "SHADING_LANGUAGE_VERSION",
    "VENDOR",
    "VERSION"
  ],
  clear: [
    "COLOR_CLEAR_VALUE",
    "DEPTH_CLEAR_VALUE",
    "STENCIL_CLEAR_VALUE"
  ],
  texture: [
    "ACTIVE_TEXTURE",
    "TEXTURE_BINDING_2D",
    "TEXTURE_BINDING_CUBE_MAP"
  ],
  attrib: [
    "ARRAY_BUFFER_BINDING",
    "CURRENT_PROGRAM"
  ],
  draw: [
    "ARRAY_BUFFER_BINDING",
    "FRAMEBUFFER_BINDING",
    "ELEMENT_ARRAY_BUFFER_BINDING"
  ]
};
