/* This file contains RPCs (Remote Procedure Calls), functions executed remotely
 * on the host debugged by the WebGL inspection utility, and are never executed
 * in the dragonfly instance, except for the prepare method
 */

window.cls || (window.cls = {});
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

/**
 * Retrieves the handler from a canvas after a WebGL context have been created.
 * canvas should be defined by Dragonfly.
 */
cls.WebGL.RPCs.get_handler = function()
{
  var handler = canvas.____handler;
  delete canvas.____handler;
  return handler;
};

cls.WebGL.RPCs.debugger_ready = function()
{
  for (var key in handler.events)
  {
    if (handler.events.hasOwnProperty(key))
    {
      handler.events[key].set_ready();
    }
  }
};

cls.WebGL.RPCs.get_state = function ()
{
  return handler.get_state();
};

cls.WebGL.RPCs.get_snapshots = function ()
{
  return ctx.get_snapshots();
};

cls.WebGL.RPCs.get_buffers_new = function ()
{
  var buffers = handler.events["buffer-created"].get();
  var out = [];
  for(var i = 0; i < buffers.length; i++)
  {
    var buffer = buffers[i];
    if (buffer === undefined) continue;
    var arr;
    if (buffer.data === undefined)
    {
      arr = {};
      arr.nodata = true;
    }
    else
    {
      /* TODO: clone the data to a new array or make a second request to examine the array*/
      arr = buffer.data;
      arr.target = buffer.target;
      arr.usage = buffer.usage;
    }
    arr.index = buffer.buffer._index;
    arr.buffer = buffer.buffer;
    out.push(arr);
  }
  return out;
};

cls.WebGL.RPCs.get_buffers = function ()
{
  var buffers = handler.buffers;
  var out = [];
  for(var i = 0; i < buffers.length; i++)
  {
    var buffer = buffers[i];
    if (buffer === undefined || buffer.data === undefined) continue;
      /* TODO: clone the data to a new array or make a second request to examine the array*/
    var arr = buffer.data;
    arr.target = buffer.target;
    arr.usage = buffer.usage;
    arr.index = buffer.buffer._index;
    out.push(arr);
  }
  return out;
};

cls.WebGL.RPCs.get_buffers_indices = function ()
{
  var buffers_indices = [__INDICES__];
  var out = [];
  for(var i = 0; i < buffers.length; i++)
  {
    var idx = buffer_ids[i];
    var buffer = handler.buffers[i];
    if (buffer === undefined) continue;
    /* TODO: clone the data to a new array or make a second request to examine the array*/
    var arr = buffer.data;
    arr.target = buffer.target;
    arr.usage = buffer.usage;
    arr.index = i;
    out.push(arr);
  }
  return out;
};

cls.WebGL.RPCs.request_trace = function()
{
  console.log("Capturing next frame.");
  handler.capture_next_frame = true;
};

cls.WebGL.RPCs.get_trace = function()
{
  return handler.events["trace-completed"].get();
};

// RPCs related to the texture tab.

// Return all texture "names || ids". There are five different types of
// objects that can be used as textures: ArrayBufferView, ImageData,
// HTMLImageElement, HTMLCanvasElement and HTMLVideoElement.

cls.WebGL.RPCs.get_texture_names = function()
{
  var names = [];
  var i = 0;
  var j = 0;
  var exists = false;
  var text = "random canvas";

  for (; i < (gl.textures.length); i++)
  {
    switch(gl.textures[i].toString())
    {
      case "[object ArrayBufferView]":
        console.log("ArrayBufferView, not implemented"); //TODO
        break;
      case "[object ImageData]":
        console.log("ImageData, not implemented"); //TODO
        break;
      case "[object HTMLImageElement]":
        names.push(gl.textures[i].src);
        break;
      case "[object HTMLCanvasElement]":  // Expensive!?
        //names.push(gl.textures[i].id);
        for (j=0; (j<names.length && !exists); j++)
        {
          if (names[j] === text)
          {
            exists = true;
          }
        }
        if (!exists)
        {
          names.push(text);
          console.log(text + " pushed");
        }
      break;
      case "[object HTMLVideoElement]":
        console.log("HTMLVideoElement, not implemented"); //TODO
        break;
      default: console.log("ERROR in WebGLDebugger, couldn't resolve " +
                           "texture object type: " + gl.textures[i].toString());
    }
  }
  return names;
};

// Return texture as string image data.
cls.WebGL.RPCs.get_texture_as_data = function()
{
  var texture_url = "URL";
  var i = 0;
  var target_texture_index = undefined;

  for(; i < gl.textures.length; i++)
  {
    if (gl.textures[i].src === texture_url)
    {
      target_texture_index = i;
    }
  }

  if (target_texture_index !== undefined)
  {
    var img = gl.textures[target_texture_index];
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    var dataURL = canvas.toDataURL("image/png");

    return (dataURL);
  }
  else
  {
    console.log("ERROR IN WEBGL, couldn't get texture");
  }
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

  /**
   * Wrap all WebGL functions, copy all other values and create a handler
   */
  function wrap_context(canvas)
  {
    // We will keep all native functions and enumerators in this object
    var gl = {};

    var handler = new Handler(this, gl);
    // Temporarly expose the handler so we can get it with Dragonfly.
    canvas.____handler = handler;

    handler.get_state = function()
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
      return pnames.map(function(p) {
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

    // Stores the oldest error that have occured since last call to getError
    // When there have been no error it should have the value NO_ERROR
    var oldest_error = this.NO_ERROR;

    function wrap_function(handler, function_name, original_function, innerFuns, postCaptureFuns)
    {
      var gl = handler.gl;

      var innerFunction = innerFuns[function_name];

      return function ()
      {
        // Execute original function and save result.
        // TODO catch exceptions
        var result = original_function.apply(this, arguments);

        var error = gl.getError();
        if (error !== gl.NO_ERROR)
        {
          if (oldest_error === gl.NO_ERROR) oldest_error = error;
          // TODO: will flood the console if inside a loop, perhaps not log always?
          console.log("ERROR IN WEBGL in call to " + function_name + ": error " + error);
        }
        else if (innerFunction)
        {
          innerFunction.call(handler, result, arguments);
        }

        if (handler.capturing_frame)
        {
          var call_idx = handler.trace.calls.length;
          var trace_idx = 0; // TODO: Differ from different traces
          var postFunction = postCaptureFuns[function_name];

          var args = [];
          for (var i = 0; i < arguments.length; i++)
          {
            if (typeof(arguments[i]) === "object" && arguments[i] !== null)
            {
              var obj = arguments[i];
              var trace_obj = format_object(obj);
              var trace_obj_index = handler.trace.objects.push(trace_obj) - 1;
              args.push("@" + String(trace_obj_index));
            }
            else
            {
              args.push(arguments[i]);
            }
          }

          var res = result === undefined ? "" : result;
          handler.trace.calls.push([function_name, error, res].concat(args).join("|"));

          switch (function_name)
          {
            case "drawArrays":
            case "drawElements":
              postFunction.call(handler, trace_idx, call_idx);
              break;
          }
        }
        return result;
      };
    }

    var format_regexp = /^\[object (\w)\]$/;
    function format_object(obj, args)
    {
      var display;
      var type = obj.constructor.name;
      if (type === "Function.prototype") type = obj.toString().replace(format_regexp, "$1");
      var target = obj;
      if (obj instanceof Array || (obj.buffer && obj.buffer instanceof ArrayBuffer))
      {
        var ls = Array.prototype.concat.call([], obj);
        var trace_obj = new TraceObject(target, type);
        trace_obj.data = ls;
        return trace_obj;
      }
      else if (obj instanceof WebGLUniformLocation)
      {
        // TODO enable below when we gathers info about shaders
        // display = handler.lookup_uniform(obj).name;
      }
      else if (obj instanceof WebGLBuffer)
      {
        var buffer = handler.lookup_buffer(obj);
        target = buffer.buffer;
      }

      return new TraceObject(target, type, display);
    }

    var innerFuns = {};
    innerFuns.createBuffer = function(result, args)
    {
      if (this.buffers.length < 1000)
      {
        var buf = {};
        buf.buffer = result;
        var i = this.buffers.push(buf);
        result._index = i - 1;

        this.events["buffer-created"].post(buf);
      }
    };
    innerFuns.bindBuffer = function(result, args)
    {
      if (args[1] == null) return;
      this.bound_buffer = args[1]._index;
    };
    innerFuns.bufferData = function(result, args)
    {
      var buffer = this.buffers[this.bound_buffer];
      buffer.target = args[0];
      if (typeof(args[1]) === "number")
      {
        buffer.size = args[1];
        buffer.data = [];
      }
      else
      {
        buffer.size = args[1].length;
        buffer.data = args[1];
      }
      buffer.usage = args[2];
    };
    innerFuns.bufferSubData = function(result, args)
    {
      var buffer = this.buffers[this.bound_buffer];
      buffer.target = args[0];

      var offset = args[1];
      var end = args[2].length - offset;
      for (var i = 0; i < end; i++)
      {
        buffer.data[i + offset] = args[2][i];
      }
    };
    innerFuns.deleteBuffer = function(result, args)
    {
      for (var i = 0; i < this.buffers.length; i++)
      {
        var buffer = this.buffers[i];
        if (buffer != null && buffer.buffer === args[0])
        {
          // TODO: should notify dragonfly about the deletion.
          buffer.buffer = null;
          break;
        }
      }
    };

    // Texture code
    innerFuns.bindTexture = function(result, args)
    {

    };
    // TODO All texImage functions must be wrapped and handled
    innerFuns.texImage2D = function(result, args)
    {
      // There are five different calls to texImage2D with different kinds of
      // arguments. ArrayBufferView, ImageData, HTMLImageElement,
      // HTMLCanvasElement, and HTMLVideoElement. They are always the last
      // argument.
      //var texture_container_object = args[args.length -1];
      //console.log(texture_container_object.toString());
      //this.textures.push(texture_container_object);
    };
    innerFuns.texSubImage2D = function(result, args)
    {
      //TODO
    };

    var postCaptureFuns = {};
    postCaptureFuns.drawArrays = function(trace_idx, call_idx)
    {
      var gl = this.gl;

      var width, height, fbo;
      if (fbo = gl.getParameter(gl.FRAMEBUFFER_BINDING))
      {
        width = fbo.width;
        height = fbo.height;
      }
      else
      {
        // The default FBO is being used, assume it has the same dimensions as
        // the viewport.. TODO: Consider better heuristic for finding dimension.
        var viewport = gl.getParameter(gl.VIEWPORT);
        width = viewport[2];
        height = viewport[3];
      }

      height = Math.min(height, 16);
      width = Math.min(width, 16);

      // Image data will be stored as RGBA - 4 bytes per pixel
      var size = width * height * 4;
      var arr = new ArrayBuffer(size);
      var pixels = new Uint8Array(arr);

      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      var snapshot = {
        trace_idx : trace_idx,
        call_idx : call_idx,
        pixels : Array.prototype.slice.call(pixels),
        size : size,
        width : width,
        height : height
      };

      this.trace.fbo_snapshots.push(snapshot);

      return snapshot;
    };
    postCaptureFuns.drawElements = postCaptureFuns.drawArrays;

    // Copy enumerators and wrap functions
    for (var i in this)
    {
      if (typeof this[i] === "function")
      {
        gl[i] = this[i].bind(this);
        this[i] = wrap_function(handler, i, this[i], innerFuns, postCaptureFuns);
      }
      else
      {
        gl[i] = this[i];
      }
    }

    this.new_frame = function()
    {
      if (handler.capturing_frame) {
        handler.capturing_frame = false;
        console.log("Frame have been captured.");
        handler.events["trace-completed"].post(handler.trace);
        handler.trace = null;
      }

      if (handler.capture_next_frame)
      {
        handler.capture_next_frame = false;
        handler.capturing_frame = true;
        handler.trace = new Trace();
      }
    };

    var orig_getError = this.getError;
    this.getError = function()
    {
      orig_getError.call(this);

      var error = oldest_error;
      oldest_error = gl.NO_ERROR;
      return error;
    };
  }


  var orig_getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function ()
  {
    // Only wrap webgl, not canvas2d
    var context_names = {"moz-webgl":null, "webkit-3d":null, "experimental-webgl":null, "webgl":null};
    var gl = orig_getContext.apply(this, arguments);
    if (!(arguments[0] in context_names) || gl === null)
    {
      return gl;
    }

    // TODO: temporary store contexts to be able to execute the new_frame funciton on them.
    contexts.push(gl);

    wrap_context.call(gl, this);

    this.dispatchEvent(new Event("webgl-debugger-ready"));

    return gl;
  };

  /**
   * Handles communication between the wrapped context and Dragonfly.
   */
  function Handler(context, gl)
  {
    this.gl = gl;
    this.context = context;

    this.buffers = [];
    // Index of the currently bound buffer
    this.bound_buffer = null;

    this.trace = null;
    this.fbo_snapshots = [];
    this.capture_next_frame = false;
    this.capturing_frame = false;

    // Container of all HTML DOM Image Objects from the textures.
    this.textures = [];

    this.events = {
      "buffer-created": new MessageQueue("webgl-buffer-created"),
      "trace-completed": new MessageQueue("webgl-trace-completed")
    };

    this.get_snapshots = function()
    {
      return this.fbo_snapshots;
    };

    this.lookup_buffer = function(buffer)
    {
      for (var i = 0; i < this.buffers.length; i++) {
        if (this.buffers[i].buffer === buffer)
        {
          return this.buffers[i];
        }
      }
      return null;
    };
  }

  /**
   * Queues messages for pickup by Dragonfly.
   */
  function MessageQueue(name, ready)
  {
    this.name = name;
    this.ready = Boolean(ready);
    this.running = false;
    this.messages = [];
  }
  MessageQueue.prototype.post = function (message)
  {
    this.messages.push(message);
    if (!this.running && this.ready)
    {
      document.dispatchEvent(new Event(this.name));
      this.running = true;
    }
  };
  MessageQueue.prototype.get = function ()
  {
    this.running = false;
    var messages = this.messages;
    this.messages = [];
    return messages;
  };
  MessageQueue.prototype.set_ready = function ()
  {
    if (!this.ready && this.messages.length > 0)
    {
      document.dispatchEvent(new Event(this.name));
      this.running = true;
    }
    this.ready = true;
  };

  function Trace()
  {
    this.calls = [];
    this.objects = [];
    this.fbo_snapshots = [];
  }

  function TraceObject(target, type, display)
  {
    this.target = target;
    this.type = type;
    if (display !== undefined) this.display = display;
  }
};
