"use strict";

window.cls || (window.cls = {});

/**
 * Governs snapshots of a WebGL context
 * @extends Array
 */
cls.WebGLSnapshotArray = function(context_id)
{
  this.context_id = context_id;

  /* Retrieves the frame trace for the last rendered frame of the WebGL context */
  this.send_snapshot_request = function()
  {
    messages.post('webgl-taking-snapshot');
    window.webgl.interfaces[this.context_id].request_snapshot();
  };

  this.get_latest_trace = function()
  {
    return this.last ? this.last.trace : null;
  };

  this.get_latest_snapshot = function()
  {
    return this.length === 0 ? null : this[this.length - 1];
  };

  this.on_snapshot_complete = function(snapshot_object)
  {
    var finalize = function (snapshot_data)
    {
      window.webgl.taking_snapshot = false;
      var snapshot = new Snapshot(snapshot_data, this);
      this.push(snapshot);
      messages.post("webgl-new-snapshot", this.context_id);
    };

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_reviver_tree({
      framebuffers: {
        _array_elements: {
          _class: cls.WebGLFramebuffer,
          image: {
            img: {
              _action: cls.Scoper.ACTIONS.NOTHING,
            }
          }
        }
      },
      buffers: {
        _array_elements: {
          _class: cls.WebGLBuffer,
          data: {
            _action: cls.Scoper.ACTIONS.NOTHING,
            _reviver: scoper.reviver_typed
          }
        }
      },
      state: {
        _reviver: scoper.reviver_typed,
        _class: cls.WebGLState
      },
      programs: {
        _array_elements: {
          _class: cls.WebGLProgram,
          uniforms: {
            _array_elements: {
              locations: {
                _action: cls.Scoper.ACTIONS.RELEASE
              }
            }
          }
        }
      },
      textures: {
        _array_elements: {
          _class: cls.WebGLTexture,
          levels: {
            _array_elements: {
              img: {
                _action: cls.Scoper.ACTIONS.NOTHING
              }
            }
          }
        }
      },
      _depth: 9,
      _action: cls.Scoper.ACTIONS.EXAMINE_RELEASE
    });

    scoper.examine_object(snapshot_object);
  };

  // ---------------------------------------------------------------------------
  /* Represents a snapshot of a WebGL context */
  var Snapshot = function (snapshot, parent_)
  {
    this.parent_ = parent_;
    this.frame = snapshot.frame;
    this.buffers = snapshot.buffers;
    this.programs = snapshot.programs;
    this.textures = snapshot.textures;
    this.state = snapshot.state;
    this.state.snapshot = this; // This reference is needed to resolve objects after initiation
    this.framebuffers = snapshot.framebuffers;
    this.drawcalls = [];
    this.trace = [];

    // Finds a buffer or texture denoted by it's index and call_index
    var lookup = function (index, call_index)
    {
      var res = null;
      var highest_call = -1;
      for (var i=0; i<this.length; i++)
      {
        if (this[i].index === index && this[i].call_index <= call_index && this[i].call_index >= highest_call)
        {
          res = this[i];
        }
      }

      return res;
    };
    this.buffers.lookup = lookup.bind(this.buffers);
    this.textures.lookup = lookup.bind(this.textures);
    this.framebuffers.lookup = lookup.bind(this.framebuffers);
    this.programs.lookup = lookup.bind(this.programs);
    this.framebuffers.lookup_all = function (call_index)
    {
      var framebuffers = {};
      for (var i=0; i<this.length; i++)
      {
        if (!(this[i].index in framebuffers))
        {
          framebuffers[this[i].index] = this[i];
        }

        if (this[i].call_index <= call_index && this[i].call_index >= framebuffers[this[i].index].call_index)
        {
          framebuffers[this[i].index] = this[i];
        }
      }

      return framebuffers;
    }.bind(this.framebuffers);

    /**
     * Tries to find a matching script id to the provided url.
     * Can currently don't match inline scripts.
     */
    var lookup_script_id = function(url)
    {
      var scripts = window.runtimes.getScripts(window.webgl.runtime_id);

      for (var key in scripts)
      {
        var script = scripts[key];
        if (script.uri == null) continue;
        if (script.uri === url)
        {
          return script.script_id;
        }
      }
      return null;
    };

    /**
     * Finds an attribute based on a call_index. To be bound to an array of
     * vertex attribute pointers. Assumes that the array is sorted by call index.
     */
    var lookup_attrib = function(call_index)
    {
      var highest_call = -1;
      for (var i=this.length-1; i>=0; i--)
      {
        if (this[i].call_index <= call_index)
        {
          return this[i];
        }
      }

      return null;
    };

    var init_textures = function(textures)
    {
      // TODO perhaps this should be cross-snapshot so that the same texture always have same name. Even if one with the same filename is added.
      var texture_names = {};

      var update_names = function()
      {
        for (var filename in texture_names)
        {
          var extensions = texture_names[filename];
          var number = 0;
          var textures;
          for (var fileext in extensions)
          {
            textures = extensions[fileext];
            number += textures.length;
            if (textures.length === 1)
            {
              textures[0].name = filename + "." + fileext;
            }
            else
            {
              for (var i = 0; i < textures.length; i++)
              {
                var texture = textures[i];
                // TODO add setting to control if the index_snapshot or index should be used.
                texture.name = filename + "." + fileext + " (" + texture.index_snapshot + ")";
              }
            }
          }

          if (number === 1)
          {
            textures[0].name = filename;
          }
        }
      };

      var file_regexp = new RegExp("^.*/(.*)\\.([^.]*)$");
      var add_texture_name = function(tex)
      {
        var lvl0 = tex.levels[0];
        if (lvl0 && lvl0.element_type === "HTMLImageElement" && lvl0.url != null)
        {
          var file = file_regexp.exec(lvl0.url);
          var filename = file[1];
          var fileext = file[2];

          if (!(filename in texture_names))
          {
            texture_names[filename] = {};
          }
          if (!(fileext in texture_names[filename]))
          {
            texture_names[filename][fileext] = [];
          }
          texture_names[filename][fileext].push(tex);
        }
      };
      textures.forEach(add_texture_name);
      update_names();
    };
    init_textures(snapshot.textures);

    var runtime = window.runtimes.getRuntime(window.webgl.runtime_id);

    var shorten_url = function(uri)
    {
      var same = uri.protocol === runtime.protocol &&
          uri.host === runtime.host &&
          uri.port === runtime.port;
      if (!same) return null;

      if (uri.dir_pathname.indexOf(runtime.dir_pathname) === 0)
      {
        // Relative path
        return uri.pathname.substr(runtime.dir_pathname.length);
      }
      else
      {
        // Absolute path
        return uri.pathname;
      }
    };

    var init_loc = function(loc)
    {
      if (loc == null) return;
      loc.script_id = lookup_script_id(loc.url);
      loc.short_url = shorten_url(new URI(loc.url));
    };

    var init_trace = function (calls, call_locs, call_refs)
    {
      var trace_list = [];
      var object_index_regexp = /^@([0-9]+)$/;

      for (var j = 0; j < calls.length; j++)
      {
        var call = calls[j];
        var loc = call_locs[j];

        init_loc(loc);

        // WebGL Function call
        var parts = call.split("|");
        if (parts.length < 3)
        {
          opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
              "A trace entry had incorrect data: [" + parts.join(", ") + "]");
          continue;
        }
        var function_name = parts[0];
        var error_code = Number(parts[1]);
        var result = parts[2];
        var redundant = parts[3] === "true";
        var args = parts.slice(4);

        // Revive the arguments
        for (var k = 0; k < args.length; k++)
        {
          var arg = args[k];
          if (object_index_regexp.test(arg))
          {
            var index = object_index_regexp.exec(arg)[1];
            args[k] = new cls.WebGLLinkedObject(call_refs[index], j, this);
          }
          else if (!isNaN(arg))
          {
            args[k] = Number(arg);
          }
          else if (typeof(arg) === "string")
          {
            arg === "true" || arg === "false"
              ? args[k] = arg === "true"
              : args[k] = arg
          }
        }

        // Revive the result
        if (result === "")
        {
          result = null;
        }
        else if (object_index_regexp.test(result))
        {
          var res_index = object_index_regexp.exec(result)[1];
          result = new cls.WebGLLinkedObject(call_refs[res_index], j, this);
        }
        else if (!isNaN(result))
        {
          result = Number(result);
        }

        var group = cls.WebGLState.FUNCTION_GROUPS[function_name];
        var linked_object = null;
        var target, param;
        switch (group)
        {
          case "buffer":
            switch (function_name)
            {
              case "createBuffer":
                linked_object = result;
                break;
              case "deleteBuffer":
              case "isBuffer":
                linked_object = args[0];
                break;
              default:
                target = args[0];
                param = target === cls.WebGLAPI.CONSTANTS.ARRAY_BUFFER ? "ARRAY_BUFFER_BINDING" : "ELEMENT_ARRAY_BUFFER_BINDING";
                linked_object = this.state.get_parameter(param, j);
                break;
            }
            break;
          case "texture":
          case "texImage":
            switch (function_name)
            {
              case "activeTexture":
                linked_object = null;
                group = "generic";
                break;
              case "createTexture":
                linked_object = result;
                break;
              case "deleteTexture":
              case "isTexture":
                linked_object = args[0];
                break;
              default:
                target = args[0];
                param = target === cls.WebGLAPI.CONSTANTS.TEXTURE_2D ? "TEXTURE_BINDING_2D" : "TEXTURE_BINDING_CUBE_MAP";
                linked_object = this.state.get_parameter(param, j);
                break;
            }
            group = "texture";
            // TODO temporary, since texture cant be null in the texture template
            if (!linked_object || !linked_object.texture) group = "generic";
            break;
          case "uniform":
            switch (function_name)
            {
              case "getUniformLocation":
                linked_object = result;
                break;
              default:
                linked_object = args[0];
            }
            break;
          case "attrib":
            switch (function_name)
            {
              case "getAttribLocation":
                linked_object = result;
                break;
              case "bindAttribLocation":
              case "getActiveAttrib":
                linked_object = args[1];
                break;
              case "getVertexAttribOffset":
              case "getVertexAttrib":
              default: // vertexAttribPointer || vertexAttrib[1234]f[v]
                linked_object = args[0];
                break;
            }
            break;
          case "program":
            switch (function_name)
            {
              case "createProgram":
                linked_object = result;
                break;
              case "attachShader":
              case "linkProgram":
              case "getProgramParameter":
              case "useProgram":
                linked_object = args[0];
                break;
              default:
                linked_object = null;
                group = "generic";
                break;
            }
            break;
          case "framebuffer":
            switch (function_name)
            {
              case "isFramebuffer":
                linked_object = args[0];
                break;
              case "bindFramebuffer":
                linked_object = args[1];
                break;
              default:
                linked_object = null;
                group = "generic";
                break;
            }
        }

        if (linked_object == null && group !== "draw") group = "generic";

        trace_list.push(new TraceEntry(function_name, error_code, redundant, result, args, loc, group, linked_object));
      }

      this.trace = trace_list;
    }.bind(this);
    init_trace(snapshot.calls, snapshot.call_locs, snapshot.call_refs);

    // Init draw calls
    var init_drawcall = function(drawcall)
    {
      var call_index = drawcall.call_index;
      this.trace[call_index].drawcall = true;

      // Copy the parameters from the function call to the drawcall object
      var state = {
        mode : this.trace[call_index].args[0],
        indexed : false
      };

      if (drawcall.element_buffer)
      {
        state.count = this.trace[call_index].args[1];
        state.offset = this.trace[call_index].args[3];
      }
      else
      {
        state.first = this.trace[call_index].args[1];
        state.count = this.trace[call_index].args[2];
      }
      drawcall.parameters = state;

      // Link up eventual element array buffer if it was used
      if (drawcall.element_buffer)
      {
        drawcall.element_buffer = this.buffers.lookup(drawcall.element_buffer, call_index);
        drawcall.parameters.indexed = true;
      }

      // Link up program
      drawcall.program = this.programs.lookup(drawcall.program_index, call_index);
      delete drawcall.program_index;

      for (var i=0; i<drawcall.program.attributes.length; i++)
      {
        var attribute = drawcall.program.attributes[i];

        // Add lookup function
        attribute.pointers.lookup = lookup_attrib.bind(attribute.pointers);

        // Connect buffers to vertex attribute bindings
        var pointer = attribute.pointers.lookup(call_index);
        pointer.buffer = pointer.buffer ? pointer.buffer : this.buffers.lookup(pointer.buffer_index, call_index);

        if (pointer.buffer !== null)
        {
          if (pointer.buffer.vertex_attribs[call_index])
          {
            pointer.buffer.vertex_attribs[call_index].push(pointer);
          }
          else
          {
            pointer.buffer.vertex_attribs[call_index] = [pointer];
          }

          if (drawcall.element_buffer)
          {
            pointer.buffer.vertex_attribs[call_index].element_buffer = drawcall.element_buffer;
          }

          if (pointer.buffer_index)
            delete pointer.buffer_index;
        }
      }

      this.drawcalls.push(drawcall);
    };

    snapshot.drawcalls.forEach(init_drawcall, this);
    this.drawcalls.get_by_call = function(call)
    {
      var c = -1;
      var result = null;
      for (var i=0; i<this.length; i++)
      {
        if (this[i].call_index <= call && this[i].call_index > c)
        {
          result = this[i];
        }
      }

      return result;
    }.bind(this.drawcalls);

    var init_history = function(textures, buffers)
    {
      var types = [textures, buffers];
      types.forEach(function(type){
        type.forEach(function(unit){
          if (unit.history == null) return null;
          if (unit.history.create) init_loc(unit.history.create.loc);

          unit.history.forEach(function(call){
            init_loc(call.loc);
          });
        });
      });
    };
    init_history(snapshot.textures, snapshot.buffers);
  };

  // ---------------------------------------------------------------------------

  /**
   * Used to store a single function call in a frame trace.
   */
  function TraceEntry(function_name, error_code, redundant, result, args, loc, group, linked_object)
  {
    this.function_name = function_name;
    this.error_code = error_code;
    this.have_error = error_code !== 0; // WebGLRenderingContext.NO_ERROR
    this.redundant = redundant;
    this.drawcall = false;
    this.result = result;
    this.have_result = result !== "";
    this.args = args;
    this.loc = loc;
    this.group = group;
    this.linked_object = linked_object;

    this.snapshot = null;
    this.have_snapshot = false;
  }

  TraceEntry.prototype.set_snapshot = function(snapshot)
  {
    this.snapshot = snapshot;
    this.have_snapshot = true;
  };
};

cls.WebGLSnapshotArray.prototype = new Array();
cls.WebGLSnapshotArray.prototype.constructor = cls.WebGLSnapshotArray;

  /**
   * Creates a object that can be used to link in the UI to a WebGL object.
   */
cls.WebGLLinkedObject = function(object, call_index, snapshot)
{
  call_index = Number(call_index);

  for (var key in object)
  {
    if (object.hasOwnProperty(key)) this[key] = object[key];
  }

  var matched = true;
  switch (this.type)
  {
    case "WebGLBuffer":
      if (this.buffer_index == null) return;
      this.buffer = snapshot.buffers.lookup(this.buffer_index, call_index);
      this.text = String(this.buffer);
      this.action = function ()
      {
        window.views["webgl_buffer_call"].display_call(snapshot, call_index, this.buffer);
      }.bind(this);
      break;
    case "WebGLTexture":
      if (this.texture_index == null) return;
      this.texture = snapshot.textures.lookup(this.texture_index, call_index);
      if (this.texture == null) return;
      this.text = String(this.texture);
      this.action = function ()
      {
        window.views["webgl_texture_call"].display_call(snapshot, call_index, this.texture);
      }.bind(this);
      break;
    case "WebGLUniformLocation":
      if (this.program_index == null) return;
      this.program = snapshot.programs.lookup(Number(this.program_index), call_index);
      this.uniform = this.program.uniforms[this.uniform_index];
      this.text = this.uniform.name;
      this.action = function()
      {
        window.views.webgl_program.show_uniform(call_index, this.program, this.uniform);
      };
      break;
    case "WebGLVertexLocation":
      if (this.program_index == null) return;
      this.program = snapshot.programs.lookup(Number(this.program_index), call_index);
      // Find right attribute based on loc index
      for (var i=0; i<this.program.attributes.length; i++)
      {
        if (this.program.attributes[i].loc === this.loc_index)
        {
          this.attribute = this.program.attributes[i];
          break;
        }
      }
      this.text = this.attribute.name;
      this.action = function() {  /* alert("attribute!"); */ };
      break;
    case "WebGLProgram":
      this.program = snapshot.programs.lookup(Number(this.program_index), call_index);
      this.text = String(this.program);
      this.action = function ()
      {
        window.views.webgl_program_call.display_call(snapshot, -1, this.program);
      }.bind(this);
      break;
    case "WebGLFramebuffer":
      this.framebuffer = snapshot.framebuffers.lookup(this.framebuffer_index, call_index);
      this.text = String(this.framebuffer);
      break;
    default:
      matched = false;
  }

  if (!matched)
  {
    if (this.data && typeof(this.data) !== "function")
    {
      var text = "";
      if (this.data.length > 0)
      {
        text = Array.prototype.slice.call(this.data, 0, 4).map(function(val){
          return String(Math.round(val * 100) / 100);
        }).join(", ");
        this.extra_tooltip = "[" + Array.prototype.slice.call(this.data, 0, 4).join(", ");
        if (this.data.length > 4)
        {
          text += ", ...";
          this.extra_tooltip += ", ... (" + (this.data.length - 4) + " more elements)";
        }
        this.extra_tooltip += "]";
      }
      this.text = "[" + text + "]";
    }
    else
    {
      this.text = this.type;
    }
  }
};
