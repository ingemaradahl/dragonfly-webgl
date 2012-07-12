"use strict";

window.cls || (window.cls = {});

/*
 * Contains information about the WebGL functions, such as their return type,
 * names and types of parameters. Is used to display a more informative trace.
 */
cls.WebGLAPI = function ()
{
  this.functions = {};

  this.add_function = function(name, returnType, args)
  {
    if (args === undefined && typeof(returnType) === "object")
    {
      this.functions[name] = returnType;
    }
    else
    {
      this.functions[name] = new GLFunction(name, returnType, args);
    }
  };

  this.TYPES = {
      ARRAY: 0,     // array of values (tightly packed)
      BITMASK: 1,   // 32bit boolean mask
      BOOL: 2,
      COLOR: 3,     // 4 floats
      COLORMASK: 4, // 4 bools
      ENUM: 5,      // a specific enum
      FLOAT: 6,
      LONG: 7,
      MATRIX: 8,    // 2x2, 3x3, or 4x4 matrix
      OBJECT: 9,    // some WebGL object (texture/program/etc)
      RANGE: 10,    // 2 floats
      RECT: 11,     // x, y, w, h (array with 4 values)
      STRING: 12,   // some arbitrary string
      ULONG: 13,
      WH: 14        // width x height (array with 2 values)
  };

  this.function_call_to_string = function(function_name, args)
  {
    if (!(function_name in this.functions))
    {
      return function_name + "(" + args.join(", ") + ")";
    }

    var fn = this.functions[function_name];
    return fn.generate_string(args);
  };

  this.function_arguments_to_objects = function(function_name, args)
  {
    if (!(function_name in this.functions))
    {
      return []; // TODO not ideal
    }

    var fn = this.functions[function_name];
    return fn.get_argument_objects(args);
  };

  this.function_argument_to_string = function(function_name, parameter_name, value)
  {
    if (!(function_name in this.functions)) return value;

    var param = this.functions[function_name].get_parameter(parameter_name);
    if (param == null) return value;
    return param.generate_string(value);
  };

  this.function_argument_to_object = function(function_name, parameter_name, value)
  {
    if (!(function_name in this.functions)) return value;

    var param = this.functions[function_name].get_parameter(parameter_name);
    if (param == null) return value;
    return param.get_object(value);
  };


  // Returns a string with the url to the specification of webgl a function
  // on the khronos site.
  this.function_to_speclink = function(function_name)
  {
    var webgl_functions = {
      getContextAttributes: '5.14.2',
      activeTexture: '5.14.3',
      blendColor: '5.14.3',
      blendEquation: '5.14.3',
      blendEquationSeparate: '5.14.3',
      blendFunc: '5.14.3',
      blendFuncSeparate: '5.14.3',
      clearColor: '5.14.3',
      clearDepth: '5.14.3',
      clearStencil: '5.14.3',
      colorMask: '5.14.3',
      cullFace: '5.14.3',
      depthFunc: '5.14.3',
      depthMask: '5.14.3',
      depthRange: '5.14.3',
      disable: '5.14.3',
      enable: '5.14.3',
      frontFace: '5.14.3',
      getParameter: '5.14.3',
      getError: '5.14.3',
      hint: '5.14.3',
      isEnabled: '5.14.3',
      lineWidth: '5.14.3',
      pixelStorei: '5.14.3',
      polygonOffset: '5.14.3',
      sampleCoverage: '5.14.3',
      stencilFunc: '5.14.3',
      stencilFuncSeparate: '5.14.3',
      stencilMask: '5.14.3',
      stencilMaskSeparate: '5.14.3',
      stencilOp: '5.14.3',
      stencilOpSeparate: '5.14.3',
      scissor: '5.14.4',
      viewport: '5.14.4',
      bindBuffer: '5.14.5',
      bufferData: '5.14.5',
      bufferSubData: '5.14.5',
      createBuffer: '5.14.5',
      deleteBuffer: '5.14.5',
      getBufferParameter: '5.14.5',
      isBuffer: '5.14.5',
      bindFramebuffer: '5.14.6',
      checkFramebufferStatus: '5.14.6',
      createFramebuffer: '5.14.6',
      deleteFramebuffer: '5.14.6',
      framebufferRenderbuffer: '5.14.6',
      framebufferTexture2D: '5.14.6',
      getFramebufferAttachmentParameter: '5.14.6',
      isFramebuffer: '5.14.6',
      bindRenderbuffer: '5.14.7',
      createRenderbuffer: '5.14.7',
      deleteRenderbuffer: '5.14.7',
      getRenderbufferParameter: '5.14.7',
      isRenderbuffer: '5.14.7',
      renderbufferStorage: '5.14.7',
      bindTexture: '5.14.8',
      compressedTexImage2D: '5.14.8',
      compressedTexSubImage2D: '5.14.8',
      copyTexImage2D: '5.14.8',
      copyTexSubImage2D: '5.14.8',
      createTexture: '5.14.8',
      deleteTexture: '5.14.8',
      generateMipmap: '5.14.8',
      getTexParameter: '5.14.8',
      isTexture: '5.14.8',
      texImage2D: '5.14.8',
      texParameterf: '5.14.8',
      texParameteri: '5.14.8',
      texSubImage2D: '5.14.8',
      attachShader: '5.14.9',
      bindAttribLocation: '5.14.9',
      uniform1fv: '5.14.10',
      uniform1i: '5.14.10',
      uniform1iv: '5.14.10',
      uniform2f: '5.14.10',
      uniform2fv: '5.14.10',
      uniform2i: '5.14.10',
      uniform2iv: '5.14.10',
      uniform3f: '5.14.10',
      uniform3fv: '5.14.10',
      uniform3i: '5.14.10',
      uniform3iv: '5.14.10',
      uniform4f: '5.14.10',
      uniform4fv: '5.14.10',
      uniform4i: '5.14.10',
      uniform4iv: '5.14.10',
      uniformMatrix2fv: '5.14.10',
      uniformMatrix3fv: '5.14.10',
      uniformMatrix4fv: '5.14.10',
      vertexAttrib1f: '5.14.10',
      vertexAttrib1fv: '5.14.10',
      vertexAttrib2f: '5.14.10',
      vertexAttrib2fv: '5.14.10',
      vertexAttrib3f: '5.14.10',
      vertexAttrib3fv: '5.14.10',
      vertexAttrib4f: '5.14.10',
      vertexAttrib4fv: '5.14.10',
      vertexAttribPointer: '5.14.10',
      compileShader: '5.14.9',
      createProgram: '5.14.9',
      createShader: '5.14.9',
      deleteProgram: '5.14.9',
      deleteShader: '5.14.9',
      detachShader: '5.14.9',
      getAttachedShaders: '5.14.9',
      getProgramParameter: '5.14.9',
      getProgramInfoLog: '5.14.9',
      getShaderParameter: '5.14.9',
      getShaderPrecisionFormat: '5.14.9',
      getShaderInfoLog: '5.14.9',
      getShaderSource: '5.14.9',
      isProgram: '5.14.9',
      isShader: '5.14.9',
      linkProgram: '5.14.9',
      shaderSource: '5.14.9',
      useProgram: '5.14.9',
      validateProgram: '5.14.9',
      disableVertexAttribArray: '5.14.14',
      enableVertexAttribArray: '5.14.10',
      getActiveAttrib: '5.14.10',
      getActiveUniform: '5.14.10',
      getAttribLocation: '5.14.10',
      getUniform: '5.14.10',
      getUniformLocation: '5.14.10',
      getVertexAttrib: '5.14.10',
      getVertexAttribOffset: '5.14.10',
      uniform: '5.14.10',
      uniformMatrix: '5.14.10',
      vertexAttrib: '5.14.10',
      getExtension: '5.14.14',
      clear: '5.14.11',
      drawArrays: '5.14.11',
      drawElements: '5.14.11',
      readPixels: '5.14.12',
      finish: '5.14.11',
      flush: '5.14.11'
    };

    var anchor = webgl_functions[function_name];
    if (anchor != null)
    {
      return "http://www.khronos.org/registry/webgl/specs/latest/#" + anchor;
    }
    return null;
  };

  // TODO: temporary solution since the constants are not in the prototype of WebGLContext.
  var webgl_constants = {
    ACTIVE_ATTRIBUTES: 35721,
    ACTIVE_TEXTURE: 34016,
    ACTIVE_UNIFORMS: 35718,
    ALIASED_LINE_WIDTH_RANGE: 33902,
    ALIASED_POINT_SIZE_RANGE: 33901,
    ALPHA: 6406,
    ALPHA_BITS: 3413,
    ALWAYS: 519,
    ARRAY_BUFFER: 34962,
    ARRAY_BUFFER_BINDING: 34964,
    ATTACHED_SHADERS: 35717,
    BACK: 1029,
    BLEND: 3042,
    BLEND_COLOR: 32773,
    BLEND_DST_ALPHA: 32970,
    BLEND_DST_RGB: 32968,
    BLEND_EQUATION: 32777,
    BLEND_EQUATION_ALPHA: 34877,
    BLEND_EQUATION_RGB: 32777,
    BLEND_SRC_ALPHA: 32971,
    BLEND_SRC_RGB: 32969,
    BLUE_BITS: 3412,
    BOOL: 35670,
    BOOL_VEC2: 35671,
    BOOL_VEC3: 35672,
    BOOL_VEC4: 35673,
    BROWSER_DEFAULT_WEBGL: 37444,
    BUFFER_SIZE: 34660,
    BUFFER_USAGE: 34661,
    BYTE: 5120,
    CCW: 2305,
    CLAMP_TO_EDGE: 33071,
    COLOR_ATTACHMENT0: 36064,
    COLOR_BUFFER_BIT: 16384,
    COLOR_CLEAR_VALUE: 3106,
    COLOR_WRITEMASK: 3107,
    COMPILE_STATUS: 35713,
    COMPRESSED_TEXTURE_FORMATS: 34467,
    CONSTANT_ALPHA: 32771,
    CONSTANT_COLOR: 32769,
    CONTEXT_LOST_WEBGL: 37442,
    CULL_FACE: 2884,
    CULL_FACE_MODE: 2885,
    CURRENT_PROGRAM: 35725,
    CURRENT_VERTEX_ATTRIB: 34342,
    CW: 2304,
    DECR: 7683,
    DECR_WRAP: 34056,
    DELETE_STATUS: 35712,
    DEPTH_ATTACHMENT: 36096,
    DEPTH_BITS: 3414,
    DEPTH_BUFFER_BIT: 256,
    DEPTH_CLEAR_VALUE: 2931,
    DEPTH_COMPONENT: 6402,
    DEPTH_COMPONENT16: 33189,
    DEPTH_FUNC: 2932,
    DEPTH_RANGE: 2928,
    DEPTH_STENCIL: 34041,
    DEPTH_STENCIL_ATTACHMENT: 33306,
    DEPTH_TEST: 2929,
    DEPTH_WRITEMASK: 2930,
    DITHER: 3024,
    DONT_CARE: 4352,
    DST_ALPHA: 772,
    DST_COLOR: 774,
    DYNAMIC_DRAW: 35048,
    ELEMENT_ARRAY_BUFFER: 34963,
    ELEMENT_ARRAY_BUFFER_BINDING: 34965,
    EQUAL: 514,
    FASTEST: 4353,
    FLOAT: 5126,
    FLOAT_MAT2: 35674,
    FLOAT_MAT3: 35675,
    FLOAT_MAT4: 35676,
    FLOAT_VEC2: 35664,
    FLOAT_VEC3: 35665,
    FLOAT_VEC4: 35666,
    FRAGMENT_SHADER: 35632,
    FRAMEBUFFER: 36160,
    FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
    FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
    FRAMEBUFFER_BINDING: 36006,
    FRAMEBUFFER_COMPLETE: 36053,
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
    FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
    FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
    FRAMEBUFFER_UNSUPPORTED: 36061,
    FRONT: 1028,
    FRONT_AND_BACK: 1032,
    FRONT_FACE: 2886,
    FUNC_ADD: 32774,
    FUNC_REVERSE_SUBTRACT: 32779,
    FUNC_SUBTRACT: 32778,
    GENERATE_MIPMAP_HINT: 33170,
    GEQUAL: 518,
    GREATER: 516,
    GREEN_BITS: 3411,
    HIGH_FLOAT: 36338,
    HIGH_INT: 36341,
    INCR: 7682,
    INCR_WRAP: 34055,
    INT: 5124,
    INT_VEC2: 35667,
    INT_VEC3: 35668,
    INT_VEC4: 35669,
    INVALID_ENUM: 1280,
    INVALID_FRAMEBUFFER_OPERATION: 1286,
    INVALID_OPERATION: 1282,
    INVALID_VALUE: 1281,
    INVERT: 5386,
    KEEP: 7680,
    LEQUAL: 515,
    LESS: 513,
    LINEAR: 9729,
    LINEAR_MIPMAP_LINEAR: 9987,
    LINEAR_MIPMAP_NEAREST: 9985,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    LINE_WIDTH: 2849,
    LINK_STATUS: 35714,
    LOW_FLOAT: 36336,
    LOW_INT: 36339,
    LUMINANCE: 6409,
    LUMINANCE_ALPHA: 6410,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
    MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
    MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
    MAX_RENDERBUFFER_SIZE: 34024,
    MAX_TEXTURE_IMAGE_UNITS: 34930,
    MAX_TEXTURE_SIZE: 3379,
    MAX_VARYING_VECTORS: 36348,
    MAX_VERTEX_ATTRIBS: 34921,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
    MAX_VERTEX_UNIFORM_VECTORS: 36347,
    MAX_VIEWPORT_DIMS: 3386,
    MEDIUM_FLOAT: 36337,
    MEDIUM_INT: 36340,
    MIRRORED_REPEAT: 33648,
    NEAREST: 9728,
    NEAREST_MIPMAP_LINEAR: 9986,
    NEAREST_MIPMAP_NEAREST: 9984,
    NEVER: 512,
    NICEST: 4354,
    NONE: 0,
    NOTEQUAL: 517,
    NO_ERROR: 0,
    ONE: 1,
    ONE_MINUS_CONSTANT_ALPHA: 32772,
    ONE_MINUS_CONSTANT_COLOR: 32770,
    ONE_MINUS_DST_ALPHA: 773,
    ONE_MINUS_DST_COLOR: 775,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE_MINUS_SRC_COLOR: 769,
    OUT_OF_MEMORY: 1285,
    PACK_ALIGNMENT: 3333,
    POINTS: 0,
    POLYGON_OFFSET_FACTOR: 32824,
    POLYGON_OFFSET_FILL: 32823,
    POLYGON_OFFSET_UNITS: 10752,
    RED_BITS: 3410,
    RENDERBUFFER: 36161,
    RENDERBUFFER_ALPHA_SIZE: 36179,
    RENDERBUFFER_BINDING: 36007,
    RENDERBUFFER_BLUE_SIZE: 36178,
    RENDERBUFFER_DEPTH_SIZE: 36180,
    RENDERBUFFER_GREEN_SIZE: 36177,
    RENDERBUFFER_HEIGHT: 36163,
    RENDERBUFFER_INTERNAL_FORMAT: 36164,
    RENDERBUFFER_RED_SIZE: 36176,
    RENDERBUFFER_STENCIL_SIZE: 36181,
    RENDERBUFFER_WIDTH: 36162,
    RENDERER: 7937,
    REPEAT: 10497,
    REPLACE: 7681,
    RGB: 6407,
    RGB5_A1: 32855,
    RGB565: 36194,
    RGBA: 6408,
    RGBA4: 32854,
    SAMPLER_2D: 35678,
    SAMPLER_CUBE: 35680,
    SAMPLES: 32937,
    SAMPLE_ALPHA_TO_COVERAGE: 32926,
    SAMPLE_BUFFERS: 32936,
    SAMPLE_COVERAGE: 32928,
    SAMPLE_COVERAGE_INVERT: 32939,
    SAMPLE_COVERAGE_VALUE: 32938,
    SCISSOR_BOX: 3088,
    SCISSOR_TEST: 3089,
    SHADER_COMPILER: 36346,
    SHADER_TYPE: 35663,
    SHADING_LANGUAGE_VERSION: 35724,
    SHORT: 5122,
    SRC_ALPHA: 770,
    SRC_ALPHA_SATURATE: 776,
    SRC_COLOR: 768,
    STATIC_DRAW: 35044,
    STENCIL_ATTACHMENT: 36128,
    STENCIL_BACK_FAIL: 34817,
    STENCIL_BACK_FUNC: 34816,
    STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
    STENCIL_BACK_PASS_DEPTH_PASS: 34819,
    STENCIL_BACK_REF: 36003,
    STENCIL_BACK_VALUE_MASK: 36004,
    STENCIL_BACK_WRITEMASK: 36005,
    STENCIL_BITS: 3415,
    STENCIL_BUFFER_BIT: 1024,
    STENCIL_CLEAR_VALUE: 2961,
    STENCIL_FAIL: 2964,
    STENCIL_FUNC: 2962,
    STENCIL_INDEX: 6401,
    STENCIL_INDEX8: 36168,
    STENCIL_PASS_DEPTH_FAIL: 2965,
    STENCIL_PASS_DEPTH_PASS: 2966,
    STENCIL_REF: 2967,
    STENCIL_TEST: 2960,
    STENCIL_VALUE_MASK: 2963,
    STENCIL_WRITEMASK: 2968,
    STREAM_DRAW: 35040,
    SUBPIXEL_BITS: 3408,
    TEXTURE: 5890,
    TEXTURE0: 33984,
    TEXTURE1: 33985,
    TEXTURE2: 33986,
    TEXTURE3: 33987,
    TEXTURE4: 33988,
    TEXTURE5: 33989,
    TEXTURE6: 33990,
    TEXTURE7: 33991,
    TEXTURE8: 33992,
    TEXTURE9: 33993,
    TEXTURE10: 33994,
    TEXTURE11: 33995,
    TEXTURE12: 33996,
    TEXTURE13: 33997,
    TEXTURE14: 33998,
    TEXTURE15: 33999,
    TEXTURE16: 34000,
    TEXTURE17: 34001,
    TEXTURE18: 34002,
    TEXTURE19: 34003,
    TEXTURE20: 34004,
    TEXTURE21: 34005,
    TEXTURE22: 34006,
    TEXTURE23: 34007,
    TEXTURE24: 34008,
    TEXTURE25: 34009,
    TEXTURE26: 34010,
    TEXTURE27: 34011,
    TEXTURE28: 34012,
    TEXTURE29: 34013,
    TEXTURE30: 34014,
    TEXTURE31: 34015,
    TEXTURE_2D: 3553,
    TEXTURE_BINDING_2D: 32873,
    TEXTURE_BINDING_CUBE_MAP: 34068,
    TEXTURE_CUBE_MAP: 34067,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
    TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TRIANGLES: 4,
    TRIANGLE_FAN: 6,
    TRIANGLE_STRIP: 5,
    UNPACK_ALIGNMENT: 3317,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
    UNPACK_FLIP_Y_WEBGL: 37440,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_INT: 5125,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_SHORT_4_4_4_4: 32819,
    UNSIGNED_SHORT_5_5_5_1: 32820,
    UNSIGNED_SHORT_5_6_5: 33635,
    VALIDATE_STATUS: 35715,
    VENDOR: 7936,
    VERSION: 7938,
    VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
    VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
    VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
    VERTEX_ATTRIB_ARRAY_POINTER: 34373,
    VERTEX_ATTRIB_ARRAY_SIZE: 34339,
    VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
    VERTEX_ATTRIB_ARRAY_TYPE: 34341,
    VERTEX_SHADER: 35633,
    VIEWPORT: 2978,
    ZERO: 0
  };

  var webgl_constants_back = {};
  for (var key in webgl_constants)
  {
    if (!webgl_constants.hasOwnProperty(key)) continue;
    webgl_constants_back[webgl_constants[key]] = key;
  }

  /**
   * Converts a numeric value to the WebGL property name.
   * If the value does not match a property then the value will be returned as
   * a String.
   */
  this.constant_value_to_string = function(value)
  {
    var str = webgl_constants_back[value];
    return str != null ? str : String(value);
  };

  // --------------------------

  function GLFunction(name, returnType, args, draw)
  {
    this.name = name;
    this.returnType = returnType;
    this.args = args;
    this.draw = draw === true;
  }

  GLFunction.prototype.generate_string = function(args, withType)
  {
    withType = withType === true;
    var type = this.returnType == null ? "void" : this.returnType;
    var text;
    if (withType) text = type + " " + this.name + "(";
    else text = this.name + "(";

    var arrs = [];
    for (var i = 0; i < args.length; i++)
    {
      var arr = this.args[i];
      var value = args[i];

      arrs.push(arr.generate_string(value));
    }

    return text + arrs.join(", ") + ")";
  };

  GLFunction.prototype.get_argument_objects = function(args)
  {
    var arrs = [];
    for (var i = 0; i < args.length; i++)
    {
      var arr = this.args[i];
      var value = args[i];

      arrs.push(arr.get_object(value));
    }

    return arrs;
  };

  GLFunction.prototype.get_parameter = function(parameter_name)
  {
    for (var i = 0; i < this.args.length; i++)
    {
      if (this.args[i].name === parameter_name) return this.args[i];
    }
    return null;
  };
  /**
   * Handle functions with multiple definitions, where the number of parameters differ.
   * Same types as in GLFunction but the args parameter is of type [[GLParam]].
   */
  function GLFunctionMulti(){
    GLFunction.apply(this, arguments);
  }

  GLFunctionMulti.prototype = new GLFunction();
  GLFunctionMulti.prototype.constructor = GLFunctionMulti;

  GLFunctionMulti.prototype.generate_string = function(args)
  {
    var type = this.returnType == null ? "void" : this.returnType;
    var text = type + " " + this.name + "(";

    var arrs = [];
    for (var i = 0; i < this.args.length; i++)
    {
      if (this.args[i].length === args.length)
      {
        for (var j = 0; j < args.length; j++)
        {
          var arr = this.args[i][j];
          var value = args[j];

          arrs.push(arr.generate_string(value));
        }
        break;
      }
    }

    // If there where no match above just use the param values as output.
    if (arrs.length === 0) arrs = args;

    return text + arrs.join(", ") + ")";
  };

  GLFunctionMulti.prototype.get_argument_objects = function(args)
  {
    var arrs = [];
    for (var i = 0; i < this.args.length; i++)
    {
      if (this.args[i].length === args.length)
      {
        for (var j = 0; j < args.length; j++)
        {
          var arr = this.args[i][j];
          var value = args[j];

          arrs.push(arr.get_object(value));
        }
        break;
      }
    }

    return arrs;
  };

  // --------------------------

  function GLParam(name, type)
  {
    this.name = name;
    this.type = type;
  }

  GLParam.prototype.generate_string = function(value)
  {
    if (typeof(value) === "object" && value.text != null) return value.text;
    return String(value);
  };

  GLParam.prototype.get_object = function(value)
  {
    if (typeof(value) === "object")
    {
      return value;
    }

    return {text: this.generate_string(value)};
  };

  // --------------------------

  function GLParamEnum(name, type, values)
  {
    GLParam.call(this, name, type);
    this.values = values;
  }

  GLParamEnum.prototype = new GLParam();
  GLParamEnum.prototype.constructor = GLParamEnum;

  GLParamEnum.prototype.generate_string = function(value)
  {
    for (var key in this.values)
    {
      if (this.values.hasOwnProperty(key) &&
          webgl_constants[this.values[key]] === value)
      {
        return this.values[key];
      }
    }

    if (value in webgl_constants_back)
    {
      return webgl_constants_back[value];
    }
    return String(value);
  };

  // --------------------------

  function GLParamBitmask(name, type, values)
  {
    GLParam.call(this, name, type);
    this.values = values;
  }

  GLParamBitmask.prototype = new GLParam();
  GLParamBitmask.prototype.constructor = GLParamBitmask;

  GLParamBitmask.prototype.generate_string = function(value)
  {
    var bits = [];
    for (var key in this.values)
    {
      if (this.values.hasOwnProperty(key) &&
          webgl_constants[this.values[key]] & value)
      {
        bits.push(this.values[key]);
      }
    }

    if (bits.length === 0)
    {
      if (value in webgl_constants_back)
      {
        return webgl_constants_back[value];
      }
      return String(value);
    }
    // TODO: better error handling, perhaps check that all bits that are set in value also is in the bits array.
    return bits.join(" | ");
  };


  // --------------------------

  var colorParams = [
      new GLParam("red", this.TYPES.FLOAT),
      new GLParam("green", this.TYPES.FLOAT),
      new GLParam("blue", this.TYPES.FLOAT),
      new GLParam("alpha", this.TYPES.FLOAT)
    ];

  var textureTypesEnum = ["UNSIGNED_BYTE", "UNSIGNED_SHORT_5_6_5", "UNSIGNED_SHORT_4_4_4_4", "UNSIGNED_SHORT_5_5_5_1", "FLOAT", "HALF_FLOAT_OES", "UNSIGNED_SHORT", "UNSIGNED_INT"];

  var texParamNames = ["TEXTURE_MAG_FILTER", "TEXTURE_MIN_FILTER", "TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "TEXTURE_MAX_ANISOTROPY_EXT"];

  // Values below are partially borrowed from WebGL inspector.
  this.add_function("activeTexture", null, [
    new GLParamEnum("texture", this.TYPES.ENUM, ["TEXTURE0", "TEXTURE1", "TEXTURE2", "TEXTURE3", "TEXTURE4", "TEXTURE5", "TEXTURE6", "TEXTURE7", "TEXTURE8", "TEXTURE9", "TEXTURE10", "TEXTURE11", "TEXTURE12", "TEXTURE13", "TEXTURE14", "TEXTURE15", "TEXTURE16", "TEXTURE17", "TEXTURE18", "TEXTURE19", "TEXTURE20", "TEXTURE21", "TEXTURE22", "TEXTURE23", "TEXTURE24", "TEXTURE25", "TEXTURE26", "TEXTURE27", "TEXTURE28", "TEXTURE29", "TEXTURE30", "TEXTURE31"])
  ]);
  this.add_function("attachShader", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("bindAttribLocation", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("index", this.TYPES.LONG),
    new GLParam("name", this.TYPES.STRING)
  ]);
  this.add_function("bindBuffer", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"]),
    new GLParam("buffer", this.TYPES.OBJECT)
  ]);
  this.add_function("bindFramebuffer", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["FRAMEBUFFER"]),
    new GLParam("framebuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("bindRenderbuffer", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["RENDERBUFFER"]),
    new GLParam("renderbuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("bindTexture", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"]),
    new GLParam("texture", this.TYPES.OBJECT)
  ]);
  this.add_function("blendColor", null, colorParams);
  this.add_function("blendEquation", null, [
    new GLParamEnum("mode", this.TYPES.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"])
  ]);
  this.add_function("blendEquationSeparate", null, [
    new GLParamEnum("modeRGB", this.TYPES.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"]),
    new GLParamEnum("modeAlpha", this.TYPES.ENUM, ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"])
  ]);
  this.add_function("blendFunc", null, [
    new GLParamEnum("sfactor", this.TYPES.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"]),
    new GLParamEnum("dfactor", this.TYPES.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"])
  ]);
  this.add_function("blendFuncSeparate", null, [
    new GLParamEnum("srcRGB", this.TYPES.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"]),
    new GLParamEnum("dstRGB", this.TYPES.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"]),
    new GLParamEnum("srcAlpha", this.TYPES.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"]),
    new GLParamEnum("dstAlpha", this.TYPES.ENUM, ["ZERO", "ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", "ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", "CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA"])
  ]);
  this.add_function("bufferData", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"]),
    new GLParam("sizeOrData", this.TYPES.OBJECT),
    new GLParamEnum("usage", this.TYPES.ENUM, ["STREAM_DRAW", "STATIC_DRAW", "DYNAMIC_DRAW"])
  ]);
  this.add_function("bufferSubData", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"]),
    new GLParam("offset", this.TYPES.ULONG),
    new GLParam("data", this.TYPES.OBJECT)
  ]);
  this.add_function("checkFramebufferStatus", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["FRAMEBUFFER"])
  ]);
  this.add_function("clear", null, [
    new GLParamBitmask("mask", this.TYPES.BITMASK, ["COLOR_BUFFER_BIT", "DEPTH_BUFFER_BIT", "STENCIL_BUFFER_BIT"])
  ]);
  this.add_function("clearColor", null, colorParams);
  this.add_function("clearDepth", null, [
    new GLParam("depth", this.TYPES.FLOAT)
  ]);
  this.add_function("clearStencil", null, [
    new GLParam("s", this.TYPES.LONG)
  ]);
  this.add_function("colorMask", null, [
      new GLParam("red", this.TYPES.FLOAT),
      new GLParam("green", this.TYPES.FLOAT),
      new GLParam("blue", this.TYPES.FLOAT),
      new GLParam("alpha", this.TYPES.FLOAT)
  ]);
  this.add_function("compileShader", null, [
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("copyTexImage2D", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"]),
    new GLParam("level", this.TYPES.LONG),
    new GLParamEnum("internalformat", this.TYPES.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA"]),
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("width", this.TYPES.LONG),
    new GLParam("height", this.TYPES.LONG),
    new GLParam("border", this.TYPES.LONG)
  ]);
  this.add_function("copyTexSubImage2D", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"]),
    new GLParam("level", this.TYPES.LONG),
    new GLParam("xoffset", this.TYPES.LONG),
    new GLParam("yoffset", this.TYPES.LONG),
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("width", this.TYPES.LONG),
    new GLParam("height", this.TYPES.LONG)
  ]);
  this.add_function("createBuffer", null, [
  ]);
  this.add_function("createFramebuffer", null, [
  ]);
  this.add_function("createProgram", null, [
  ]);
  this.add_function("createRenderbuffer", null, [
  ]);
  this.add_function("createShader", null, [
    new GLParamEnum("type", this.TYPES.ENUM, ["VERTEX_SHADER", "FRAGMENT_SHADER"])
  ]);
  this.add_function("createTexture", null, [
  ]);
  this.add_function("cullFace", null, [
    new GLParamEnum("mode", this.TYPES.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"])
  ]);
  this.add_function("deleteBuffer", null, [
    new GLParam("buffer", this.TYPES.OBJECT)
  ]);
  this.add_function("deleteFramebuffer", null, [
    new GLParam("framebuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("deleteProgram", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("deleteRenderbuffer", null, [
    new GLParam("renderbuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("deleteShader", null, [
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("deleteTexture", null, [
    new GLParam("texture", this.TYPES.OBJECT)
  ]);
  this.add_function("depthFunc", null, [
    new GLParamEnum("func", this.TYPES.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"])
  ]);
  this.add_function("depthMask", null, [
    new GLParam("flag", this.TYPES.BOOL)
  ]);
  this.add_function("depthRange", null, [
    new GLParam("zNear", this.TYPES.FLOAT),
    new GLParam("zFar", this.TYPES.FLOAT)
  ]);
  this.add_function("detachShader", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("disable", null, [
    new GLParamEnum("cap", this.TYPES.ENUM, ["BLEND", "CULL_FACE", "DEPTH_TEST", "DITHER", "POLYGON_OFFSET_FILL", "SAMPLE_ALPHA_TO_COVERAGE", "SAMPLE_COVERAGE", "SCISSOR_TEST", "STENCIL_TEST"])
  ]);
  this.add_function("disableVertexAttribArray", null, [
    new GLParam("index", this.TYPES.LONG)
  ]);
  this.add_function("drawArrays", null, [
    new GLParamEnum("mode", this.TYPES.ENUM, ["POINTS", "LINE_STRIP", "LINE_LOOP", "LINES", "TRIANGLES", "TRIANGLE_STRIP", "TRIANGLE_FAN"]),
    new GLParam("first", this.TYPES.LONG),
    new GLParam("count", this.TYPES.LONG)
  ], true);
  this.add_function("drawElements", null, [
    new GLParamEnum("mode", this.TYPES.ENUM, ["POINTS", "LINE_STRIP", "LINE_LOOP", "LINES", "TRIANGLES", "TRIANGLE_STRIP", "TRIANGLE_FAN"]),
    new GLParam("count", this.TYPES.LONG),
    new GLParamEnum("type", this.TYPES.ENUM, ["UNSIGNED_BYTE", "UNSIGNED_SHORT", "UNSIGNED_INT"]),
    new GLParam("offset", this.TYPES.LONG)
  ], true);
  this.add_function("enable", null, [
    new GLParamEnum("cap", this.TYPES.ENUM, ["BLEND", "CULL_FACE", "DEPTH_TEST", "DITHER", "POLYGON_OFFSET_FILL", "SAMPLE_ALPHA_TO_COVERAGE", "SAMPLE_COVERAGE", "SCISSOR_TEST", "STENCIL_TEST"])
  ]);
  this.add_function("enableVertexAttribArray", null, [
    new GLParam("index", this.TYPES.LONG)
  ]);
  this.add_function("finish", null, [
  ]);
  this.add_function("flush", null, [
  ]);
  this.add_function("framebufferRenderbuffer", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["FRAMEBUFFER"]),
    new GLParamEnum("attachment", this.TYPES.ENUM, ["COLOR_ATTACHMENT0", "DEPTH_ATTACHMENT", "STENCIL_ATTACHMENT"]),
    new GLParamEnum("renderbuffertarget", this.TYPES.ENUM, ["RENDERBUFFER"]),
    new GLParam("renderbuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("framebufferTexture2D", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["FRAMEBUFFER", "DEPTH_ATTACHMENT"]),
    new GLParamEnum("attachment", this.TYPES.ENUM, ["COLOR_ATTACHMENT0", "DEPTH_ATTACHMENT", "STENCIL_ATTACHMENT"]),
    new GLParamEnum("textarget", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"]),
    new GLParam("texture", this.TYPES.OBJECT),
    new GLParam("level", this.TYPES.LONG)
  ]);
  this.add_function("frontFace", null, [
    new GLParamEnum("mode", this.TYPES.ENUM, ["CW", "CCW"])
  ]);
  this.add_function("generateMipmap", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"])
  ]);
  this.add_function("getActiveAttrib", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("index", this.TYPES.LONG)
  ]);
  this.add_function("getActiveUniform", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("index", this.TYPES.LONG)
  ]);
  this.add_function("getAttachedShaders", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("getAttribLocation", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("name", this.TYPES.STRING)
  ]);
  this.add_function("getParameter", null, [
    new GLParamEnum("pname", this.TYPES.ENUM, ["ACTIVE_TEXTURE", "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE", "ALPHA_BITS", "ARRAY_BUFFER_BINDING", "BLEND", "BLEND_COLOR", "BLEND_DST_ALPHA", "BLEND_DST_RGB", "BLEND_EQUATION_ALPHA", "BLEND_EQUATION_RGB", "BLEND_SRC_ALPHA", "BLEND_SRC_RGB", "BLUE_BITS", "COLOR_CLEAR_VALUE", "COLOR_WRITEMASK", "COMPRESSED_TEXTURE_FORMATS", "CULL_FACE", "CULL_FACE_MODE", "CURRENT_PROGRAM", "DEPTH_BITS", "DEPTH_CLEAR_VALUE", "DEPTH_FUNC", "DEPTH_RANGE", "DEPTH_TEST", "DEPTH_WRITEMASK", "DITHER", "ELEMENT_ARRAY_BUFFER_BINDING", "FRAGMENT_SHADER_DERIVATIVE_HINT_OES", "FRAMEBUFFER_BINDING", "FRONT_FACE", "GENERATE_MIPMAP_HINT", "GREEN_BITS", "IMPLEMENTATION_COLOR_READ_FORMAT", "IMPLEMENTATION_COLOR_READ_TYPE", "LINE_WIDTH", "MAX_COMBINED_TEXTURE_IMAGE_UNITS", "MAX_CUBE_MAP_TEXTURE_SIZE", "MAX_FRAGMENT_UNIFORM_VECTORS", "MAX_RENDERBUFFER_SIZE", "MAX_TEXTURE_IMAGE_UNITS", "MAX_TEXTURE_SIZE", "MAX_VARYING_VECTORS", "MAX_VERTEX_ATTRIBS", "MAX_VERTEX_TEXTURE_IMAGE_UNITS", "MAX_VERTEX_UNIFORM_VECTORS", "MAX_VIEWPORT_DIMS", "NUM_COMPRESSED_TEXTURE_FORMATS", "PACK_ALIGNMENT", "POLYGON_OFFSET_FACTOR", "POLYGON_OFFSET_FILL", "POLYGON_OFFSET_UNITS", "RED_BITS", "RENDERBUFFER_BINDING", "RENDERER", "SAMPLE_BUFFERS", "SAMPLE_COVERAGE_INVERT", "SAMPLE_COVERAGE_VALUE", "SAMPLES", "SCISSOR_BOX", "SCISSOR_TEST", "SHADING_LANGUAGE_VERSION", "STENCIL_BACK_FAIL", "STENCIL_BACK_FUNC", "STENCIL_BACK_PASS_DEPTH_FAIL", "STENCIL_BACK_PASS_DEPTH_PASS", "STENCIL_BACK_REF", "STENCIL_BACK_VALUE_MASK", "STENCIL_BACK_WRITEMASK", "STENCIL_BITS", "STENCIL_CLEAR_VALUE", "STENCIL_FAIL", "STENCIL_FUNC", "STENCIL_PASS_DEPTH_FAIL", "STENCIL_PASS_DEPTH_PASS", "STENCIL_REF", "STENCIL_TEST", "STENCIL_VALUE_MASK", "STENCIL_WRITEMASK", "SUBPIXEL_BITS", "TEXTURE_BINDING_2D", "TEXTURE_BINDING_CUBE_MAP", "UNPACK_ALIGNMENT", "UNPACK_COLORSPACE_CONVERSION_WEBGL", "UNPACK_FLIP_Y_WEBGL", "UNPACK_PREMULTIPLY_ALPHA_WEBGL", "VENDOR", "VERSION", "VIEWPORT", "MAX_TEXTURE_MAX_ANISOTROPY_EXT"])
  ]);
  this.add_function("getBufferParameter", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER"]),
    new GLParamEnum("pname", this.TYPES.ENUM, ["BUFFER_SIZE", "BUFFER_USAGE"])
  ]);
  this.add_function("getError", null, [
  ]);
  this.add_function("getSupportedExtensions", null, [
  ]);
  this.add_function("getExtension", null, [
    new GLParam("name", this.TYPES.STRING)
  ]);
  this.add_function("getFramebufferAttachmentParameter", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["FRAMEBUFFER"]),
    new GLParamEnum("attachment", this.TYPES.ENUM, ["COLOR_ATTACHMENT0", "DEPTH_ATTACHMENT", "STENCIL_ATTACHMENT"]),
    new GLParamEnum("pname", this.TYPES.ENUM, ["FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE", "FRAMEBUFFER_ATTACHMENT_OBJECT_NAME", "FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL", "FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE"])
  ]);
  this.add_function("getProgramParameter", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParamEnum("pname", this.TYPES.ENUM, ["DELETE_STATUS", "LINK_STATUS", "VALIDATE_STATUS", "INFO_LOG_LENGTH", "ATTACHED_SHADERS", "ACTIVE_ATTRIBUTES", "ACTIVE_ATTRIBUTE_MAX_LENGTH", "ACTIVE_UNIFORMS", "ACTIVE_UNIFORM_MAX_LENGTH"])
  ]);
  this.add_function("getProgramInfoLog", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("getRenderbufferParameter", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["RENDERBUFFER"]),
    new GLParamEnum("pname", this.TYPES.ENUM, ["RENDERBUFFER_WIDTH", "RENDERBUFFER_HEIGHT", "RENDERBUFFER_INTERNAL_FORMAT", "RENDERBUFFER_RED_SIZE", "RENDERBUFFER_GREEN_SIZE", "RENDERBUFFER_BLUE_SIZE", "RENDERBUFFER_ALPHA_SIZE", "RENDERBUFFER_DEPTH_SIZE", "RENDERBUFFER_STENCIL_SIZE"])
  ]);
  this.add_function("getShaderParameter", null, [
    new GLParam("shader", this.TYPES.OBJECT),
    new GLParamEnum("pname", this.TYPES.ENUM, ["SHADER_TYPE", "DELETE_STATUS", "COMPILE_STATUS", "INFO_LOG_LENGTH", "SHADER_SOURCE_LENGTH"])
  ]);
  this.add_function("getShaderInfoLog", null, [
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("getShaderSource", null, [
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("getTexParameter", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"]),
    new GLParamEnum("pname", this.TYPES.ENUM, ["TEXTURE_MAG_FILTER", "TEXTURE_MIN_FILTER", "TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "TEXTURE_MAX_ANISOTROPY_EXT"])
  ]);
  this.add_function("getUniform", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("location", this.TYPES.OBJECT)
  ]);
  this.add_function("getUniformLocation", null, [
    new GLParam("program", this.TYPES.OBJECT),
    new GLParam("name", this.TYPES.STRING)
  ]);
  this.add_function("getVertexAttrib", null, [
    new GLParam("index", this.TYPES.LONG),
    new GLParamEnum("pname", this.TYPES.ENUM, ["VERTEX_ATTRIB_ARRAY_BUFFER_BINDING", "VERTEX_ATTRIB_ARRAY_ENABLED", "VERTEX_ATTRIB_ARRAY_SIZE", "VERTEX_ATTRIB_ARRAY_STRIDE", "VERTEX_ATTRIB_ARRAY_TYPE", "VERTEX_ATTRIB_ARRAY_NORMALIZED", "CURRENT_VERTEX_ATTRIB"])
  ]);
  this.add_function("getVertexAttribOffset", null, [
    new GLParam("index", this.TYPES.LONG),
    new GLParamEnum("pname", this.TYPES.ENUM, ["VERTEX_ATTRIB_ARRAY_POINTER"])
  ]);
  this.add_function("hint", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["GENERATE_MIPMAP_HINT", "FRAGMENT_SHADER_DERIVATIVE_HINT_OES"]),
    new GLParamEnum("mode", this.TYPES.ENUM, ["FASTEST", "NICEST", "DONT_CARE"])
  ]);
  this.add_function("isBuffer", null, [
    new GLParam("buffer", this.TYPES.OBJECT)
  ]);
  this.add_function("isEnabled", null, [
    new GLParamEnum("cap", this.TYPES.ENUM, ["BLEND", "CULL_FACE", "DEPTH_TEST", "DITHER", "POLYGON_OFFSET_FILL", "SAMPLE_ALPHA_TO_COVERAGE", "SAMPLE_COVERAGE", "SCISSOR_TEST", "STENCIL_TEST"])
  ]);
  this.add_function("isFramebuffer", null, [
    new GLParam("framebuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("isProgram", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("isRenderbuffer", null, [
    new GLParam("renderbuffer", this.TYPES.OBJECT)
  ]);
  this.add_function("isShader", null, [
    new GLParam("shader", this.TYPES.OBJECT)
  ]);
  this.add_function("isTexture", null, [
    new GLParam("texture", this.TYPES.OBJECT)
  ]);
  this.add_function("lineWidth", null, [
    new GLParam("width", this.TYPES.FLOAT)
  ]);
  this.add_function("linkProgram", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("pixelStorei", null, [
    new GLParamEnum("pname", this.TYPES.ENUM, ["PACK_ALIGNMENT", "UNPACK_ALIGNMENT", "UNPACK_COLORSPACE_CONVERSION_WEBGL", "UNPACK_FLIP_Y_WEBGL", "UNPACK_PREMULTIPLY_ALPHA_WEBGL"]),
    new GLParam("param", this.TYPES.LONG)
  ]);
  this.add_function("polygonOffset", null, [
    new GLParam("factor", this.TYPES.FLOAT),
    new GLParam("units", this.TYPES.FLOAT)
  ]);
  this.add_function("readPixels", null, [
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("width", this.TYPES.LONG),
    new GLParam("height", this.TYPES.LONG),
    new GLParamEnum("format", this.TYPES.ENUM, ["ALPHA", "RGB", "RGBA"]),
    new GLParamEnum("type", this.TYPES.ENUM, ["UNSIGNED_BYTE", "UNSIGNED_SHORT_5_6_5", "UNSIGNED_SHORT_4_4_4_4", "UNSIGNED_SHORT_5_5_5_1"]),
    new GLParam("pixels", this.TYPES.OBJECT)
  ]);
  this.add_function("renderbufferStorage", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["RENDERBUFFER"]),
    new GLParamEnum("internalformat", this.TYPES.ENUM, ["RGBA4", "RGB565", "RGB5_A1", "DEPTH_COMPONENT16", "STENCIL_INDEX8"]),
    new GLParam("width", this.TYPES.LONG),
    new GLParam("height", this.TYPES.LONG)
  ]);
  this.add_function("sampleCoverage", null, [
    new GLParam("value", this.TYPES.FLOAT),
    new GLParam("invert", this.TYPES.BOOL)
  ]);
  this.add_function("scissor", null, [
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("width", this.TYPES.LONG),
    new GLParam("height", this.TYPES.LONG)
  ]);
  this.add_function("shaderSource", null, [
    new GLParam("shader", this.TYPES.OBJECT),
    new GLParam("source", this.TYPES.STRING)
  ]);
  this.add_function("stencilFunc", null, [
    new GLParamEnum("func", this.TYPES.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"]),
    new GLParam("ref", this.TYPES.LONG),
    new GLParamBitmask("mask", this.TYPES.BITMASK)
  ]);
  this.add_function("stencilFuncSeparate", null, [
    new GLParamEnum("face", this.TYPES.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"]),
    new GLParamEnum("func", this.TYPES.ENUM, ["NEVER", "LESS", "LEQUAL", "GREATER", "GEQUAL", "EQUAL", "NOTEQUAL", "ALWAYS"]),
    new GLParam("ref", this.TYPES.LONG),
    new GLParamBitmask("mask", this.TYPES.BITMASK)
  ]);
  this.add_function("stencilMask", null, [
    new GLParamBitmask("mask", this.TYPES.BITMASK)
  ]);
  this.add_function("stencilMaskSeparate", null, [
    new GLParamEnum("face", this.TYPES.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"]),
    new GLParamBitmask("mask", this.TYPES.BITMASK)
  ]);
  this.add_function("stencilOp", null, [
    new GLParamEnum("fail", this.TYPES.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"]),
    new GLParamEnum("zfail", this.TYPES.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"]),
    new GLParamEnum("zpass", this.TYPES.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])
  ]);
  this.add_function("stencilOpSeparate", null, [
    new GLParamEnum("face", this.TYPES.ENUM, ["FRONT", "BACK", "FRONT_AND_BACK"]),
    new GLParamEnum("fail", this.TYPES.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"]),
    new GLParamEnum("zfail", this.TYPES.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"]),
    new GLParamEnum("zpass", this.TYPES.ENUM, ["KEEP", "ZERO", "REPLACE", "INCR", "INCR_WRAP", "DECR", "DECR_WRAP", "INVERT"])
  ]);

  var texImageSharedParams = [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"]),
    new GLParam("level", this.TYPES.LONG),
    new GLParamEnum("internalformat", this.TYPES.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA", "DEPTH_COMPONENT"])
  ];

  this.add_function("texImage2D", new GLFunctionMulti("texImage2D", null, [
    texImageSharedParams.concat([
      new GLParam("width", this.TYPES.LONG),
      new GLParam("height", this.TYPES.LONG),
      new GLParam("border", this.TYPES.LONG),
      new GLParamEnum("format", this.TYPES.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA", "DEPTH_COMPONENT"]),
      new GLParamEnum("type", this.TYPES.ENUM, textureTypesEnum),
      new GLParam("pixels", this.TYPES.ARRAY)
    ]),
    texImageSharedParams.concat([
      new GLParamEnum("format", this.TYPES.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA", "DEPTH_COMPONENT"]),
      new GLParamEnum("type", this.TYPES.ENUM, textureTypesEnum),
      new GLParam("value", this.TYPES.OBJECT)
    ])
  ]));
  this.add_function("texParameterf", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"]),
    new GLParamEnum("pname", this.TYPES.ENUM, texParamNames),
    new GLParam("param", this.TYPES.FLOAT)
  ]);
  this.add_function("texParameteri", null, [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP"]),
    new GLParamEnum("pname", this.TYPES.ENUM, texParamNames),
    new GLParamEnum("param", this.TYPES.ENUM, ["NEAREST", "LINEAR", "NEAREST_MIPMAP_NEAREST", "LINEAR_MIPMAP_NEAREST", "NEAREST_MIPMAP_LINEAR", "LINEAR_MIPMAP_LINEAR", "CLAMP_TO_EDGE", "MIRRORED_REPEAT", "REPEAT"])
  ]);

  var texSubImageSharedParams = [
    new GLParamEnum("target", this.TYPES.ENUM, ["TEXTURE_2D", "TEXTURE_CUBE_MAP_POSITIVE_X", "TEXTURE_CUBE_MAP_NEGATIVE_X", "TEXTURE_CUBE_MAP_POSITIVE_Y", "TEXTURE_CUBE_MAP_NEGATIVE_Y", "TEXTURE_CUBE_MAP_POSITIVE_Z", "TEXTURE_CUBE_MAP_NEGATIVE_Z"]),
    new GLParam("level", this.TYPES.LONG),
    new GLParam("xoffset", this.TYPES.LONG),
    new GLParam("yoffset", this.TYPES.LONG),
  ];

  this.add_function("texSubImage2D", new GLFunctionMulti("texSubImage2D", null, [
    texSubImageSharedParams.concat([
      new GLParam("width", this.TYPES.LONG),
      new GLParam("height", this.TYPES.LONG),
      new GLParamEnum("format", this.TYPES.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA"]),
      new GLParamEnum("type", this.TYPES.ENUM, textureTypesEnum),
      new GLParam("pixels", this.TYPES.ARRAY)
    ]),
    texSubImageSharedParams.concat([
      new GLParamEnum("format", this.TYPES.ENUM, ["ALPHA", "LUMINANCE", "LUMINANCE_ALPHA", "RGB", "RGBA"]),
      new GLParamEnum("type", this.TYPES.ENUM, textureTypesEnum),
      new GLParam("value", this.TYPES.OBJECT)
    ])
  ]));
  this.add_function("uniform1f", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.FLOAT)
  ]);
  this.add_function("uniform1fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform1i", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.LONG)
  ]);
  this.add_function("uniform1iv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform2f", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.FLOAT),
    new GLParam("y", this.TYPES.FLOAT)
  ]);
  this.add_function("uniform2fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform2i", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG)
  ]);
  this.add_function("uniform2iv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform3f", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.FLOAT),
    new GLParam("y", this.TYPES.FLOAT),
    new GLParam("z", this.TYPES.FLOAT)
  ]);
  this.add_function("uniform3fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform3i", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("z", this.TYPES.LONG)
  ]);
  this.add_function("uniform3iv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform4f", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.FLOAT),
    new GLParam("y", this.TYPES.FLOAT),
    new GLParam("z", this.TYPES.FLOAT),
    new GLParam("w", this.TYPES.FLOAT)
  ]);
  this.add_function("uniform4fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniform4i", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("z", this.TYPES.LONG),
    new GLParam("w", this.TYPES.LONG)
  ]);
  this.add_function("uniform4iv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("v", this.TYPES.ARRAY)
  ]);
  this.add_function("uniformMatrix2fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("transpose", this.TYPES.BOOL),
    new GLParam("value", this.TYPES.MATRIX)
  ]);
  this.add_function("uniformMatrix3fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("transpose", this.TYPES.BOOL),
    new GLParam("value", this.TYPES.MATRIX)
  ]);
  this.add_function("uniformMatrix4fv", null, [
    new GLParam("location", this.TYPES.OBJECT),
    new GLParam("transpose", this.TYPES.BOOL),
    new GLParam("value", this.TYPES.MATRIX)
  ]);
  this.add_function("useProgram", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("validateProgram", null, [
    new GLParam("program", this.TYPES.OBJECT)
  ]);
  this.add_function("vertexAttrib1f", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("x", this.TYPES.FLOAT)
  ]);
  this.add_function("vertexAttrib1fv", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("values", this.TYPES.ARRAY)
  ]);
  this.add_function("vertexAttrib2f", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("x", this.TYPES.FLOAT),
    new GLParam("y", this.TYPES.FLOAT)
  ]);
  this.add_function("vertexAttrib2fv", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("values", this.TYPES.ARRAY)
  ]);
  this.add_function("vertexAttrib3f", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("x", this.TYPES.FLOAT),
    new GLParam("y", this.TYPES.FLOAT),
    new GLParam("z", this.TYPES.FLOAT)
  ]);
  this.add_function("vertexAttrib3fv", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("values", this.TYPES.ARRAY)
  ]);
  this.add_function("vertexAttrib4f", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("x", this.TYPES.FLOAT),
    new GLParam("y", this.TYPES.FLOAT),
    new GLParam("z", this.TYPES.FLOAT),
    new GLParam("w", this.TYPES.FLOAT)
  ]);
  this.add_function("vertexAttrib4fv", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("values", this.TYPES.ARRAY)
  ]);
  this.add_function("vertexAttribPointer", null, [
    new GLParam("indx", this.TYPES.LONG),
    new GLParam("size", this.TYPES.LONG),
    new GLParamEnum("type", this.TYPES.ENUM, ["BYTE", "UNSIGNED_BYTE", "SHORT", "UNSIGNED_SHORT", "FIXED", "FLOAT"]),
    new GLParam("normalized", this.TYPES.BOOL),
    new GLParam("stride", this.TYPES.LONG),
    new GLParam("offset", this.TYPES.LONG)
  ]);
  this.add_function("viewport", null, [
    new GLParam("x", this.TYPES.LONG),
    new GLParam("y", this.TYPES.LONG),
    new GLParam("width", this.TYPES.LONG),
    new GLParam("height", this.TYPES.LONG)
  ]);
};
