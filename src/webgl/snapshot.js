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

  var on_snapshot_complete = function(msg)
  {
    var ctx_id = window.webgl.canvas_contexts[msg.object_id];

    if (ctx_id !== this.context_id)
    {
      return;
    }

    var finalize = function (snapshots)
    {
      for (var i = 0; i < snapshots.length; i++)
      {
        var snapshot = new Snapshot(snapshots[i], this);
        this.push(snapshot);
        messages.post("webgl-new-snapshot", ctx_id);
      }
    };

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_reviver_tree({
      _array_elements: {
        buffers: {
          _array_elements: {
            _class: Buffer,
            data: {
              _action: cls.Scoper.ACTIONS.NOTHING
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
        }
      },
      _depth: 7,
      _action: cls.Scoper.ACTIONS.EXAMINE_RELEASE
    });

    var func = window.webgl.interfaces[ctx_id].get_snapshot;
    scoper.execute_remote_function(func);
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


    var init_trace = function (calls, call_refs)
    {
      var trace_list = [];
      var object_index_regexp = /^@([0-9]+)$/;

      for (var j = 0; j < calls.length; j++)
      {
        var call = calls[j];

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
            result = new LinkedObject(call_refs[res_index], this);
        }
        else if (!isNaN(result))
        {
          result = Number(result);
        }

        trace_list.push(new TraceEntry(function_name, error_code, redundant, result, args));
      }

      this.trace = trace_list;

    }.bind(this);

    init_trace(snapshot.calls, snapshot.call_refs);

    // Init draw calls
    var init_drawcall = function(drawcall)
    {
      this.trace[drawcall.call_index].drawcall = true;
      drawcall.buffer = this.buffers.lookup(drawcall.buffer_index, drawcall.call_index);
      // TODO: Same for programs

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
  };

  // ---------------------------------------------------------------------------

  /**
   * Used to store a single function call in a frame trace.
   */
  function TraceEntry(function_name, error_code, redundant, result, args)
  {
    this.function_name = function_name;
    this.error_code = error_code;
    this.have_error = error_code !== 0; // WebGLRenderingContext.NO_ERROR
    this.redundant = redundant;
    this.drawcall = false;
    this.result = result;
    this.have_result = result !== "";
    this.args = args;

    this.snapshot = null;
    this.have_snapshot = false;
  }

  TraceEntry.prototype.set_snapshot = function(snapshot)
  {
    this.snapshot = snapshot;
    this.have_snapshot = true;
  };

  function Buffer()
  {
  }

  Buffer.prototype.data_is_loaded = function()
  {
    return this.data.object_id === undefined;
  };

  Buffer.prototype.set_data = function(data)
  {
    this.data = data;
  };

  Buffer.prototype.usage_string = function()
  {
    return window.webgl.api.function_argument_to_string("bufferData", "usage", this.usage);
  };

  Buffer.prototype.target_string = function()
  {
    return window.webgl.api.function_argument_to_string("bufferData", "target", this.target);
  };

  /**
   * Creates a object that can be used to link in the UI to a WebGL object.
   */
  function LinkedObject(object, call_idx, snapshot)
  {
    for (var key in object)
    {
      if (object.hasOwnProperty(key)) this[key] = object[key];
    }

    switch (this.type)
    {
      case "WebGLBuffer":
        this.buffer = snapshot.buffers[this.buffer_index];
        this.text = "Buffer " + String(this.buffer.index);
        this.action = function()
        {
          window.views.webgl_buffer.show_buffer(this.buffer);
        };
        this.tab = "webgl_buffer";
        this.buffer.link = this;
        break;
      case "WebGLTexture":
        this.texture = snapshot.textures.lookup(this.texture_index, call_idx);
        this.text = "Texture " + String(this.texture.index);
        this.action = this.texture.show.bind(this.texture);
        this.texture.link = this;
        this.tab = "webgl_texture";
        break;
      case "WebGLUniformLocation":
        this.program = snapshot.programs[this.program_index];
        this.uniform = this.program.uniforms[this.uniform_index];
        this.text = this.uniform.name;
        this.action = function()
        {
          messages.post("webgl-show-uniform", {program: this.program, uniform: this.uniform});
        };
        this.tab = "webgl_program";
        break;
      default:
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

  LinkedObject.prototype.perform = function()
  {
    if (this.tab)
    {
      window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab(this.tab);
    }

    if (this.action)
    {
      this.action();
    }
  };

  // ---------------------------------------------------------------------------

  window.host_tabs.activeTab.addEventListener("webgl-snapshot-completed",
      on_snapshot_complete.bind(this), false, false);
};

cls.WebGLSnapshotArray.prototype = new Array();
cls.WebGLSnapshotArray.prototype.constructor = cls.WebGLSnapshotArray;

