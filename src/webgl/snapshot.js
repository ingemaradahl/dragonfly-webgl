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
    messages.post('webgl-take-snapshot');
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
      var snapshot = new Snapshot(snapshot_data, this);
      this.push(snapshot);
      messages.post("webgl-new-snapshot", this.context_id);
    };

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_reviver_tree({
      buffers: {
        _array_elements: {
          _class: cls.WebGLBuffer,
          data: {
            _action: cls.Scoper.ACTIONS.NOTHING,
            _reviver: scoper.reviver_typed
          }
        }
      },
      drawcalls: {
        _array_elements: {
          fbo: {
            img: {
              _action: cls.Scoper.ACTIONS.NOTHING
            }
          }
        }
      },
      state: {
        _reviver: scoper.reviver_typed,
        _class: cls.WebGLState
      },
      programs: {
        _array_elements: {
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
          img: {
            _action: cls.Scoper.ACTIONS.NOTHING
          },
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

    var init_state = function (state)
    {
      for (var key in state)
      {
        if (!state.hasOwnProperty(key)) continue;
        var param = state[key];
        for (var call in param)
        {
          if (!param.hasOwnProperty(call) || typeof(param[call]) !== "object") continue;
          param[call] = new LinkedObject(param[call], call, this);
        }
      }
    }.bind(this);

    init_state(this.state);

    var init_trace = function (calls, call_locs, call_refs)
    {
      var trace_list = [];
      var object_index_regexp = /^@([0-9]+)$/;

      var runtime = window.runtimes.getRuntime(window.webgl.runtime_id);
      var base_url = new RegExp("^(.*)/[^/]*$").exec(runtime.uri)[1] + "/";
      var short_url_regexp = new RegExp("^" + base_url + "(.*)$");

      for (var j = 0; j < calls.length; j++)
      {
        var call = calls[j];
        var loc = call_locs[j];

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
            args[k] = new LinkedObject(call_refs[index], j, this);
          }
          else if (!isNaN(arg))
          {
            args[k] = Number(arg);
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
          result = new LinkedObject(call_refs[res_index], j, this);
        }
        else if (!isNaN(result))
        {
          result = Number(result);
        }

        var script_id = lookup_script_id(loc.url);
        loc.script_id = script_id;
        loc.short_url = short_url_regexp.exec(loc.url)[1] || null;

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
            break;
        }

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

      // Link up eventual element array buffer if it was used
      if (drawcall.element_buffer)
      {
        drawcall.element_buffer = this.buffers.lookup(drawcall.element_buffer, call_index);
      }

      // Connect buffers to vetrex attribute bindings
      for (var i=0; i<drawcall.program.attributes.length; i++)
      {
        var attribute = drawcall.program.attributes[i];
        var buffer = this.buffers.lookup(attribute.pointer.buffer_index, call_index);
        if (buffer == null) continue;
        attribute.buffer = buffer;
        delete attribute.buffer_index;

        if (buffer.vertex_attribs[call_index])
        {
          buffer.vertex_attribs[call_index].push(attribute);
        }
        else
        {
          buffer.vertex_attribs[call_index] = [attribute];
        }

        if (drawcall.element_buffer)
        {
          buffer.vertex_attribs[call_index].element_buffer = drawcall.element_buffer;
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
                texture.name = filename + "." + fileext + " (" + texture.index + ")";
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
        if (tex.element_type === "HTMLImageElement" && tex.url != null)
        {
          var file = file_regexp.exec(tex.url);
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

  /**
   * Creates a object that can be used to link in the UI to a WebGL object.
   */
  function LinkedObject(object, call_index, snapshot)
  {
    for (var key in object)
    {
      if (object.hasOwnProperty(key)) this[key] = object[key];
    }

    var matched = false;
    switch (this.type)
    {
      case "WebGLBuffer":
        if (this.buffer_index == null) return;
        this.buffer = snapshot.buffers[this.buffer_index];
        this.text = String(this.buffer);
        this.action = this.buffer.show.bind(this.buffer);
        matched = true;
        break;
      case "WebGLTexture":
        if (this.texture_index == null) return;
        this.texture = snapshot.textures.lookup(this.texture_index, call_index);
        if (this.texture == null) return;
        this.text = String(this.texture);
        this.action = this.texture.show.bind(this.texture);
        matched = true;
        break;
      case "WebGLUniformLocation":
        if (this.program_index == null) return;
        this.program = snapshot.programs[this.program_index];
        this.uniform = this.program.uniforms[this.uniform_index];
        this.text = this.uniform.name;
        this.action = function()
        {
          window.views.webgl_program.show_uniform(call_index, this.program, this.uniform);
        };
        matched = true;
        break;
    }

    if (!matched)
    {
      if (this.data && typeof(this.data) !== "function")
      {
        this.text = "[" + Array.prototype.join.call(this.data, ", ") + "]";
      }
      else
      {
        this.text = this.type;
      }
    }
  }
};

cls.WebGLSnapshotArray.prototype = new Array();
cls.WebGLSnapshotArray.prototype.constructor = cls.WebGLSnapshotArray;
