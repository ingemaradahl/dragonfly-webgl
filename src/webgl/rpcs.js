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
  // Global events, is populated below the definition of the MessageQueue.
  var events = {};

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
   * Clone regular and typed arrays.
   */
  function clone_array(array)
  {
    if (array instanceof Array) return Array.prototype.slice.call(array);
    else if (array instanceof Float32Array) return new Float32Array(array);
    else if (array instanceof Float64Array) return new Float64Array(array);
    else if (array instanceof Int16Array) return new Int16Array(array);
    else if (array instanceof Int32Array) return new Int32Array(array);
    else if (array instanceof Int8Array) return new Int8Array(array);
    else if (array instanceof Uint16Array) return new Uint16Array(array);
    else if (array instanceof Uint32Array) return new Uint32Array(array);
    else if (array instanceof Uint8Array) return new Uint8Array(array);
    return null;
  }

  /**
   * Wrap all WebGL functions, copy all other values and create a handler
   */
  function wrap_context(canvas)
  {
    // We will keep all native functions and enumerators in this object
    var gl = {};

    var handler = new Handler(this, gl, canvas);

    // Stores the oldest error that have occured since last call to getError
    // When there have been no error it should have the value NO_ERROR
    var oldest_error = this.NO_ERROR;

    function wrap_function(handler, function_name, original_function, innerFuns, snapshot_functions)
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
          var loc;
          try
          {
            cause_error += 1;
          }
          catch (e)
          {
            var caller = arguments.callee.caller;
            loc = analyse_stacktrace(e.stacktrace, caller);
          }

          handler.snapshot.add_call(function_name, error, arguments, result, redundant, loc);

          var snapshot_function = snapshot_functions[function_name];
          if (snapshot_function)
          {
            snapshot_function.call(handler, result, arguments, redundant);
          }
        }
        return result;
      };
    }

    var stacktrace_regexp = new RegExp("^called from line (\\d+), column (\\d+) in ([^(]+)\\([^)]*\\) in (.+):$");
    function analyse_stacktrace(stacktrace, caller)
    {
      var lines = stacktrace.split("\n");
      if (lines.length < 3) return null;
      var matches = stacktrace_regexp.exec(lines[2]);
      if (matches.length < 5) return null;
      return {
        line: Number(matches[1]),
        column: Number(matches[2]),
        caller_name: matches[3],
        url: matches[4],
        caller_function: caller
      };
    }

    var innerFuns = {};
    innerFuns.bindFramebuffer = function(result, args)
    {
      //var target = args[0];
      var framebuffer = args[1];
      var redundant = this.framebuffer_binding === framebuffer;
      this.framebuffer_binding = framebuffer;

      return redundant;
    };
    innerFuns.createBuffer = function(buffer, args)
    {
      var buf = {};
      buf.buffer = buffer;
      var i = this.buffers.push(buf);
      buf.index = i - 1;
      buf.data = [];
      buf.layouts = [];
    };
    innerFuns.bindBuffer = function(result, args)
    {
      var target = args[0];
      var buffer = this.lookup_buffer(args[1]);
      if (buffer == null) return;

      var redundant = this.buffer_binding[target] === buffer;
      this.buffer_binding[target] = buffer;

      return redundant;
    };
    innerFuns.bufferData = function(result, args)
    {
      var target = args[0];
      var buffer = this.buffer_binding[target];
      if (!buffer) return;

      var redundant = false;
      if (typeof(args[1]) === "number")
      {
        redundant = buffer.data.length === 0;
        buffer.size = args[1];
        buffer.data = [];
      }
      else
      {
        var new_data = args[1];
        if (new_data.length === buffer.length)
        {
          redundant = true;
          for (var i in new_data)
          {
            if (new_data[i] !== buffer.data[i])
            {
              redundant = false;
              break;
            }
          }
        }
        buffer.size = new_data.byteLength;
        buffer.data = clone_array(new_data);
        // TODO: Make data cloning a selectable option?
      }
      buffer.constructor = args[1].constructor.name;
      buffer.target = target;
      buffer.usage = args[2];
      return redundant;
    };
    innerFuns.bufferSubData = function(result, args)
    {
      var target = args[0];
      var offset = args[1];
      var buffer = this.buffer_binding[target];
      if (!buffer) return;

      var new_data = args[2];
      var end = new_data.length - offset;
      var redundant = true;
      for (var i = 0; i < end; i++)
      {
        if (buffer.data[i + offset] !== new_data[i])
        {
          redundant = false;
          buffer.data[i + offset] = new_data[i];
        }
      }
      return redundant;
    };
    innerFuns.deleteBuffer = function(result, args)
    {
      var buffer = this.lookup_buffer(args[0]);
      if (buffer == null) return;
      this.buffers.splice(buffer.index, 1);

      for (var target in this.buffer_binding)
      {
        if (this.buffer_binding[target] === buffer)
        {
          this.buffer_binding[target] = null;
        }
      }
    };


    // Texture code
    innerFuns.activeTexture = function(result, args)
    {
      var texture_unit = args[0];
      var redundant = this.active_texture === texture_unit;
      this.active_texture = texture_unit;

      return redundant;
    };

    innerFuns.bindTexture = function(result, args)
    {
      var target = args[0];
      var texture = args[1];

      var redundant = this.texture_binding[target] === texture;
      this.texture_binding[target] = texture;

      return redundant;
    };

    innerFuns.createTexture = function(texture, args)
    {
      var tex = {};
      tex.texture = texture;
      var i = this.textures.push(tex);
      tex.index = i - 1;
    };

    innerFuns.deleteTexture = function(result, args)
    {
      var texture = this.lookup_texture(args[0]);
      if (texture == null) return;
      this.textures.splice(texture.index, 1);
      for (var target in this.texture_binding)
      {
        if (this.texture_binding[target] === texture)
        {
          this.texture_binding[target] = null;
        }
      }
    };

    // TODO All texImage functions must be wrapped and handled
    innerFuns.texImage2D = function(result, args)
    {
      // Last argument is the one containing the texture data.
      var texture_container_object = args[args.length-1];

      var target = args[0];
      var bound_texture = this.texture_binding[target];
      var internalFormat = args[2];

      for (var i=0; i<this.textures.length; i++)
      {
        if (this.textures[i].texture === bound_texture)
        {
          var texture = {
            index : this.textures[i].index,
            texture : bound_texture,
            object : texture_container_object,
            type : texture_container_object ? texture_container_object.toString() : null,
            internalFormat : internalFormat,
            texture_wrap_s : gl.getTexParameter(target, gl.TEXTURE_WRAP_S),
            texture_wrap_t : gl.getTexParameter(target, gl.TEXTURE_WRAP_T),
            texture_min_filter : gl.getTexParameter(target, gl.TEXTURE_MIN_FILTER),
            texture_mag_filter : gl.getTexParameter(target, gl.TEXTURE_MAG_FILTER),
          };

          if (args.length === 9)
          {
            texture.internalFormat = args[2];
            texture.width = args[3];
            texture.height = args[4];
            texture.border = args[5];
            texture.format = args[6];
            texture.type = args[7];
          }
          else
          {
            texture.format = args[3];
            texture.type = args[4];
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
        var uniform_value = gl.getUniform(program, loc);
        var value;
        if (typeof(uniform_value) === "object")
        {
          value = [];
          value.length = uniform_value.length;
        }
        else
        {
          value = uniform_value;
        }

        uniforms.push({
          name : active_uniform.name,
          index : i,
          locations : [],
          type : active_uniform.type,
          size : active_uniform.size,
          value : value,
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
          size : active_attribute.size,
          pointer : {layout : null, buffer_index:null}
        });
      }
      program_obj.attributes = attributes;
    };

    innerFuns.vertexAttribPointer = function(result, args)
    {
      var buffer = this.buffer_binding[this.gl.ARRAY_BUFFER];
      var program = this.lookup_program(this.bound_program);

      var index = args[0];
      var size = args[1];
      var type = args[2];
      var normalized = args[3];
      var stride = args[4];
      var offset = args[5];

      var redundant = false;

      var layout = {
        index : index,
        size : size,
        type : type,
        normalized : normalized,
        stride : stride,
        offset : offset
      };

      // A bit ugly, but optimized for speed not beauty
      for (var i=0; i<program.attributes.length; i++)
      {
        var attrib = program.attributes[i];
        if (attrib.loc !== index) continue;

        var l = attrib.pointer.layout;
        if (attrib.pointer.buffer_index === buffer.index &&
            l.size === layout.size &&
            l.type === layout.type &&
            l.normalized === layout.normalized &&
            l.stride === layout.stride &&
            l.offset === layout.offset)
        {
          redundant = true;
          break;
        }
        else
        {
          attrib.pointer = {
            buffer_index : buffer.index,
            layout : layout
          };
          break;
        }
      }

      return redundant;
    };

    // Uniforms
    innerFuns.getUniformLocation = function(result, args)
    {
      // WebGLUniformLocation objects can not be compared in the way we want to,
      // so therefore we need to store all the created objects and compare
      // against them.
      var program = this.lookup_program(args[0]);
      if (program == null) return;

      for (var i = 0; i < program.uniforms.length; i++)
      {
        var uniform = program.uniforms[i];
        if (uniform.name === args[1])
        {
          program.uniforms[i].locations.push(result);
          return;
        }
      }
    };
    innerFuns.uniform1i = function(result, args)
    {
      var uniform_info = this.lookup_uniform(args[0]);
      if (uniform_info == null) return;

      var uniform = this.programs[uniform_info.program_index].uniforms[uniform_info.uniform_index];
      var value = args[1];
      if (uniform.value !== value)
      {
        uniform.value = value;
        return false;
      }
      return true;
    };
    innerFuns.uniform1f = innerFuns.uniform1i;

    innerFuns.uniform2i = function(result, args)
    {
      var uniform_info = this.lookup_uniform(args[0]);
      if (uniform_info == null) return;

      var uniform = this.programs[uniform_info.program_index].uniforms[uniform_info.uniform_index];
      var values = Array.prototype.slice.call(args, 1);
      var redundant = true;
      var length = Math.min(uniform.value.length, values.length);
      for (var i = 0; i < length; i++)
      {
        if (uniform.value[i] !== values[i])
        {
          uniform.value[i] = values[i];
          redundant = false;
        }
      }
      return redundant;
    };
    innerFuns.uniform2f = innerFuns.uniform2i;
    innerFuns.uniform3i = innerFuns.uniform2f;
    innerFuns.uniform3f = innerFuns.uniform3i;
    innerFuns.uniform4i = innerFuns.uniform3f;
    innerFuns.uniform4f = innerFuns.uniform4i;

    innerFuns.uniform2iv = innerFuns.uniform2i;
    innerFuns.uniform2fv = innerFuns.uniform2iv;
    innerFuns.uniform3iv = innerFuns.uniform2fv;
    innerFuns.uniform3fv = innerFuns.uniform3iv;
    innerFuns.uniform4iv = innerFuns.uniform3fv;
    innerFuns.uniform4fv = innerFuns.uniform4iv;

    innerFuns.uniformMatrix2fv = function(result, args)
    {
      var uniform_info = this.lookup_uniform(args[0]);
      if (uniform_info == null) return;

      var uniform = this.programs[uniform_info.program_index].uniforms[uniform_info.uniform_index];
      var values = args[2];
      var redundant = true;
      var length = uniform.value.length;
      for (var i = 0; i < length; i++)
      {
        if (uniform.value[i] !== values[i])
        {
          uniform.value[i] = values[i];
          redundant = false;
        }
      }
      return redundant;
    };
    innerFuns.uniformMatrix3fv = innerFuns.uniformMatrix2fv;
    innerFuns.uniformMatrix4fv = innerFuns.uniformMatrix3fv;

    // -------------------------------------------------------------------------

    /* Functions called only during a snapshot recording changes to the WebGL
     * state
     */
    var snapshot_functions = {};
    var draw_call = function (function_name)
    {
      return function(result, args)
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

        // Encode to PNG
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");

        var img_data = ctx.createImageData(width, height);

        for (var i=0; i<size; i+=4)
        {
          img_data.data[i] = pixels[i];
          img_data.data[i+1] = pixels[i+1];
          img_data.data[i+2] = pixels[i+2];
          img_data.data[i+3] = pixels[i+3];
        }

        ctx.putImageData(img_data, 0, 0);

        // Figure out buffer binding, which buffer we are drawing
        var target = function_name === "drawArrays" ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;
        var buffer = this.buffer_binding[target];

        var img = {
          data : canvas.toDataURL("image/png"),
          width : width,
          height : height,
          flipped : true
        };

        var program_state = this.get_program_state();

        this.snapshot.add_drawcall(img, target, buffer.index, program_state);

        // Check whether an color attachment texture have been drawn to
        if (fbo)
        {
          var tex = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
          var texture = this.lookup_texture(tex);
          if (texture && texture.width === width && texture.height === texture.height)
          {
            this.snapshot.add_texture(texture, {data: img.data, flipped : img.flipped});
          }
          else if (texture)
          {
            //this.add_texture(texture);

            // The only difference between the texture calculated by readpixels
            // above and the true texture is scale/aspect ratio. To find out the
            // _true_ texture, it has to be drawn to a framebuffer, so for now
            // ignore this..
            this.snapshot.add_texture(texture, {data: img.data, flipped : img.flipped});
          }
        }

      };
    };

    snapshot_functions.drawArrays = draw_call("drawArrays");
    snapshot_functions.drawElements = draw_call("drawElements");

    snapshot_functions.bufferData = function (result, args)
    {
      var target = args[0];
      var buffer = this.buffer_binding[target];
      if (!buffer) return;

      this.snapshot.add_buffer(buffer);
    };
    snapshot_functions.bufferSubData = snapshot_functions.bufferData;

    snapshot_functions.texImage2D = function (result, args)
    {
      var target = args[0];
      var texture = this.texture_binding[target];

      this.snapshot.add_texture(texture);
    };

    var snapshot_function_uniform = function(result, args, redundant)
    {
      if (redundant) return;
      var uniform_info = this.lookup_uniform(args[0]);
      if (uniform_info == null) return;

      var uniform = this.programs[uniform_info.program_index].uniforms[uniform_info.uniform_index];
      this.snapshot.add_uniform(uniform);
    };

    var uniform_functions = [
      "uniform1i",
      "uniform1f",
      "uniform2i",
      "uniform2f",
      "uniform3i",
      "uniform3f",
      "uniform4i",
      "uniform4f",
      "uniform2iv",
      "uniform2fv",
      "uniform3iv",
      "uniform3fv",
      "uniform4iv",
      "uniform4fv",
      "uniformMatrix2fv",
      "uniformMatrix3fv",
      "uniformMatrix4fv"
    ];
    uniform_functions.forEach(function(name)
      {
        snapshot_functions[name] = snapshot_function_uniform;
      }
    );

    // -------------------------------------------------------------------------

    // Copy enumerators and wrap functions
    for (var i in this)
    {
      if (typeof this[i] === "function")
      {
        gl[i] = this[i].bind(this);
        this[i] = wrap_function(handler, i, this[i], innerFuns, snapshot_functions);
      }
      else
      {
        gl[i] = this[i];
      }
    }

    this.new_frame = function()
    {
      handler.current_frame++;

      if (handler.capturing_frame) {
        handler.capturing_frame = false;
        console.log("Frame have been captured.");
        events["snapshot-completed"].post({
          context: handler._interface, // Used to connect the snapshot to a context
          snapshot: handler.snapshot.end()
        });
        handler.snapshot = null;
      }

      if (handler.capture_next_frame)
      {
        handler.capture_next_frame = false;
        handler.capturing_frame = true;
        handler.snapshot = new Snapshot(handler);
      }
    };

    //canvas.onframeend = this.new_frame.bind(this);

    var orig_getError = this.getError;
    this.getError = function()
    {
      orig_getError.call(this);

      var error = oldest_error;
      oldest_error = gl.NO_ERROR;
      return error;
    };

    return handler;
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

    var handler = wrap_context.call(gl, this);

    events["new-context"].post(handler.get_interface());

    return gl;
  };

  /**
   * Handles communication between the wrapped context and Dragonfly.
   */
  function Handler(context, gl, canvas)
  {
    this.gl = gl;
    this.context = context;

    this.current_frame = 0;

    this.capture_next_frame = false;
    this.capturing_frame = false;

    this.snapshot = null;

    this.framebuffer_binding = null;

    this.programs = [];
    this.shaders = [];
    this.bound_program = null;

    this.buffers = [];
    this.buffer_binding = {};


    this.textures = [];
    this.texture_binding = {};
    this.active_texture = null; //gl.getParameter(gl.ACTIVE_TEXTURE);

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
      for (var key in events) // TODO this only needs to be done once per page
      {
        if (events.hasOwnProperty(key))
        {
          events[key].set_ready();
        }
      }
    };
    this._interface.debugger_ready = this.debugger_ready.bind(this);


    var generic_lookup = function(list, subkey)
    {
      return function(value)
      {
        for(var key in list)
        {
          if(list[key] != null && list[key][subkey] === value) return list[key];
        }
        return null;
      };
    };

    this.lookup_buffer = generic_lookup(this.buffers, "buffer");

    this.lookup_texture = generic_lookup(this.textures, "texture");

    this.lookup_program = generic_lookup(this.programs, "program");

    this.lookup_shader = generic_lookup(this.shaders, "shader");

    this.lookup_uniform = function(uniform_location)
    {
      // Return the program object containing the requested WebGLUniformLocation
      for (var p in this.programs)
      {
        var program = this.programs[p];
        for (var u in program.uniforms)
        {
          var locations = program.uniforms[u].locations;
          for (var l in locations)
          {
            if (locations[l] === uniform_location)
            {
              return {program_index: p, uniform_index: u};
            }
          }
        }
      }
      return null;
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
        uniforms : program_info.uniforms.map(function (u) { return {index:u.index, name:u.name, size:u.size, type:u.type, values:[{call_index: -1, value:u.value}]}; })
      };
    };

    this.get_program_state = function(program)
    {
      program = program || this.bound_program || gl.getParameter(gl.CURRENT_PROGRAM);

      if (!program)
        return null;

      var gl = this.gl;
      var program_obj = this.lookup_program(program);

      var state =
      {
        index : program_obj.index,
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
          pointer : attribute.pointer
        });
      }

      for (var index=0; index<program_obj.uniforms.length; index++)
      {
        var uniform = program_obj.uniforms[index];
        state.uniforms.push({
          name : uniform.name,
          index  : index,
          type : uniform.type,
          size : uniform.size,
          values : [{
            call_index: -1,
            value: uniform.value
          }]
        });
      }

      return state;
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

  var _snapshot_index = 0;

  function Snapshot(handler)
  {
    this.index = _snapshot_index++;
    this.handler = handler;

    this.frame = handler.current_frame;

    this.call_index = -1;
    this.calls = [];
    this.call_locs = [];
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
          var info = this.handler.get_program_info(prg.program);

          this.programs.push(info);
        }
      }.bind(this);

      init_buffers();
      init_programs();

      // Init textures
      this.handler.textures.forEach(this.add_texture, this);
      //init_fbos();

      this.call_index++;
    }.bind(this);

    /* Adds a WebGL function call to the snapshot */
    this.add_call = function (function_name, error, args, result, redundant, loc)
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

        var arg = {};
        arg.type = type;
        if (obj instanceof Array || (obj.buffer && obj.buffer instanceof ArrayBuffer))
        {
          arg.data = clone_array(obj);
        }
        else if (obj instanceof WebGLUniformLocation)
        {
          var uniform_info = handler.lookup_uniform(obj);
          if (uniform_info != null)
          {
            arg.program_index = uniform_info.program_index;
            arg.uniform_index = uniform_info.uniform_index;
          }
        }
        else if (obj instanceof WebGLBuffer)
        {
          var buffer = handler.lookup_buffer(obj);
          if (buffer == null) return arg;
          arg.buffer_index = buffer.index;
        }
        else if (obj instanceof WebGLProgram)
        {
          var program = handler.lookup_program(obj);
          if (program == null) return arg;
          arg.program_index = program.index;
        }
        else if (obj instanceof WebGLTexture)
        {
          var texture = handler.lookup_texture(obj);
          if (texture == null) return arg;
          arg.texture_index = texture.index;
        }
        return arg;
      };

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

      // TODO: better fix
      // http://www.glge.org/demos/canvasdemo/ (and possibly all GLGE
      // applications?) adds an extra parameter to texImage2D, rendering the
      // arguments "decoding" heuristic in DF invalid
      if (function_name === "texImage2D")
      {
        call_args = call_args.slice(0, 9);
        if (call_args.length > 6 && call_args.length < 9)
        {
          call_args = call_args.slice(0, 6);
        }
      }

      this.call_locs.push(loc);

      var res = result === undefined ? "" : result;

      // Ternary expression below casts redundant, which may be undefined, to a boolean,
      this.call_index = this.calls.push([function_name, error, res, redundant ? true : false].concat(call_args).join("|")) - 1;
    };

    this.add_drawcall = function (fbo, buffer_target, buffer_index, program_state)
    {

      this.drawcalls.push({
        call_index : this.call_index,
        fbo : fbo,
        program : program_state,
        element_buffer : buffer_target === this.handler.gl.ELEMENT_ARRAY_BUFFER ? buffer_index : undefined
      });
    };

    /* Adds a buffer state to the snapshot */
    this.add_buffer = function (buffer)
    {
      var buffer_state = {
        call_index : this.call_index,
        index : buffer.index,
      };

      if (buffer.data)
      {
        buffer_state.data = buffer.data;
        buffer_state.size = buffer.size;
        buffer_state.usage = buffer.usage;
        buffer_state.target = buffer.target;
        buffer_state.constructor = buffer.constructor;
      }

      this.buffers.push(buffer_state);
    };

    this.add_texture = function (texture, texture_data)
    {
      texture = texture instanceof WebGLTexture ? this.handler.lookup_texture(texture) : texture;

      if (!texture)
        return;

      /* Calculates texture data in a scope transission friendly way.
       * This function is never bound to the Handler object, but a texture object,
       * thus "this" refers to that object.
       */
      var get_texture_data = function (element)
      {
        this.img = { flipped : false };


        if (element instanceof HTMLImageElement)
        {
          var canvas = document.createElement("canvas");
          canvas.height = element.height;
          canvas.width = element.width;

          var canvas_ctx = canvas.getContext("2d");
          canvas_ctx.drawImage(element, 0, 0);
          this.img.data = canvas.toDataURL("image/png");
          this.img.source = element.src;
          this.element_type = "HTMLImageElement";
          this.width = element.width;
          this.height = element.height;
        }
        else if (element instanceof HTMLCanvasElement)
        {
          this.img.data = element.toDataURL("image/png");
          this.element_type = "HTMLCanvasElement";
          this.width = element.width;
          this.height = element.height;
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

          this.img.data = canvas.toDataURL("image/png");
          this.element_type = "ImageData";
          this.width = element.width;
          this.height = element.height;
        }
        else if (element instanceof Uint8Array ||
             element instanceof Uint16Array ||
             element instanceof Uint32Array)
        {
          var canvas = document.createElement("canvas");
          var canvas_ctx = canvas.getContext("2d");

          var imgData = canvas_ctx.createImageData(this.width, this.height);
          var size = this.width * this.height;
          var pix = imgData.data;

          if (this.format === gl.RGB)
          {
            for (var i=0; i<size; i += 4)
            {
              pix[i] = element[i];
              pix[i+1] = element[i+1];
              pix[i+2] = element[i+2];
              pix[i+4] = 255; // Set alpha channel to opaque
            }
          }
          else if (this.format === gl.RGBA)
          {
            for (var i=0; i<size; i += 4)
            {
              pix[i] = element[i];
              pix[i+1] = element[i+1];
              pix[i+2] = element[i+2];
              pix[i+3] = element[i+3];
            }
          }
          else
          {
            console.log("WebGLDebugger: Unknown texture format");
          }

          canvas_ctx.putImageData(imgData, 0, 0);
          this.img.data = canvas.toDataURL("image/png");
          this.img.flipped = true;
          this.element_type = "ArrayBufferView";
        }
        else
        {
          // TODO: Draw texture to a new FBO, thes same as Uint8Array
        }

        return this;
      };

      // Clone data to new object, which is later released by scope
      var texture_state = {
        call_index : this.call_index,
        index : texture.index,
      };

      //if (texture.object)
      //{
        texture_state.texture_mag_filter = texture.texture_mag_filter;
        texture_state.texture_min_filter = texture.texture_min_filter;
        texture_state.texture_min_filter = texture.texture_min_filter;
        texture_state.texture_wrap_s = texture.texture_wrap_s;
        texture_state.texture_wrap_t = texture.texture_wrap_s;
        texture_state.internalFormat = texture.internalFormat;
        texture_state.format = texture.format;
        texture_state.type = texture.type;

        if (texture.width)
        {
          texture_state.width = texture.width;
          texture_state.height = texture.height;
        }
      //}

      // Add texture data
      if (texture_data instanceof Object)
      {
        texture_state.img = texture_data;
      }
      else {
        get_texture_data.call(texture_state, texture.object);
      }

      this.textures.push(texture_state);
    };

    this.add_uniform = function (uniform)
    {
      var value = uniform.value;
      if (typeof(value) === "object") value = clone_array(value);
      var values = this.programs[uniform.program_index].uniforms[uniform.index].values;
      values.push({
        call_index: this.call_index,
        value: value
      });
    };

    /* Wraps up the frame in a complete package for transmission to DF */
    this.end = function()
    {
      return {
        index : this.index,
        frame : this.frame,
        calls : this.calls,
        call_locs : this.call_locs,
        call_refs : this.call_refs,
        buffers : this.buffers,
        programs : this.programs,
        textures : this.textures,
        drawcalls : this.drawcalls
      };
    };

    init();
  }

  events["new-context"] = new MessageQueue("webgl-debugger-ready", true);
  events["snapshot-completed"] = new MessageQueue("webgl-snapshot-completed");

  var event_getters = {};
  for (var key in events)
  {
    if (!events.hasOwnProperty(key)) continue;
    event_getters[key] = events[key].get.bind(events[key]);
  }

  return event_getters;
};
