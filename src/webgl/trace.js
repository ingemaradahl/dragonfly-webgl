"use strict";

window.cls || (window.cls = {});

/**
 * Gathers a trace of all WebGL calls during a frame.
 */
cls.WebGLTrace = function()
{
  // Retrieves the frame trace for the last rendered frame of a WebGL context denoted by it's runtime & object id
  this.send_trace_request = function(ctx_id)
  {
    window.webgl.interfaces[ctx_id].request_snapshot();
  };

  var on_trace_complete = function(msg)
  {
    var rt_id = msg.runtime_id;
    var ctx_id = window.webgl.canvas_contexts[msg.object_id];
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.call_function);
    var func = window.webgl.interfaces[ctx_id].get_snapshot;
    var scoper = new cls.Scoper(msg.runtime_id, this._finalize_trace, this, [rt_id, ctx_id]);
    scoper.set_object_action(function(key)
        {
          return cls.Scoper.ACTIONS[key === "pixels" ? "NOTHING" : "EXAMINE_RELEASE"];
        });
    scoper.set_max_depth(5);
    scoper.set_reviver(cls.Scoper.prototype.reviver_typed);
    scoper.eval_script(script, [["f", func.object_id]]);
  };

  this._finalize_trace = function(traces, rt_id, ctx_id)
  {
    for (var i = 0; i < traces.length; i++) {
      var trace = traces[i].call_trace;
      var data = [];
      var arg_obj_re = /@([0-9]+)/;
      for (var j = 0; j < trace.calls.length; j++) {
        var call = trace.calls[j];

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
        var args = parts.slice(3);

        for (var k = 0; k < args.length; k++) {
          var arg = args[k];
          if (arg_obj_re.test(arg))
          {
            var index = arg_obj_re.exec(arg)[1];
            args[k] = new TraceArgument(trace.objects[index], ctx_id);
          }
          else if (!isNaN(arg))
          {
            args[k] = Number(arg);
          }
        }

        data.push(new TraceEntry(function_name, error_code, result, args));
      }

      window.webgl.data[ctx_id].add_trace(data);

      for (var l = 0; l < trace.fbo_snapshots.length; l++)
      {
        var snapshot = trace.fbo_snapshots[l];
        snapshot.pixels_object = snapshot.pixels.object_id;
        snapshot.pixels = null;
        snapshot.downloading = false;

        window.webgl.data[ctx_id].add_snapshot(snapshot);
      }

      messages.post("webgl-new-trace", data);
    }
  };

  // ---------------------------------------------------------------------------

  window.host_tabs.activeTab.addEventListener("webgl-snapshot-completed",
      on_trace_complete.bind(this), false, false);

  /**
   * Used to store a single function call in a frame trace.
   */
  function TraceEntry(function_name, error_code, result, args)
  {
    this.function_name = function_name;
    this.error_code = error_code;
    this.have_error = error_code !== 0; // WebGLRenderingContext.NO_ERROR
    this.result = result;
    this.have_result = result !== "";
    this.args = args;
  }

  /**
   * An argument to a trace call that is an object.
   * Sets properties that is used when the argument is displayed.
   */
  function TraceArgument(object, ctx_id)
  {
    for (var key in object)
    {
      if (object.hasOwnProperty(key)) this[key] = object[key];
    }

    switch (this.type)
    {
      case "WebGLBuffer":
        this.buffer = window.webgl.data[ctx_id].buffers[this.buffer_index];
        this.text = "Buffer " + String(this.buffer.index);
        this.action = function()
        {
          window.webgl.buffer.get_buffer_data(window.webgl.runtime_id, ctx_id, this.buffer_index, this.buffer.object_id);
        };
        this.tab = "buffer";
        break;
      case "WebGLTexture":
        this.texture = window.webgl.data[ctx_id].texture_container[this.texture_index];
        if (this.texture == null){ // TODO temporary until texture is rebuilt
          this.text = "Texture " + String(this.texture_index) + " (not loaded)";
          return;
        }
        this.text = "Texture " + String(this.texture.index);
        this.action = function()
        {
          window.webgl.texture._get_texture_data(window.webgl.runtime_id, ctx_id, "Texture" + String(this.texture.index));
        };
        this.tab = "texture";
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
};
