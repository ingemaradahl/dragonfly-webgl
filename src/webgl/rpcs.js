/* This file contains RPCs (Remote Procedure Calls), functions executed remotely
 * on the host debugged by the WebGL inspection utility, and are never executed
 * in the dragonfly instance, except for the prepare method 
 */

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.RPCs = {};

// Called to prepare function for remote calling (wrap function in parenthesis
// and append invoction routine
cls.WebGL.RPCs.prepare = function(fun)
{
  return "(" + String(fun) + ").call()";
};
//(function() { document.getElementById("bild").src = "http://i.imgur.com/Z2vyV.jpg"; var canvas_tags = document.getElementsByTagName("canvas"); console.log("LOLOLOLLOL"); return 1337; });

/* The Following functions will never be called by the dragonfly instance */

cls.WebGL.RPCs.query_contexts = function() 
{
  var canvas_tags = document.getElementsByTagName("canvas");
  canvas_tags = Array.prototype.slice.call(canvas_tags);
  var contexts = [];
  var gl;

  for (var c in canvas_tags)
  {
    /* TODO: IMPORTANT: this will create a gl context when none is present.
     * This is NOT acceptable, but will be resolved by an additional flag in
     * the call to getContext indicating NOT to create a new context 
     */
    if (gl = canvas_tags[c].getContext('webgl') ||
             canvas_tags[c].getContext('experimental-webgl'))
    {
      contexts.push(gl);
    }
  }

  if (contexts.length > 0)
  {
    return contexts;
  }
  else
  {
    return null;
  }
};


cls.WebGL.RPCs.get_state = function()
{
  if (gl instanceof WebGLRenderingContext) 
  {
    var pnames = [
      "ALPHA_BITS", 
      "ACTIVE_TEXTURE", 
      "ALIASED_LINE_WIDTH_RANGE",
      "ALIASED_POINT_SIZE_RANGE", 
      "ALPHA_BITS", 
      "ARRAY_BUFFER_BINDING",
      "BLEND_DST_ALPHA",
      "BLEND_DST_RGB", 
      "BLEND_EQUATION_ALPHA", 
      "BLEND_EQUATION_RGB",
      "BLEND_SRC_ALPHA", 
      "BLEND_SRC_RGB", 
      "BLEND", 
      "BLEND_COLOR",
      "BLUE_BITS", 
      "COLOR_CLEAR_VALUE",
      "COLOR_WRITEMASK", 
      "COMPRESSED_TEXTURE_FORMATS", 
      "CULL_FACE",
      "CULL_FACE_MODE", 
      "CURRENT_PROGRAM", 
      "DEPTH_BITS", 
      "DEPTH_CLEAR_VALUE",
      "DEPTH_FUNC", 
      "DEPTH_RANGE", 
      "DEPTH_TEST", 
      "DEPTH_WRITEMASK",
      "ELEMENT_ARRAY_BUFFER_BINDING", 
      "DITHER", 
      "FRAMEBUFFER_BINDING",
      "FRONT_FACE", 
      "GENERATE_MIPMAP_HINT", 
      "GREEN_BITS", 
      "LINE_WIDTH", 
      "MAX_COMBINED_TEXTURE_IMAGE_UNITS", 
      "MAX_TEXTURE_IMAGE_UNITS",
      "MAX_CUBE_MAP_TEXTURE_SIZE", 
      "MAX_RENDERBUFFER_SIZE",
      "MAX_TEXTURE_SIZE", 
      "MAX_VARYING_VECTORS", 
      "MAX_VERTEX_ATTRIBS",
      "MAX_VERTEX_TEXTURE_IMAGE_UNITS", 
      "MAX_VERTEX_UNIFORM_VECTORS",
      "MAX_VIEWPORT_DIMS", 
      "PACK_ALIGNMENT",
      "POLYGON_OFFSET_FACTOR", "POLYGON_OFFSET_FILL",
      "POLYGON_OFFSET_UNITS", 
      "RED_BITS",
      "RENDERBUFFER_BINDING", 
      "RENDERER", 
      "SAMPLE_BUFFERS",
      "SAMPLE_COVERAGE_INVERT", 
      "SAMPLE_COVERAGE_VALUE", 
      "SAMPLES",
      "SCISSOR_BOX", 
      "SCISSOR_TEST", 
      "SHADING_LANGUAGE_VERSION", 
      "STENCIL_BITS", 
      "STENCIL_CLEAR_VALUE", 
      "STENCIL_TEST",
      "STENCIL_STENCIL_BACK_FAIL",
      "STENCIL_BACK_FUNC", 
      "STENCIL_BACK_REF","STENCIL_BACK_VALUE_MASK",
      "STENCIL_BACK_WRITEMASK", 
      "STENCIL_FAIL",
      "STENCIL_FUNC", 
      "STENCIL_REF","STENCIL_VALUE_MASK", 
      "STENCIL_WRITEMASK",
      "STENCIL_BACK_PASS_DEPTH_FAIL", 
      "STENCIL_BACK_PASS_DEPTH_PASS",
      "STENCIL_PASS_DEPTH_FAIL", 
      "STENCIL_PASS_DEPTH_PASS",
      "TEXTURE_BINDING_2D", 
      "TEXTURE_BINDING_CUBE_MAP", 
      "UNPACK_ALIGNMENT",
      "UNPACK_COLORSPACE_CONVERSION_WEBGL", 
      "UNPACK_FLIP_Y_WEBGL",
      "UNPACK_PREMULTIPLY_ALPHA_WEBGL", 
      "VENDOR", 
      "VERSION", 
      "VIEWPORT"
    ];

    // Create a back translation dict for GL enumerators
    var back_dict = {};
    for (var i in gl)
    {
      if (typeof gl[i] === "number")
      {
        back_dict[gl[i]] = i;
      }
    }

    // Helper function for writing color values
    var round = function (val)
    {
      return val.toFixed(2);
    };

    // Wrap up the entire state in an array of string as it permits dragonfly to
    // get the state in two calls instead of one per parameter.
    return pnames.map(function(p){ 
        var val = gl.getParameter(gl[p]);
        switch (p) {
          case "ALIASED_LINE_WIDTH_RANGE":
          case "ALIASED_POINT_SIZE_RANGE":
          case "DEPTH_RANGE":
            return [p, String(val[0]) + "-" + String(val[1])].join("|");
          case "BLEND_COLOR":
          case "COLOR_CLEAR_VALUE":
            return [p, "rgba: " + (Array.prototype.slice.call(val).map(round)).join(", ")].join("|");
          case "SCISSOR_BOX":
          case "VIEWPORT":
            return [p, String(val[0]) + ", " + String(val[1]) + ": " + String(val[2]) + " x " + String(val[3])].join("|");
          case "MAX_VIEWPORT_DIMS":
            return [p, String(val[0]) + " x " + String(val[1])].join("|");
          case "STENCIL_VALUE_MASK":
          case "STENCIL_WRITEMASK":
          case "STENCIL_BACK_VALUE_MASK":
          case "STENCIL_BACK_WRITEMASK":
            return [p, "0x" + Number(val).toString(16)].join("|");
          default:
            if (typeof val === "boolean") {
              return [p, String(val)].join("|");
            }
            else if (!(val in back_dict)) 
            {
              return [p, String(val)].join("|");
            }
            else
            {
              return [p, String(back_dict[val])].join("|");
            }
        }
    });
  }
  else
  {
    return null;
  }
};


cls.WebGL.RPCs.injection = function () {
  function _wrap_function(context, function_name)
  {
    var gl = context.gl;
    var original_function = gl[function_name];

    return function ()
    {
      var result = original_function.apply(gl, arguments);

      var error = gl.NO_ERROR;
      error = gl.getError();
      if (error !== gl.NO_ERROR)
      {
        console.log("ERROR IN WEBGL in call to " + function_name + ": error " + error);
      }
      return result;
    };

  }

  var WrappedContext = function(true_webgl)
  {
    this.gl = true_webgl;
    var gl = true_webgl;

    this.get_state = function()
    {
      var pnames = [
        "ALPHA_BITS", 
        "ACTIVE_TEXTURE", 
        "ALIASED_LINE_WIDTH_RANGE",
        "ALIASED_POINT_SIZE_RANGE", 
        "ALPHA_BITS", 
        "ARRAY_BUFFER_BINDING",
        "BLEND_DST_ALPHA",
        "BLEND_DST_RGB", 
        "BLEND_EQUATION_ALPHA", 
        "BLEND_EQUATION_RGB",
        "BLEND_SRC_ALPHA", 
        "BLEND_SRC_RGB", 
        "BLEND", 
        "BLEND_COLOR",
        "BLUE_BITS", 
        "COLOR_CLEAR_VALUE",
        "COLOR_WRITEMASK", 
        "COMPRESSED_TEXTURE_FORMATS", 
        "CULL_FACE",
        "CULL_FACE_MODE", 
        "CURRENT_PROGRAM", 
        "DEPTH_BITS", 
        "DEPTH_CLEAR_VALUE",
        "DEPTH_FUNC", 
        "DEPTH_RANGE", 
        "DEPTH_TEST", 
        "DEPTH_WRITEMASK",
        "ELEMENT_ARRAY_BUFFER_BINDING", 
        "DITHER", 
        "FRAMEBUFFER_BINDING",
        "FRONT_FACE", 
        "GENERATE_MIPMAP_HINT", 
        "GREEN_BITS", 
        "LINE_WIDTH", 
        "MAX_COMBINED_TEXTURE_IMAGE_UNITS", 
        "MAX_TEXTURE_IMAGE_UNITS",
        "MAX_CUBE_MAP_TEXTURE_SIZE", 
        "MAX_RENDERBUFFER_SIZE",
        "MAX_TEXTURE_SIZE", 
        "MAX_VARYING_VECTORS", 
        "MAX_VERTEX_ATTRIBS",
        "MAX_VERTEX_TEXTURE_IMAGE_UNITS", 
        "MAX_VERTEX_UNIFORM_VECTORS",
        "MAX_VIEWPORT_DIMS", 
        "PACK_ALIGNMENT",
        "POLYGON_OFFSET_FACTOR", "POLYGON_OFFSET_FILL",
        "POLYGON_OFFSET_UNITS", 
        "RED_BITS",
        "RENDERBUFFER_BINDING", 
        "RENDERER", 
        "SAMPLE_BUFFERS",
        "SAMPLE_COVERAGE_INVERT", 
        "SAMPLE_COVERAGE_VALUE", 
        "SAMPLES",
        "SCISSOR_BOX", 
        "SCISSOR_TEST", 
        "SHADING_LANGUAGE_VERSION", 
        "STENCIL_BITS", 
        "STENCIL_CLEAR_VALUE", 
        "STENCIL_TEST",
        "STENCIL_STENCIL_BACK_FAIL",
        "STENCIL_BACK_FUNC", 
        "STENCIL_BACK_REF","STENCIL_BACK_VALUE_MASK",
        "STENCIL_BACK_WRITEMASK", 
        "STENCIL_FAIL",
        "STENCIL_FUNC", 
        "STENCIL_REF","STENCIL_VALUE_MASK", 
        "STENCIL_WRITEMASK",
        "STENCIL_BACK_PASS_DEPTH_FAIL", 
        "STENCIL_BACK_PASS_DEPTH_PASS",
        "STENCIL_PASS_DEPTH_FAIL", 
        "STENCIL_PASS_DEPTH_PASS",
        "TEXTURE_BINDING_2D", 
        "TEXTURE_BINDING_CUBE_MAP", 
        "UNPACK_ALIGNMENT",
        "UNPACK_COLORSPACE_CONVERSION_WEBGL", 
        "UNPACK_FLIP_Y_WEBGL",
        "UNPACK_PREMULTIPLY_ALPHA_WEBGL", 
        "VENDOR", 
        "VERSION", 
        "VIEWPORT"
      ];

      // Create a back translation dict for GL enumerators
      var back_dict = {};
      for (var i in gl)
      {
        if (typeof gl[i] === "number")
        {
          back_dict[gl[i]] = i;
        }
      }

      // Helper function for writing color values
      var round = function (val)
      {
        return val.toFixed(2);
      };

      // Wrap up the entire state in an array of string as it permits dragonfly to
      // get the state in two calls instead of one per parameter.
      return pnames.map(function(p){ 
          var val = gl.getParameter(gl[p]);
          switch (p) {
            case "ALIASED_LINE_WIDTH_RANGE":
            case "ALIASED_POINT_SIZE_RANGE":
            case "DEPTH_RANGE":
              return [p, String(val[0]) + "-" + String(val[1])].join("|");
            case "BLEND_COLOR":
            case "COLOR_CLEAR_VALUE":
              return [p, "rgba: " + (Array.prototype.slice.call(val).map(round)).join(", ")].join("|");
            case "SCISSOR_BOX":
            case "VIEWPORT":
              return [p, String(val[0]) + ", " + String(val[1]) + ": " + String(val[2]) + " x " + String(val[3])].join("|");
            case "MAX_VIEWPORT_DIMS":
              return [p, String(val[0]) + " x " + String(val[1])].join("|");
            case "STENCIL_VALUE_MASK":
            case "STENCIL_WRITEMASK":
            case "STENCIL_BACK_VALUE_MASK":
            case "STENCIL_BACK_WRITEMASK":
              return [p, "0x" + Number(val).toString(16)].join("|");
            default:
              if (typeof val === "boolean") {
                return [p, String(val)].join("|");
              }
              else if (!(val in back_dict)) 
              {
                return [p, String(val)].join("|");
              }
              else
              {
                return [p, String(back_dict[val])].join("|");
              }
          }
      });
    };

    // Copy enumerators and wrap functions
    for (var i in gl)
    {
      if (typeof gl[i] === "function")
      {
        this[i] = _wrap_function(this, i);
      }
      else
      {
        this[i] = gl[i];
      }
    }

  };


  var orig_getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function ()
  {
    // TODO: Only wrap webgl, not canvas2d
    var gl = orig_getContext.apply(this, arguments);
    if (gl == null)
    {
      return null;
    }

    return new WrappedContext(gl);
  };
};
