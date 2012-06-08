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


/* The following functions will never be called by the dragonfly instance */


cls.WebGL.RPCs.query_test = function()
{
	var data_length = 1000000;
	var return_value = 'a';
	for (var i=0; i<data_length-1; i++)
	{
		return_value += 'a';
	}
	return return_value;
};

cls.WebGL.RPCs.query_contexts = function() 
{
  var canvas_tags = document.getElementsByTagName("canvas");
  canvas_tags = Array.prototype.slice.call(canvas_tags);
  var contexts = [];
  var gl;

  for (var c in canvas_tags)
  {
    // The wrapper creates the 'currentContext' field on the canvas object if
    // getContext has been called
    if (canvas_tags[c].currentContext)
    {
      contexts.push(canvas_tags[c].currentContext);
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


cls.WebGL.RPCs.get_state = function ()
{
  return ctx.get_state();
};

cls.WebGL.RPCs.get_buffers = function ()
{
  // START_INDEX should be replaced by the calling code.
  var buffers = gl.buffers.slice(START_INDEX);
  var out = [];
  for(var i = 0; i < buffers.length; i++)
  {
    var buffer = buffers[i];
    if (buffer == undefined) continue;
    /* TODO: clone the data to a new array or make a second request to examine the array*/
    var arr = buffer.data;
    arr.target = buffer.target;
    arr.usage = buffer.usage;
    arr.index = i;
    out.push(arr);
  }
  return out;
};

cls.WebGL.RPCs.get_buffer = function ()
{
  var buffer = gl.buffers[__INDEX__];
  /* TODO: clone the data to a new array or make a second request to examine the array*/
  var arr = buffer.data;
  arr.target = buffer.target;
  arr.usage = buffer.usage;
  arr.index = __INDEX__;
  return arr;
};

cls.WebGL.RPCs.request_trace = function()
{
  console.log("Capturing next frame.");
  gl.capture_next_frame = true;
};

cls.WebGL.RPCs.get_trace = function()
{
  return gl.frame_trace;
};

cls.WebGL.RPCs.injection = function () {
  var contexts = [];
  
  // TODO: temprary creates the function requestAnimationFrame. Remove when we have a callback on new frame.
  window.requestAnimationFrame = function (fun)
  {
    window.setTimeout(fun, 1000 / 60);
    for (var c = 0; c < contexts.length; c++)
    {
      if (contexts[c].new_frame) contexts[c].new_frame();
    }
  };

  function _wrap_function(context, function_name, innerFuns)
  {
    var gl = context.gl;
    var original_function = gl[function_name];

    var innerFunction = innerFuns[function_name];

    return function ()
    {
      var result = original_function.apply(gl, arguments);

      if (innerFunction) innerFunction.call(context, result, arguments);

      var error = gl.NO_ERROR;
      error = gl.getError();
      if (error !== gl.NO_ERROR)
      {
        // TODO: will flood the console if inside a loop, perhaps not log always?
        console.log("ERROR IN WEBGL in call to " + function_name + ": error " + error);
      }

      if (context.capturing_frame)
      {
        var args = [];
        for (var i = 0; i < arguments.length; i++)
        {
          args.push(arguments[i]);
        }

        context.frame_trace.push([function_name, error].concat(args).join("|"));
      }
      return result;
    };
  }

  var WrappedContext = function(true_webgl)
  {
    // TODO: temporary store contexts to be able to execute the new_frame funciton on them.
    contexts.push(this);

    this.gl = true_webgl;
    var gl = true_webgl;

    this.buffers = [];
    
    this.current_buffer;

    this.frame_trace = [];

    this.capture_next_frame = false;
    this.capturing_frame = false;

    this.new_frame = function()
    {
      if (this.capturing_frame) {
        this.capturing_frame = false;
        console.log("Frame have been captured.");
        document.dispatchEvent(new Event("webgl-trace-complete"));
      }

      if (this.capture_next_frame)
      {
        this.capture_next_frame = false;
        this.capturing_frame = true;
        this.frame_trace = [];
      }
    }

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

    var innerFuns = {};
    innerFuns.createBuffer = function(result, args)
    {
      if (this.buffers.length < 1000)
      {
        var buf = {};
        buf.buffer = result;
        var i = this.buffers.push(buf);
        result._index = i - 1;
        // TODO: ugly temporary solution to "ensure" that the webgl-debugger-ready message is recieved before this one.
        setTimeout('document.dispatchEvent(new Event("webgl-buffer-created"))', 2000);
      }
    };
    innerFuns.bindBuffer = function(result, args)
    {
      this.current_buffer = args[1]._index;
    };
    innerFuns.bufferData = function(result, args)
    {
      var buffer = this.buffers[this.current_buffer];
      buffer.target = args[0];
      buffer.data = args[1];
      buffer.usage = args[2];
    };

    // Copy enumerators and wrap functions
    for (var i in gl)
    {
      if (typeof gl[i] === "function")
      {
        this[i] = _wrap_function(this, i, innerFuns);
      }
      else
      {
        this[i] = gl[i];
      }
    }

    document.dispatchEvent(new Event("webgl-debugger-ready"));
  };


  var orig_getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function ()
  {
    // Only wrap webgl, not canvas2d
    var context_names = {"moz-webgl":null, "webkit-3d":null, "experimental-webgl":null, "webgl":null};
    if (!(arguments[0] in context_names))
    {
      return orig_getContext.apply(this, arguments);
    }

    var gl = orig_getContext.apply(this, arguments);
    if (gl == null)
    {
      return null;
    }

    var result = new WrappedContext(gl);
    this.currentContext = result;
    return result;
  };

};
