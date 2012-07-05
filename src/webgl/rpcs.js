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
 * Retrieves the handler interface from a canvas after a WebGL context have been
 * created. canvas and canvas_map should be defined by Dragonfly.
 */
cls.WebGL.RPCs.get_handler = function()
{
  for (var c in canvas_map)
  {
    if (canvas_map[c].canvas === canvas)
    {
      return canvas_map[c].handler.get_interface();
    }
  }

  return null;
};

/**
 * Calls a function bound by scope to the variable name f
 */
cls.WebGL.RPCs.call_function = function()
{
  return f();
};


cls.WebGL.RPCs.injection = function () {
  // Used to determine which canvas maps to which handler.
  var canvas_map = [];

  // TODO Temporary, see HTMLCanvas.prototype.getContext why
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

    var handler = new Handler(this, gl, canvas);
    canvas_map.push({canvas:canvas, handler:handler});

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
        var redundant = false;

        var error = gl.getError();
        if (error !== gl.NO_ERROR)
        {
          if (oldest_error === gl.NO_ERROR) {
            oldest_error = error;
          }
        }
        else if (innerFunction)
        {
          redundant = innerFunction.call(handler, result, arguments);
        }

        if (handler.capturing_frame)
        {
          var postFunction = postCaptureFuns[function_name];

          switch (function_name)
          {
            case "drawArrays":
            case "drawElements":
              postFunction.call(handler);
              break;
          }

          handler.snapshot.add_call(function_name, error, arguments, result);
        }
        return result;
      };
    }


    var innerFuns = {};
    innerFuns.createBuffer = function(buffer, args)
    {
      var buf = {};
      buf.buffer = buffer;
      var i = this.buffers.push(buf);
      buf.index = i - 1;
    };
    innerFuns.bindBuffer = function(result, args)
    {
      var buffer = args[1];
      if (buffer == null) return;
      this.bound_buffer = this.lookup_buffer(buffer);
      // TODO: redundancy check
    };
    innerFuns.bufferData = function(result, args)
    {
      if (this.bound_buffer == null) return;
      var buffer = this.bound_buffer;
      buffer.target = args[0];
      if (typeof(args[1]) === "number")
      {
        buffer.size = args[1];
        buffer.data = [];
      }
      else
      {
        buffer.size = args[1].byteLength;
        buffer.data = args[1];
        //buffer.data = Array.prototype.slice.call(args[1].slice(0); // Make sure we present correct data
        // TODO: Make data cloning a selectable option?
      }
      buffer.usage = args[2];
    };
    innerFuns.bufferSubData = function(result, args)
    {
      // TODO: data array in buffer has to be cloned, otherwise "external" array
      // is modified as well
      if (this.bound_buffer == null) return;
      var buffer = this.bound_buffer;
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
      var buf = args[0];
      var buffer = this.lookup_buffer(buf);
      this.buffers[buffer.index] = null;
      if (this.bound_buffer === buffer) this.bound_buffer = null;
    };


    // Texture code
    innerFuns.activeTexture = function(result, args)
    {
      this.active_texture = result;
    };

    innerFuns.bindTexture = function(result, args)
    {
      this.texture_binding[args[0]] = args[1];
    };

    innerFuns.createTexture = function(texture, args)
    {
      var tex = {};
      tex.texture = texture;
      var i = this.textures.push(tex);
      tex.index = i - 1;

      if (this.texture_update)
      {
        this.events["texture-created"].post(tex);
      }
    };

    innerFuns.deleteTexture = function(result, args)
    {
      // TODO delete texture from textures[]
    };

    // TODO All texImage functions must be wrapped and handled
    innerFuns.texImage2D = function(result, args)
    {
      // Last argument is the one containing the texture data.
      var texture_container_object = args[args.length -1];
      if (texture_container_object === null)  //TODO improve
        return;

      var target = args[0];
      var bound_texture = this.texture_binding[target].texture;

      for (var i=0; i<this.textures.length; i++)
      {
        if (this.textures[i].texture === bound_texture)
        {
          var texture = {
            id : i,
            texture : bound_texture,
            target  : target,
            object : texture_container_object,
            type : texture_container_object.toString(),
            texture_wrap_s : gl.getTexParameter(gl.target, gl.TEXTURE_WRAP_S),
            texture_wrap_t : gl.getTexParameter(gl.target, gl.TEXTURE_WRAP_T),
            texture_min_filter : gl.getTexParameter(gl.target, gl.TEXTURE_MIN_FILTER),
            texture_mag_filter : gl.getTexParameter(gl.target, gl.TEXTURE_MAG_FILTER),

            get_data : this.get_texture_data.bind(texture)
          };

          // TODO Translate to ENUMs

          // We need to save some extra information about the call when an
          // ArrayBufferView is used.
          if (args.length === 9)
          {
            texture.internalFormat = args[2];
            texture.width = args[3];
            texture.height = args[4];
            texture.format = args[6];
          }

          this.textures[i] = texture;
          return;
        }
      }

      console.log("ERROR in WebGL, requested texture doesn't exist");
    };
    innerFuns.texSubImage2D = function(result, args)
    {
      //TODO
    };
    innerFuns.texParameteri = function(result, args)
    {
      // TODO
    };
    innerFuns.texParameterf = function(result, args)
    {
      // TODO
    };
    innerFuns.createProgram = function(result, args)
    {
      this.programs.push({
        program : result,
        index : this.programs.length,
        shaders : [],
        attributes : {},
        uniforms : []
      });
    };
    innerFuns.useProgram = function(result, args)
    {
      var program = args[0];
      var redundant = this.bound_program === program;
      this.bound_program = program;

      return redundant;
    };
    innerFuns.createShader = function(result, args)
    {
      this.shaders.push({
        shader : result,
        index : this.shaders.length,
        type : args[0],
        src : ""
      });
    };
    // TODO
    //innerFuns.deleteShader = function(result, args)
    //{
    //  var shader = this.lookup_shader(args[0]);
    //};
    innerFuns.shaderSource = function(result, args)
    {
      var shader = this.lookup_shader(args[0]);
      var src = args[1];

      shader.src = src;
    };
    //innerFuns.compileShader = function(result, args)
    //{
    //};
    innerFuns.attachShader = function(result, args)
    {
      var program = this.lookup_program(args[0]);
      var shader = this.lookup_shader(args[1]);
      program.shaders.push(shader);
    };
    innerFuns.linkProgram = function(result, args)
    {
      var program_obj = this.lookup_program(args[0]);
      var program = program_obj.program;

      var gl = this.gl;

      var uniforms = [];
      var num_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (var i=0; i<num_uniforms; i++)
      {
        var active_uniform = gl.getActiveUniform(program, i);
        var loc = gl.getUniformLocation(program, active_uniform.name);
        uniforms.push({
          name : active_uniform.name,
          index : i,
          loc  : loc,
          type : active_uniform.type,
          size : active_uniform.size,
          program_index : program_obj.index
        });
      }

      program_obj.uniforms = uniforms;

      var attributes = [];
      var num_attributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
      for (var a=0; a<num_attributes; a++)
      {
        var active_attribute = gl.getActiveAttrib(program, a);
        var loc = gl.getAttribLocation(program, active_attribute.name);
        attributes.push({
          name : active_attribute.name,
          loc  : loc,
          type : active_attribute.type,
          size : active_attribute.size
        });
      }
      program_obj.attributes = attributes;
    };

    var postCaptureFuns = {};
    postCaptureFuns.drawArrays = function()
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

      // Image data will be stored as RGBA - 4 bytes per pixel
      var size = width * height * 4;
      var arr = new ArrayBuffer(size);
      var pixels = new Uint8Array(arr);

      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      var snapshot = {
        pixels : Array.prototype.slice.call(pixels),
        size : size,
        width : width,
        height : height
      };

      this.snapshot.add_drawcall(snapshot, gl.getParameter(gl.CURRENT_PROGRAM));
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
        handler.events["snapshot-completed"].post(handler.snapshot.end());
        handler.snapshot = null;
      }

      if (handler.capture_next_frame)
      {
        handler.capture_next_frame = false;
        handler.capturing_frame = true;
        handler.snapshot = new Snapshot(handler);
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
  function Handler(context, gl, canvas)
  {
    this.gl = gl;
    this.context = context;

    this.capture_next_frame = false;
    this.capturing_frame = false;

    this.snapshot = null;

    this.programs = [];
    this.shaders = [];
    this.bound_program = null;

    this.buffers = [];
    this.bound_buffer = null;


    this.textures = [];
    this.texture_binding = {};
    this.active_texture = null; //gl.getParameter(gl.ACTIVE_TEXTURE);

    this.events = {
      "snapshot-completed": new MessageQueue("webgl-snapshot-completed", canvas)
    };

    /* Interface definition between DF and the Context Handler, only the
     * functions included in the interface object will be accessible from DF */
    this._interface = {};

    this.get_interface = function ()
    {
      return this._interface;
    };



    /* Requests a snapshot of all WebGL data for the next frame */
    this.request_snapshot = function()
    {
      this.capture_next_frame = true;
    };
    this._interface.request_snapshot = this.request_snapshot.bind(this);

    this.get_snapshot = function()
    {
      return this.events["snapshot-completed"].get();
    };
    this._interface.get_snapshot = this.get_snapshot.bind(this);

    this.get_state = function()
    {
      var gl = this.gl;

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
    this._interface.get_state = this.get_state.bind(this);

    this.debugger_ready = function()
    {
      for (var key in this.events)
      {
        if (this.events.hasOwnProperty(key))
        {
          this.events[key].set_ready();
        }
      }
    };
    this._interface.debugger_ready = this.debugger_ready.bind(this);

    this.enable_buffers_update = function()
    {
      this.buffers_update = true;
    };
    this._interface.enable_buffers_update = this.enable_buffers_update.bind(this);

    this.disable_buffers_update = function()
    {
      this.buffers_update = false;
    };
    this._interface.disable_buffers_update = this.disable_buffers_update.bind(this);

    this.get_new_buffers = function()
    {
      var buffers = this.events["buffer-created"].get();
      var out = [];
      for (var i = 0; i < buffers.length; i++)
      {
        var buffer = buffers[i];
        if (buffer === undefined) continue;
        out.push(buffer);
      }
      return out;
    };
    this._interface.get_new_buffers = this.get_new_buffers.bind(this);

    this.get_buffers = function()
    {
      var buffers = this.buffers;
      var out = [];
      for (var i = 0; i < buffers.length; i++)
      {
        var buffer = buffers[i];
        if (buffer === undefined || buffer.data === undefined) continue;
        out.push(buffer);
      }
      return out;
    };
    this._interface.get_buffers = this.get_buffers.bind(this);

    this.get_texture_names = function()
    {
      return this.textures;
    };
    this._interface.get_texture_names = this.get_texture_names.bind(this);


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

    this.lookup_texture = function(texture)
    {
      for (var i = 0; i < this.textures.length; i++) {
        if (this.textures[i].texture === texture)
        {
          return this.textures[i];
        }
      }
      return null;
    };

    this.lookup_program = function(program)
    {
      for (var i=0; i<this.programs.length; i++)
      {
        if (this.programs[i].program === program)
        {
          return this.programs[i];
        }
      }
      return null;
    };

    this.lookup_shader = function(shader)
    {
      for (var i=0; i<this.shaders.length; i++)
      {
        if (this.shaders[i].shader === shader)
        {
          return this.shaders[i];
        }
      }
      return null;
    };

    this.lookup_uniform = function(uniform_location)
    {
      // Return the program object containing the requested WebGLUniformLocation
      for (var p in this.programs)
      {
        var program = this.programs[p];
        for (var u in program.uniforms)
        {
          if (program.uniforms[u].loc === uniform_location)
          {
            return program;
          }
        }
      }
    };

    /* Calculates texture data in a scope transission friendly way.
     * This function is never bound to the Handler object, but a texture object,
     * thus "this" refers to that object.
     */
    this.get_texture_data = function ()
    {
      var element = this.object;

      if (element instanceof HTMLImageElement)
      {
        var canvas = document.createElement("canvas");
        canvas.height = element.height;
        canvas.width = element.width;

        var canvas_ctx = canvas.getContext("2d");
        canvas_ctx.drawImage(element, 0, 0);
        this.img = canvas.toDataURL("image/png");
        this.source = element.src;
        this.element_type = "HTMLImageElement";
      }
      else if (element instanceof HTMLCanvasElement)
      {
        this.img = element.toDataURL("image/png");
        this.element_type = "HTMLCanvasElement";
      }
      else if (element instanceof HTMLVideoElement)
      {
        this.element_type = "HTMLVideoElement";
        console.log("WebGLDebugger has no support for Video Textures");
      }
      else if (element instanceof ImageData)
      {
        var canvas = document.createElement("canvas");
        canvas.height = element.height;
        canvas.width = element.width;

        var canvas_ctx = canvas.getContext("2d");
        canvas_ctx.putImageData(element, 0, 0);

        this.img = canvas.toDataURL("image/png");
        this.element_type = "ImageData";
      }
      else if (element instanceof Uint8Array ||
           element instanceof Uint16Array ||
           element instanceof Uint32Array)
      {
        var canvas = document.createElement("canvas");
        var canvas_ctx = canvas.getContext("2d");

        var imgData = canvas_ctx.createImageData(this.width, this.height);
        var height = this.height;
        var width = this.width;
        var pix = imgData.data;
        var format;
        var alphaOffset=0;

        // Flipping the image on the y-axis because
        // imgData is drawn from top left to right.
        // The UintArary is bottom left to right.
        if (this.format === gl.RGB)
        {
          for (var i=0; i<height; i++)
          {
            for (var j=0; j<width*3; j += 3)
            {
              pix[j+i*width*3+alphaOffset] = element[j+(height-1-i)*width*3];
              pix[j+i*width*3+1+alphaOffset] = element[j+(height-1-i)*width*3+1];
              pix[j+i*width*3+2+alphaOffset] = element[j+(height-1-i)*width*3+2];
              pix[j+i*width*3+3+alphaOffset] = 255; // Set alpha channel to opaque
              alphaOffset += 1;
            }
          }
        }
        else if (this.format === gl.RGBA)
        {
          for (var i=0; i<height; i++)
          {
            for (var j=0; j<width*4; j += 4)
            {
              pix[j+i*width*4] = element[j+(height-1-i)*width*4];
              pix[j+i*width*4+1] = element[j+(height-1-i)*width*4+1];
              pix[j+i*width*4+2] = element[j+(height-1-i)*width*4+2];
              pix[j+i*width*4+3] = element[j+(height-1-i)*width*4+3];
            }
          }
        }
        else
        {
          console.log("WebGLDebugger: Unknown texture format");
        }

        canvas_ctx.putImageData(imgData, 0, 0);
        this.img = canvas.toDataURL("image/png");
        this.element_type = "ArrayBufferView";
      }
      else
      {
        console.log("WebGLDebugger ERROR, unknown texture type. Type is:" + this.toString());
      }

      return this;
    };

    /* Get non-state specific program information
     * @param {WebGLProgram} program Program from which to get information
     */
    this.get_program_info = function (program)
    {
      var program_info = this.lookup_program(program);
      return {
        index : program_info.index,
        shaders : program_info.shaders.map(function (s) { return {index:s.index, src:s.src, type:s.type}; }),
        attributes : program_info.attributes,
        uniforms : program_info.uniforms.map(function (u) { return {index:u.index, name:u.name, size:u.size, type:u.type}; })
      };
    };

    this.get_program_state = function(program)
    {
      var gl = this.context;

      program = program || gl.getParameter(gl.CURRENT_PROGRAM);

      if (!program)
      {
        return null;
      }

      var program_obj = this.lookup_program(program);

      var state =
      {
        program : program_obj.index,
        shaders : program_obj.shaders.map(function (s) { return {index:s.index, src:s.src, type:s.type}; }),
        attributes : [],
        uniforms : []
      };

      for (var a in program_obj.attributes)
      {
        var attribute = program_obj.attributes[a];
        var binding = gl.getVertexAttrib(attribute.loc, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
        var buffer_binding = binding ? this.lookup_buffer(binding) : null;
        state.attributes.push({
          name : attribute.name,
          loc  : attribute.loc,
          type : attribute.type,
          size : attribute.size,
          binding : buffer_binding ? buffer_binding.index : null
        });
      }


      for (var index=0; index<program_obj.uniforms.length; index++)
      {
        var uniform = program_obj.uniforms[index];
        var value = gl.getUniform(program, uniform.loc);
        state.uniforms.push({
          name : uniform.name,
          index  : index,
          //loc  : uniform.loc,
          type : uniform.type,
          size : uniform.size,
          value : value
        });

      }

      return state;
    };
  }

  /**
   * Queues messages for pickup by Dragonfly.
   */
  function MessageQueue(name, source, ready)
  {
    this.name = name;
    this.source = source;
    this.ready = Boolean(ready);
    this.running = false;
    this.messages = [];
  }
  MessageQueue.prototype.post = function (message)
  {
    this.messages.push(message);
    if (!this.running && this.ready)
    {
      this.source.dispatchEvent(new Event(this.name));
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
      this.source.dispatchEvent(new Event(this.name));
      this.running = true;
    }
    this.ready = true;
  };

  var _snapshot_index = 0;

  function Snapshot(handler)
  {
    this.index = _snapshot_index++;
    this.handler = handler;

    this.call_index = -1;
    this.calls = [];
    this.call_refs = [];

    this.drawcalls = [];
    this.buffers = [];
    this.programs = [];
    this.textures = [];

    /* Gather initial information about the state of WebGL */
    var init = function ()
    {
      var h = this.handler;

      var init_buffers = function ()
      {
        for (var i=0; i<h.buffers.length; i++)
        {
          this.add_buffer(h.buffers[i]);
        }
      }.bind(this);

      var init_programs = function ()
      {
        for (var i=0; i<h.programs.length; i++)
        {
          var prg = h.programs[i];

          var program_state = {
            call_index : this.call_index,
            index : prg.index,
            shaders : prg.shaders,
            attributes : prg.attributes,
            uniforms : prg.uniforms
          };

          this.programs.push(program_state);
        }
      }.bind(this);

      init_buffers();
      init_programs();
      //init_textures();
      //init_fbos();

      this.call_index++;
    }.bind(this);

    /* Adds a WebGL function call to the snapshot */
    this.add_call = function (function_name, error, args, result)
    {
      /**
       * Pairs a trace argument with a WebGL object.
       * Creates a object for easy pairing on the Dragonfly side.
       */
      var object_type_regexp = /^\[object (.*?)\]$/;
      var make_trace_argument_object = function (obj, args)
      {
        var type = obj.constructor.name;
        if (type === "Function.prototype")
        {
          var re = object_type_regexp.exec(Object.prototype.toString.call(obj));
          if (re != null && re[1] != null) type = re[1];
        }
        var target = obj;

        var arg = {};
        arg.type = type;
        if (obj instanceof Array || (obj.buffer && obj.buffer instanceof ArrayBuffer))
        {
          arg.data = new (eval(type))(obj);
          // TODO quick temporary solution using eval, perhaps we can just transfer the data as a regular array.
          //arg.data = obj;
        }
        else if (obj instanceof WebGLUniformLocation)
        {
          var uniform = handler.lookup_uniform(obj);
        }
        else if (obj instanceof WebGLBuffer)
        {
          var buffer = handler.lookup_buffer(obj);
          arg.buffer_index = buffer.index;
        }
        else if (obj instanceof WebGLProgram)
        {
          var program = handler.lookup_program(obj);
          target = program.index;
        }
        else if (obj instanceof WebGLTexture)
        {
          var texture = handler.lookup_texture(obj);
          arg.texture_index = texture.index;
        }
        return arg;
      }

      var call_args = [];

      for (var i = 0; i < args.length; i++)
      {
        if (typeof(args[i]) === "object" && args[i] !== null)
        {
          var obj = args[i];
          var trace_ref = make_trace_argument_object(obj);
          var trace_ref_index = this.call_refs.push(trace_ref) - 1;
          call_args.push("@" + String(trace_ref_index));
        }
        else
        {
          call_args.push(args[i]);
        }
      }

      var res = result === undefined ? "" : result;

      this.call_index = this.calls.push([function_name, error, res].concat(call_args).join("|")) - 1;
    };

    this.add_drawcall = function (fbo, program)
    {
      var program_obj = this.handler.lookup_program(program);

      this.drawcalls.push({
        call_index : this.call_index,
        fbo : fbo,
        program_index : program_obj.index
      });
    };

    /* Adds a buffer state to the snapshot */
    this.add_buffer = function (buffer)
    {
      var buffer_state = {
        call_index : this.call_index,
        index : buffer.index,
        //buffer : buffer.buffer
      };

      if (buffer.data)
      {
        buffer_state.data = buffer.data;
        buffer_state.size = buffer.size;
        buffer_state.target = buffer.target;
        buffer_state.usage = buffer.usage;
      }

      this.buffers.push(buffer_state);
    }

    /* Wraps up the frame in a complete package for transmission to DF */
    this.end = function()
    {
      return {
        index : this.index,
        calls : this.calls,
        call_refs : this.call_refs,
        buffers : this.buffers,
        programs : this.programs,
        textures : this.textures,
        drawcalls : this.drawcalls
      }
    };

    init();
  }

  function Trace()
  {
    this.calls = [];
    this.objects = [];
  }

  return canvas_map;
};
