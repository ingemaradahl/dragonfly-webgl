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

/**
 * Calls a function bound by scope to the variable name f
 */
cls.WebGL.RPCs.call_function = function()
{
  return f();
};


cls.WebGL.RPCs.injection = function () {
  // Settings are set by Scope
  var settings = _scope_settings || {};

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
  window.webkitRequestAnimationFrame = window.mozRequestAnimationFrame = window.requestAnimationFrame;

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
   * Shallow clone of objects
   */
  function clone_object(obj)
  {
    var ret = {};
    for (var key in obj)
    {
      if (obj.hasOwnProperty(key))
        ret[key] = obj[key];
    }

    return ret;
  }

  /**
   * Wrap all WebGL functions, copy all other values and create a handler
   */
  function wrap_context(canvas)
  {
    // We will keep all native functions and enumerators in this object
    var gl = {};

    var handler = new Handler(this, gl, canvas, settings);

    // Stores the oldest error that have occured since last call to getError
    // When there have been no error it should have the value NO_ERROR
    var oldest_error = this.NO_ERROR;

    function wrap_function(handler, function_name, original_function, innerFuns, snapshot_functions, history_functions)
    {
      var gl = handler.gl;

      var innerFunction = innerFuns[function_name];
      var history_function = history_functions[function_name];

      return function ()
      {
        // Discard eventual error produced by function wrapping
        gl.getError();

        // Execute original function and save result.
        // TODO catch exceptions
        var result = original_function.apply(this, arguments);
        var redundant = false;

        var error = gl.getError();
        if (error !== gl.NO_ERROR)
        {
          if (oldest_error === gl.NO_ERROR)
          {
            oldest_error = error;
          }
        }
        else if (innerFunction)
        {
          redundant = innerFunction.call(handler, result, arguments);
        }

        if (handler.capturing_frame || history_function)
        {
          var loc;
          try
          {
            cause_error += 1;
          }
          catch (e)
          {
            loc = analyse_stacktrace(e.stacktrace);
          }

          if (handler.capturing_frame)
          {
            handler.snapshot.add_call(function_name, error, arguments, result, redundant, loc);

            var snapshot_function = snapshot_functions[function_name];
            if (snapshot_function)
            {
              snapshot_function.call(handler, result, arguments, redundant);
            }
          }

          if (history_function)
          {
            history_function.call(handler, result, arguments, function_name, loc);
          }
        }
        return result;
      };
    }

    var stacktrace_regexp = new RegExp("^called from line (\\d+), column (\\d+) in ([^(]+)\\([^)]*\\) in (.+):$");
    function analyse_stacktrace(stacktrace)
    {
      var lines = stacktrace.split("\n");
      if (lines.length < 3) return null;
      var matches = stacktrace_regexp.exec(lines[2]);
      if (matches == null || matches.length < 5) return null;
      return {
        line: Number(matches[1]),
        column: Number(matches[2]),
        caller_name: matches[3],
        url: matches[4]
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
      this.buffers.push(buf);
      buf.index = this.buffers.number++;
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
        if (typeof(new_data) === "object" && new_data !== null)
        {
          if (new_data.length === buffer.data.length)
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
          buffer.constructor = new_data.constructor.name;
        }
        // TODO: Make data cloning a selectable option?
      }
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
      if (typeof(new_data) !== "object" || new_data == null)
        return false;
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
      var buffer_index = this.lookup_buffer_index(args[0]);
      if (buffer_index == null) return;
      if (this.capturing_frame)
        this.deleted_buffers.push(this.buffers[buffer_index]);
      this.buffers.splice(buffer_index, 1);

      var buffer = this.buffers[buffer_index];
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
      var tex = { levels: [], mipmapped: false };
      tex.texture = texture;
      this.textures.push(tex);
      tex.index = this.textures.number++;
    };

    innerFuns.deleteTexture = function(result, args)
    {
      var texture_index = this.lookup_texture_index(args[0]);
      if (texture_index == null) return;
      if (this.capturing_frame)
        this.deleted_textures.push(this.textures[texture_index]);
      this.textures.splice(texture_index, 1);

      var texture = this.textures[texture_index];
      for (var target in this.texture_binding)
      {
        if (this.texture_binding[target] === texture)
        {
          this.texture_binding[target] = null;
        }
      }
    };

    innerFuns.generateMipmap = function(result, args)
    {
      var target = args[0];
      var texture = this.lookup_texture(this.texture_binding[target]);
      texture.mipmapped = true;
    };

    // TODO All texImage functions must be wrapped and handled
    innerFuns.texImage2D = function(result, args)
    {
      // Last argument is the one containing the texture data.
      var texture_container_object = args[args.length >= 9 ? 8 : 5];

      var target = args[0];
      var bound_texture = this.texture_binding[target];
      var internalFormat = args[2];
      var level = args[1];

      for (var i = 0; i < this.textures.length; i++)
      {
        if (this.textures[i].texture === bound_texture)
        {
          var texture = this.textures[i];
          var mipmap_level = {
            object : texture_container_object,
            level : level
          };

          texture.internalFormat = internalFormat;
          texture.texture_wrap_s = gl.getTexParameter(target, gl.TEXTURE_WRAP_S);
          texture.texture_wrap_t = gl.getTexParameter(target, gl.TEXTURE_WRAP_T);
          texture.texture_min_filter = gl.getTexParameter(target, gl.TEXTURE_MIN_FILTER);
          texture.texture_mag_filter = gl.getTexParameter(target, gl.TEXTURE_MAG_FILTER);

          if (args.length >= 9)
          {
            mipmap_level.width = args[3];
            mipmap_level.height = args[4];
            mipmap_level.border = args[5];

            texture.format = args[6];
            texture.type = args[7];
          }
          else
          {
            texture.format = args[3];
            texture.type = args[4];
          }

          texture.levels[level] = mipmap_level;

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
          name  : active_attribute.name,
          index : a,
          loc   : loc,
          type  : active_attribute.type,
          size  : active_attribute.size,
          pointer : {layout : null, buffer_index:null}
        });
      }
      attributes.reverse();
      program_obj.attributes = attributes;
    };

    innerFuns.vertexAttribPointer = function(result, args)
    {
      var buffer = this.buffer_binding[this.gl.ARRAY_BUFFER];

      var program = this.lookup_program(this.bound_program
        ? this.bound_program
        : this.gl.getParameter(this.gl.CURRENT_PROGRAM));

      if (program == null) return false;

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
      for (var i = 0; i < program.attributes.length; i++)
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
    // TODO below should be able to handle array as second argument instead of a sequence? see spec
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
        var fbo = null;
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

        var img = {
          width : width,
          height : height,
          data : null,
          flipped : false
        };

        if (this.settings['fbo-readpixels'])
        {
          // TODO temporary until improved dimension finding is in place.
          // http://glge.org/demos/cardemo/
          if (!width || !height) return;

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

          // TODO this is so slooooow.
          for (var i=0; i<size; i+=4)
          {
            img_data.data[i] = pixels[i];
            img_data.data[i+1] = pixels[i+1];
            img_data.data[i+2] = pixels[i+2];
            img_data.data[i+3] = pixels[i+3];
          }

          ctx.putImageData(img_data, 0, 0);

          img.data = canvas.toDataURL("image/png");
          img.flipped = true;
        }

        // Figure out buffer binding, which buffer we are drawing
        var target = function_name === "drawArrays" ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;
        var buffer = this.buffer_binding[target];

        var program = this.bound_program || gl.getParameter(gl.CURRENT_PROGRAM);
        var program_index = this.lookup_program(program).index;

        this.snapshot.add_drawcall(img, target, buffer.index, program_index);

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

    snapshot_functions.createBuffer = function (result, args)
    {
      var buf = this.lookup_buffer(result);
      this.snapshot.add_buffer(buf);
    };
    snapshot_functions.bufferData = function (result, args)
    {
      var target = args[0];
      var buffer = this.buffer_binding[target];
      if (!buffer) return;

      this.snapshot.add_buffer(buffer);
    };
    snapshot_functions.bufferSubData = snapshot_functions.bufferData;

    snapshot_functions.createTexture = function (result, args)
    {
      var tex = this.lookup_texture(result);
      this.snapshot.add_texture(tex);
    };
    snapshot_functions.texImage2D = function (result, args)
    {
      var target = args[0];
      var texture = this.texture_binding[target];

      this.snapshot.add_texture(texture);
    };

    snapshot_functions.vertexAttribPointer = function (result, args, redundant)
    {
      if (redundant) return;

      var program = this.bound_program || gl.getParameter(gl.CURRENT_PROGRAM);
      if (!program) return;

      var attribute = args[0];
      this.snapshot.add_attribpointer(this.lookup_program(program), attribute);
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

    function add_history(object, function_name, args, loc, create)
    {
      var call = {
        frame: this.current_frame,
        function_name: function_name,
        loc: loc,
        args: []
      };

      for (var i = 0; i < args.length; i++)
      {
        if (typeof(args[i]) === "object" && args[i] !== null)
        {
          call.args.push("Object");
        }
        else
        {
          call.args.push(args[i]);
        }
      }
      if (object.history == null)
      {
        object.history = [];
        object.history.number = 0;
      }

      if (create)
      {
        object.history.create = call;
      }
      else
      {
        object.history[object.history.number++ % this.settings['history_length']] = call;
      }
    }

    var history_functions = {};

    history_functions.createTexture = function(result, args, function_name, loc)
    {
      var texture = this.lookup_texture(result);
      if (texture == null) return;
      add_history.call(this, texture, function_name, args, loc, true);
    };

    history_functions.texImage2D = function(result, args, function_name, loc)
    {
      var target = args[0];
      var texture = this.texture_binding[target];
      if (texture == null) return;
      texture = this.lookup_texture(texture);
      if (texture == null) return;
      add_history.call(this, texture, function_name, args, loc);
    };
    history_functions.texSubImage2D = history_functions.texImage2D;
    history_functions.generateMipmap = history_functions.texImage2D;

    history_functions.createBuffer = function(result, args, function_name, loc)
    {
      var buffer = this.lookup_buffer(result);
      if (buffer == null) return;
      add_history.call(this, buffer, function_name, args, loc, true);
    };

    history_functions.bufferData = function(result, args, function_name, loc)
    {
      var target = args[0];
      var buffer = this.buffer_binding[target];
      if (buffer == null) return;
      add_history.call(this, buffer, function_name, args, loc);
    };
    history_functions.bufferSubData = history_functions.bufferData;

    // -------------------------------------------------------------------------

    // Copy enumerators and wrap functions
    for (var i in this)
    {
      if (typeof this[i] === "function")
      {
        gl[i] = this[i].bind(this);
        this[i] = wrap_function(handler, i, this[i], innerFuns, snapshot_functions, history_functions);
      }
      else
      {
        gl[i] = this[i];
      }
    }

    var trace_start_time = null;
    this.new_frame = function()
    {
      handler.current_frame++;

      if (handler.capturing_frame) {
        handler.capturing_frame = false;
        var time = new Date() - trace_start_time;
        console.log("Frame have been captured in " + time + " ms.");
        events["snapshot-completed"].post({
          context: handler._interface, // Used to connect the snapshot to a context
          snapshot: handler.snapshot.end()
        });
        handler.snapshot = null;
        handler.deleted_textures.length = 0;
        handler.deleted_buffers.length = 0;
      }

      if (handler.capture_next_frame)
      {
        trace_start_time = new Date();
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
  function Handler(context, gl, canvas, settings)
  {
    this.gl = gl;
    this.context = context;
    this.settings = settings;

    this.current_frame = 0;

    this.capture_next_frame = false;
    this.capturing_frame = false;

    this.snapshot = null;

    this.framebuffer_binding = null;

    this.programs = [];
    this.shaders = [];
    this.bound_program = null;

    this.buffers = [];
    this.buffers.number = 0;
    this.buffers.number_snapshot = 0;
    this.deleted_buffers = [];
    this.buffer_binding = {};

    this.textures = [];
    this.textures.number = 0;
    this.textures.number_snapshot = 0;
    this.deleted_textures = [];
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
    this.request_snapshot = function(settings)
    {
      this.settings = settings;
      this.capture_next_frame = true;
    };
    this._interface.request_snapshot = this.request_snapshot.bind(this);

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

    var generic_lookup_index = function(list, subkey)
    {
      return function(value)
      {
        for(var key in list)
        {
          if (!list.hasOwnProperty(key)) continue;
          if (list[key] != null && list[key][subkey] === value) return key;
        }
        return null;
      };
    };

    var generic_lookup = function(list, subkey)
    {
      var lookup = generic_lookup_index(list, subkey);
      return function(value)
      {
        var index = lookup(value);
        return index === null ? null : list[index];
      };
    };

    this.lookup_buffer = generic_lookup(this.buffers, "buffer");
    this.lookup_buffer_index = generic_lookup_index(this.buffers, "buffer");
    this.lookup_deleted_buffer = generic_lookup(this.deleted_buffers, "buffer");

    this.lookup_texture = generic_lookup(this.textures, "texture");
    this.lookup_texture_index = generic_lookup_index(this.textures, "texture");
    this.lookup_deleted_texture = generic_lookup(this.deleted_textures, "texture");

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
        index: program_info.index,
        shaders: program_info.shaders.map(function (s) { return {index:s.index, src:s.src, type:s.type}; }),
        attributes: program_info.attributes.map(function (a) { return {index:a.index, loc:a.loc, name:a.name, size:a.size, type:a.type, pointers:[{call_index: -1, buffer_index: a.pointer.buffer_index, layout: a.pointer.layout}] }}),
        uniforms: program_info.uniforms.map(function (u) { return {index:u.index, name:u.name, size:u.size, type:u.type, values:[{call_index: -1, value:u.value}]}; })
      };
    };

    /**
     * Gets the WebGL state.
     * @param {String} function_name optional, will limit the returned
     *   parameters to ones that can be modified by the function.
     * @returns {Object} with name and values of parameters.
     */
    this.get_state = function(function_name)
    {
      var function_groups = {
        "activeTexture": "texture",
        "blendColor": "blend",
        "blendEquation": "blend",
        "blendEquationSeparate": "blend",
        "blendFunc": "blend",
        "blendFuncSeparate": "blend",
        "clearColor": "clear",
        "clearDepth": "clear",
        "clearStencil": "clear",
        "colorMask": "color_mask",
        "cullFace": "raster",
        "depthFunc": "depth",
        "depthMask": "depth",
        "depthRange": "depth",
        "disable": "toggle",
        "enable": "toggle",
        "frontFace": "raster",
        "hint": "hint",
        "lineWidth": "raster",
        "pixelStorei": "pixel_store",
        "polygonOffset": "raster",
        "sampleCoverage": "sample",
        "stencilFunc": "stencil",
        "stencilFuncSeparate": "stencil",
        "stencilMask": "stencil",
        "stencilMaskSeparate": "stencil",
        "stencilOp": "stencil",
        "stencilOpSeparate": "stencil",
        "scissor": "viewport",
        "viewport": "viewport",
        "bindBuffer": "buffer",
        "bindFramebuffer": "framebuffer",
        "bindRenderbuffer": "renderbuffer",
        "bindTexture": "texture",
        "useProgram": "program",
      };

      var param_groups = {
        uncategorized: [
          "SAMPLES",
          "SAMPLE_BUFFERS",
          "SAMPLE_COVERAGE_INVERT",
          "SUBPIXEL_BITS",
        ],
        blend: [
          "BLEND_COLOR",
          "BLEND_EQUATION_RGB",
          "BLEND_EQUATION_ALPHA",
          "BLEND_SRC_RGB",
          "BLEND_SRC_ALPHA",
          "BLEND_DST_RGB",
          "BLEND_DST_ALPHA"
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
        color_mask: [
          "COLOR_WRITEMASK"
        ],
        constants: [
          "ALPHA_BITS",
          "RED_BITS",
          "GREEN_BITS",
          "BLUE_BITS",
          "DEPTH_BITS",
          "ALIASED_LINE_WIDTH_RANGE",
          "ALIASED_POINT_SIZE_RANGE",
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
          "DEPTH_WRITEMASK"
        ],
        framebuffer: [
          "FRAMEBUFFER_BINDING"
        ],
        hint: [
          "GENERATE_MIPMAP_HINT"
        ],
        pixel_store: [
          "PACK_ALIGNMENT",
          "UNPACK_ALIGNMENT",
          "UNPACK_COLORSPACE_CONVERSION_WEBGL",
          "UNPACK_FLIP_Y_WEBGL",
          "UNPACK_PREMULTIPLY_ALPHA_WEBGL"
        ],
        program: [
          "CURRENT_PROGRAM"
        ],
        raster: [
          "CULL_FACE_MODE",
          "FRONT_FACE",
          "LINE_WIDTH",
          "POLYGON_OFFSET_FACTOR",
          "POLYGON_OFFSET_UNITS"
        ],
        renderbuffer: [
          "RENDERBUFFER_BINDING"
        ],
        sample: [
          "SAMPLE_COVERAGE_VALUE",
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
          "STENCIL_VALUE_MASK",
          "STENCIL_WRITEMASK"
        ],
        texture: [
          "ACTIVE_TEXTURE",
          "TEXTURE_BINDING_2D",
          "TEXTURE_BINDING_CUBE_MAP"
        ],
        texture_compression: [ // Extension
          "COMPRESSED_TEXTURE_FORMATS",
          "NUM_COMPRESSED_TEXTURE_FORMATS"
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
        viewport: [
          "VIEWPORT",
          "SCISSOR_BOX"
        ]
      };

      var all = !Boolean(function_name);
      var gl = this.gl;

      var params = {};
      var param_names, group, param, p;
      if (function_name)
      {
        group = function_groups[function_name];
        param_names = param_groups[group];
        if(param_names == null) 
          return null;

        for (p = 0; p < param_names.length; p++)
        {
          param = param_names[p];
          params[param] = gl.getParameter(gl[param]);
        }
      }
      else
      {
        for (group in param_groups)
        {
          param_names = param_groups[group];
          for (p = 0; p < param_names.length; p++)
          {
            param = param_names[p];
            params[param] = gl.getParameter(gl[param]);
          }
        }

      }

      // TODO possibly format the params, otherwise do it in DF

      return params;
    };

    /**
     * Diffs two objects containing state parameters and returns only the
     * parameters that differs.
     */
    this.diff_state = function(full_state, part_state)
    {
      var diff = {};
      for (var param in part_state)
      {
        var old_value = full_state[param];
        var new_value = part_state[param];

        if (old_value === new_value) continue;

        if (typeof(old_value) === "object" && typeof(new_value) === "object" && old_value !== null)
        {
          if (old_value.buffer instanceof ArrayBuffer || old_value instanceof Array)
          {
            if (old_value.length === new_value.length)
            {
              var changed = false;
              for (var i = 0; i < old_value.length; i++)
              {
                if (old_value[i] !== new_value[i])
                {
                  changed = true;
                  break;
                }
              }

              if (!changed) continue;
            }
          }
        }
        diff[param] = part_state[param];
      }
      return diff;
    };

    /**
     * Pairs a trace argument with a WebGL object.
     * Creates a object for easy pairing on the Dragonfly side.
     */
    var _object_type_regexp = /^\[object (.*?)\]$/;
    this.make_linked_object = function (obj)
    {
      var type = obj.constructor.name;
      if (type === "Function.prototype")
      {
        var re = _object_type_regexp.exec(Object.prototype.toString.call(obj));
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
        var uniform_info = this.lookup_uniform(obj);
        if (uniform_info != null)
        {
          arg.program_index = uniform_info.program_index;
          arg.uniform_index = uniform_info.uniform_index;
        }
      }
      else if (obj instanceof WebGLBuffer)
      {
        var buffer = this.lookup_buffer(obj);
        if (buffer == null) buffer = this.lookup_deleted_buffer(obj);
        if (buffer == null) return arg;
        arg.buffer_index = buffer.index;
      }
      else if (obj instanceof WebGLProgram)
      {
        var program = this.lookup_program(obj);
        if (program == null) return arg;
        arg.program_index = program.index;
      }
      else if (obj instanceof WebGLTexture)
      {
        var texture = this.lookup_texture(obj);
        if (texture == null) texture = this.lookup_deleted_texture(obj);
        if (texture == null) return arg;
        arg.texture_index = texture.index;
      }
      return arg;
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

    function clone_history(history)
    {
      if (history == null) return null;
      var res = Array.prototype.slice.call(history);
      res.create = history.create;
      res.number = history.number;
      return res;
    }

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

      var init_state = function ()
      {
        var state = this.handler.get_state();
        this.full_state = state;
        this.state = {};
        for (var param in state)
        {
          var value = state[param];
          this.state[param] = {
            "-1": typeof(value) === "object" && value !== null ? this.handler.make_linked_object(state[param]) : value
          };
        }
      }.bind(this);

      init_buffers();
      init_programs();
      init_state();

      // Init textures
      this.handler.textures.forEach(this.add_texture, this);
      //init_fbos();
    }.bind(this);

    /* Adds a WebGL function call to the snapshot */
    this.add_call = function (function_name, error, args, result, redundant, loc)
    {
      var call_args = [];

      // Very ugly hack to link first argument of a call to vertexAttribPointer :(
      if (function_name === "vertexAttribPointer")
      {
        var gl = this.handler.gl;
        var program = this.handler.lookup_program(this.handler.bound_program || gl.getParameter(gl.CURRENT_PROGRAM));

        var trace_ref = {
          type: "WebGLVertexLocation",
          program_index: program.index,
          loc_index: args[0]
        }
        var trace_ref_index = this.call_refs.push(trace_ref) - 1;
        call_args.push("@" + String(trace_ref_index));

        // Clone args, as it is used after this function, and remove first argument
        args = Array.prototype.slice.call(args);
        args.shift();
      }

      for (var i = 0; i < args.length; i++)
      {
        if (typeof(args[i]) === "object" && args[i] !== null)
        {
          var obj = args[i];
          var trace_ref = this.handler.make_linked_object(obj);
          var trace_ref_index = this.call_refs.push(trace_ref) - 1;
          call_args.push("@" + String(trace_ref_index));
        }
        else
        {
          call_args.push(args[i]);
        }
      }

      if (typeof(result) === "object" && result !== null)
      {
        var result_ref = this.handler.make_linked_object(result);
        var result_ref_index = this.call_refs.push(result_ref) - 1;
        result = "@" + String(result_ref_index);
      }

      this.call_locs.push(loc);

      var state = this.handler.get_state(function_name);
      state = this.handler.diff_state(this.full_state, state);
      for (var param in state)
      {
        var value = state[param];
        this.state[param][this.call_index + 1] = typeof(value) === "object" &&
          value !== null ? this.handler.make_linked_object(value) : value;
        this.full_state[param] = value;
      }

      var res = result === undefined ? "" : result;

      this.call_index = this.calls.push([function_name, error, res, Boolean(redundant)].concat(call_args).join("|")) - 1;
    };

    this.add_drawcall = function (fbo, buffer_target, buffer_index, program_index)
    {
      // Wrap up the image data in another object to make sure that scoper
      // doesn't examine it.
      var img = {
        width : fbo.width,
        height : fbo.height,
      };

      if (fbo.data)
      {
        img.img = { data: fbo.data, flipped: fbo.flipped }
      }

      this.drawcalls.push({
        call_index : this.call_index,
        fbo : img,
        program_index : program_index,
        element_buffer : buffer_target === this.handler.gl.ELEMENT_ARRAY_BUFFER ? buffer_index : undefined
      });
    };

    /* Adds a buffer state to the snapshot */
    this.add_buffer = function (buffer)
    {
      if (!buffer.index_snapshot)
      {
        buffer.index_snapshot = this.handler.buffers.number_snapshot++;
      }

      var buffer_state = {
        history: clone_history(buffer.history),
        call_index: this.call_index,
        index: buffer.index,
        index_snapshot: buffer.index_snapshot
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

      if (!texture) return;

      var gl = this.handler.gl;

      if (!texture.index_snapshot)
      {
        texture.index_snapshot = this.handler.textures.number_snapshot++;
      }

      /* Calculates texture data in a scope transission friendly way.
       * This function is never bound to the Handler object, but a texture level
       * object, thus "this" refers to that object.
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
          this.element_type = "HTMLImageElement";
          this.width = element.width;
          this.height = element.height;
          // Check if the soure on is an actual url, not image data
          if (element.src.substr(0, 10) !== "data:image" && element.src.length < 2048)
          {
            this.url = element.src;
          }
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

      var clone_level = function (level)
      {
        var lvl = { level: level.level };

        if (level.width)
        {
          lvl.width = level.width;
          lvl.height = level.height;
        }

        get_texture_data.call(lvl, level.object);

        if (lvl.img.data == null)
          lvl.img = null;

        return lvl;
      };

      // Clone data to new object, which is later released by scope
      var texture_state = {
        history: clone_history(texture.history),
        call_index: this.call_index,
        index: texture.index,
        index_snapshot: texture.index_snapshot,

        mipmapped : texture.mipmapped,
        texture_mag_filter : texture.texture_mag_filter,
        texture_min_filter : texture.texture_min_filter,
        texture_wrap_s : texture.texture_wrap_s,
        texture_wrap_t : texture.texture_wrap_s,
        internalFormat : texture.internalFormat,
        format : texture.format,
        type : texture.type
      };

      // Add texture data (texture written to by a draw call)
      if (texture_data instanceof Object)
      {
        // Assume no mipmapping is done
        var lvl0 = {
          img: texture_data
        };

        if (texture.levels[0] && texture.levels[0].width)
        {
          var level = texture.levels[0];
          lvl0.width = level.width;
          lvl0.height = level.height;
        }
        texture_state.levels = [lvl0];
      }
      else
      {
        texture_state.levels = texture.levels.map(clone_level);
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

    this.add_attribpointer = function (program, attribute)
    {
      for (var i=0; i<program.attributes.length; i++)
      {
        var attrib = program.attributes[i];
        if (attrib.loc !== attribute) continue;

        var pointers = this.programs[program.index].attributes[i].pointers;
        pointers.push({
          call_index: this.call_index,
          buffer_index: attrib.pointer.buffer_index,
          layout: clone_object(attrib.pointer.layout)
        });

        break;
      }
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
        state : this.state,
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
