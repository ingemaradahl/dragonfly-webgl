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
    return this.length > 0 ? this[this.length-1].trace : null;
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
        this.push(new Snapshot(snapshots[i], this));
        messages.post("webgl-new-trace");
      }
    };

    var scoper = new cls.Scoper(finalize, this);
    var func = window.webgl.interfaces[ctx_id].get_snapshot;
    scoper.set_object_action(function(key)
        {
          return cls.Scoper.ACTIONS[key === "pixels" ? "NOTHING" : "EXAMINE_RELEASE"];
        });
    scoper.set_max_depth(5);
    scoper.set_reviver(cls.Scoper.prototype.reviver_typed);
    scoper.execute_remote_function(func);
  };

  // ---------------------------------------------------------------------------
  /* Represents a snapshot of a WebGL context */
  var Snapshot = function (snapshot, parent_)
  {
    this.parent_ = parent_;
    this.buffers = snapshot.buffers;
    this.texture_container = [];
    this.trace = [];

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
        var args = parts.slice(3);

        // Revive the arguments
        for (var k = 0; k < args.length; k++) 
        {
          var arg = args[k];
          if (object_index_regexp.test(arg))
          {
            var index = object_index_regexp.exec(arg)[1];
            args[k] = new LinkedObject(call_refs[index], this);
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

        trace_list.push(new TraceEntry(function_name, error_code, result, args));
      }

      this.trace = trace_list;

    }.bind(this);

    var init_fbos = function (fbo)
    {


    }.bind(this);

    init_trace(snapshot.calls, snapshot.call_refs)
  };

  // ---------------------------------------------------------------------------

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
  function LinkedObject(object, snapshot)
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
          window.webgl.buffer.get_buffer_data(this.buffer_index, this.buffer);
        };
        this.tab = "buffer";
        break;
      case "WebGLTexture":
        this.texture = snapshot.texture_container[this.texture_index];
        if (this.texture == null)
        { // TODO temporary until texture is rebuilt
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

  LinkedObject.prototype.perform = function()
  {
    if (this.tab)
    {
      window.views.webgl_panel.cell.children[0].tab.setActiveTab("webgl_" + this.tab);
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

