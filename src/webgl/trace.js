"use strict";

window.cls || (window.cls = {});

/**
 * Gathers a trace of all WebGL calls during a frame.
 */
cls.WebGLTrace = function()
{
  this._current_context = null;

  // Retrieves the frame trace for the last rendered frame of a WebGL context denoted by it's runtime & object id
  this._send_trace_request = function(rt_id, ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.request_trace);
    this._current_context = ctx_id;
    window.services["ecmascript-debugger"].requestEval(0, [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._on_trace_complete = function(msg)
  {
    var rt_id = msg.runtime_id;
    var ctx_id = this._current_context;
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_trace);
    var tag = tagManager.set_callback(this,
        window.webgl.examine_array_objects_eval_callback(this._examine_trace_complete, null, true, true),
        [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._examine_trace_complete = function(data, rt_id, ctx_id, root_object_id)
  {
    for (var i = 0; i < data.length; i++) {
      var trace = data[i];

      // TODO release the root object when all traces have been recieved.
      window.webgl.examine_array(this, trace, this._examine_trace_object, [rt_id, ctx_id, i], true);
    }
  };

  this._examine_trace_object = function(data, rt_id, ctx_id, trace_num)
  {
    var trace = {
      calls: data[0].map(function(x){return x[2];}),
      objects: data[1],
      snapshots: data[2]
    };
    trace.calls.pop();

    window.webgl.examine_array(this, trace.objects, 
        this._finalize_trace_object, [rt_id, ctx_id, trace_num, trace], true);
  };

  this._finalize_trace_object = function(trace_objs, rt_id, ctx_id, trace_num, trace)
  {
    var data = [];
    var arg_obj_re = /@([0-9]+)/;
    for (var i = 0; i < trace.calls.length; i++) {
      var call = trace.calls[i];

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

      for (var j = 0; j < args.length; j++) {
        var arg = args[j];
        if (arg_obj_re.test(arg))
        {
          var index = arg_obj_re.exec(arg)[1];
          args[j] = this._format_trace_object(trace_objs[index]);
        }
        else if (!isNaN(arg))
        {
          args[j] = Number(arg);
        }
      }

      data.push(new TraceEntry(function_name, error_code, result, args));
    }

    window.webgl.examine_array(this, trace.snapshots,
        window.webgl.extract_array_callback(this._examine_snapshots_complete, null, true), 
        [rt_id, ctx_id], false);

    window.webgl.data[ctx_id].add_trace(data);
    messages.post("webgl-new-trace", data);
  };

  this._format_trace_object = function(obj)
  {
    return new TraceArg(obj[0][3][4]); // TODO Temporary
  };

  this._examine_snapshots_complete = function(data, rt_id, ctx_id)
  {
    for (var i = 0; i < data.length; i++)
    {
      var snapshot = data[i];
      snapshot.pixels_object = snapshot.pixels.object_id;
      snapshot.pixels = null;
      snapshot.downloading = false;

      window.webgl.data[ctx_id].add_snapshot(snapshot);
    }
  };
  // ---------------------------------------------------------------------------

  window.host_tabs.activeTab.addEventListener("webgl-trace-completed",
      this._on_trace_complete.bind(this), false, false);

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

  function TraceArg(display, link)
  {
    this.display = display;
  }

  /**
   * @param {Boolean} html true if html tags should be included in the string.
   */
  TraceArg.prototype.generate_string = function(html)
  {
    return this.display;
  };
};
