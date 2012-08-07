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

cls.WebGLState.prototype.get_all_parameters = function(call_index, include_old_value)
{
  include_old_value = Boolean(include_old_value);

  var result = {};

  for (var group in cls.WebGLState.PARAMETER_GROUPS)
  {
    var params = cls.WebGLState.PARAMETER_GROUPS[group];
    for (var i = 0; i < params.length; i++)
    {
      var param = params[i];
      result[param] = this.get_parameter(param, call_index, include_old_value);
    }
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
  "disableVertexAttribArray": "generic",
  "enableVertexAttribArray": "generic",
  "getActiveAttrib": "attrib",
  "getActiveUniform": "uniform",
  "getAttribLocation": "attrib",
  "getUniform": "uniform",
  "getUniformLocation": "uniform",
  "getVertexAttrib": "attrib",
  "getVertexAttribOffset": "attrib",
  "bindAttribLocation": "attrib",
  "uniform1f": "uniform",
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
  "drawArrays": "draw",
  "drawElements": "draw",
  "finish": "draw",
  "flush": "draw",
  "activeTexture": "activeTexture",
  "blendColor": "blend",
  "blendEquation": "blend",
  "blendEquationSeparate": "blend",
  "blendFunc": "blend",
  "blendFuncSeparate": "blend",
  "clear": "clear",
  "clearColor": "clear",
  "clearDepth": "clear",
  "colorMask": "clear",
  "clearStencil": "clear",
  "cullFace": "generic",
  "depthFunc": "depth",
  "depthMask": "depth",
  "depthRange": "depth",
  "disable": "toggle",
  "enable": "toggle",
  "isEnabled": "toggle",
  "frontFace": "frontFace",
  "getError": "empty",
  "getParameter": "empty",
  "hint": "hints",
  "lineWidth": "lineWidth",
  "pixelStorei": "pixelStore",
  "polygonOffset": "generic",
  "sampleCoverage": "generic",
  "stencilFunc": "stencil",
  "stencilFuncSeparate": "stencil",
  "stencilMask": "stencil",
  "stencilMaskSeparate": "stencil",
  "stencilOp": "stencil",
  "stencilOpSeparate": "stencil",
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
  "texParameterf": "texture",
  "texParameteri": "texture",
  "texImage2D": "texImage",
  "texSubImage2D": "texImage",
  "attachShader": "empty",
  "compileShader": "empty",
  "createProgram": "empty",
  "createShader": "empty",
  "deleteProgram": "empty",
  "deleteShader": "empty",
  "detachShader": "empty",
  "getAttachedShaders": "empty",
  "getProgramInfoLog": "empty",
  "getProgramParameter": "empty",
  "getShaderInfoLog": "empty",
  "getShaderParameter": "empty",
  "getShaderPrecisionFormat": "empty",
  "getShaderSource": "empty",
  "isProgram": "program",
  "isShader": "empty",
  "linkProgram": "program",
  "shaderSource": "empty",
  "validateProgram": "program",
  "useProgram": "program",
};

cls.WebGLState.PARAMETER_GROUPS = {
  uncategorized: [
    "ALIASED_LINE_WIDTH_RANGE",
    "ALIASED_POINT_SIZE_RANGE",
    "COLOR_WRITEMASK",
    "CULL_FACE",
    "CULL_FACE_MODE",
    "DITHER",
    "POLYGON_OFFSET_FACTOR",
    "POLYGON_OFFSET_FILL",
    "POLYGON_OFFSET_UNITS",
    "SAMPLES",
    "SAMPLE_BUFFERS",
    "SAMPLE_COVERAGE_INVERT",
    "SAMPLE_COVERAGE_VALUE",
    "SUBPIXEL_BITS",
    "SCISSOR_TEST"
  ],
  activeTexture: [
    "ACTIVE_TEXTURE",
    "TEXTURE_BINDING_2D",
    "TEXTURE_BINDING_CUBE_MAP"
  ],
  attrib: [
    "ARRAY_BUFFER_BINDING",
    "CURRENT_PROGRAM"
  ],
  blend: [
    "BLEND",
    "BLEND_COLOR",
    "BLEND_DST_ALPHA",
    "BLEND_DST_RGB",
    "BLEND_EQUATION_ALPHA",
    "BLEND_EQUATION_RGB",
    "BLEND_SRC_ALPHA",
    "BLEND_SRC_RGB",
  ],
  buffer: [
    "ARRAY_BUFFER_BINDING",
    "ELEMENT_ARRAY_BUFFER_BINDING"
  ],
  clear: [
    "COLOR_CLEAR_VALUE",
    "DEPTH_CLEAR_VALUE",
    "STENCIL_CLEAR_VALUE"
  ],
  constants: [
    "ALPHA_BITS",
    "RED_BITS",
    "GREEN_BITS",
    "BLUE_BITS",
    "DEPTH_BITS",
    "NUM_COMPRESSED_TEXTURE_FORMATS",
    "COMPRESSED_TEXTURE_FORMATS",
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
  depth: [
    "DEPTH_FUNC",
    "DEPTH_RANGE",
    "DEPTH_WRITEMASK",
    "DEPTH_TEST"
  ],
  draw: [
    "ELEMENT_ARRAY_BUFFER_BINDING",
    "ARRAY_BUFFER_BINDING",
    "CURRENT_PROGRAM",
    "FRAMEBUFFER_BINDING"
  ],
  empty: [
  ],
  framebuffer: [
    "FRAMEBUFFER_BINDING",
  ],
  frontFace: [
    "FRONT_FACE",
  ],
  hints: [
    "GENERATE_MIPMAP_HINT",
  ],
  lineWidth: [
    "LINE_WIDTH",
  ],
  pixelStore: [
    "PACK_ALIGNMENT",
    "UNPACK_ALIGNMENT",
    "UNPACK_COLORSPACE_CONVERSION_WEBGL",
    "UNPACK_FLIP_Y_WEBGL",
    "UNPACK_PREMULTIPLY_ALPHA_WEBGL"
  ],
  program: [
    "CURRENT_PROGRAM"
  ],
  renderbuffer: [
    "RENDERBUFFER_BINDING",
  ],
  stencil: [
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
  ],
  texture: [
    "TEXTURE_BINDING_2D",
    "TEXTURE_BINDING_CUBE_MAP"
  ],
  texImage: [
    "TEXTURE_BINDING_2D",
    "TEXTURE_BINDING_CUBE_MAP",
    "PACK_ALIGNMENT",
    "UNPACK_ALIGNMENT",
    "UNPACK_COLORSPACE_CONVERSION_WEBGL",
    "UNPACK_FLIP_Y_WEBGL",
    "UNPACK_PREMULTIPLY_ALPHA_WEBGL"
  ],
  toggle: [
    "CULL_FACE",
    "BLEND",
    "DITHER",
    "SCISSOR_TEST",
    "STENCIL_TEST",
    "DEPTH_TEST",
    "POLYGON_OFFSET_FILL"
  ],
  uniform: [
    "CURRENT_PROGRAM"
  ],
  viewport: [
    "VIEWPORT",
    "SCISSOR_BOX"
  ]
};
