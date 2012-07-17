"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.WebGLDebugger = function ()
{
  this.injected = false;
  this.runtime_id = -1;

  /* Context IDs for wrapped contexts. NOT an object id */
  this.contexts = [];

  /* Interface functions to the context handler */
  this.interfaces = {};

  /* Remote getters to the message queues */
  this.events = {};

  /* Each context have its own snapshot data object, the context id is used as a key. */
  this.snapshots = {};

  this.api = new cls.WebGLAPI();
  this.state = new cls.WebGLState();

  /* Keep an own WebGL instance used when displaying buffer contents and such */
  var canvas = document.createElement("canvas");
  this.gl = canvas.getContext("experimental-webgl");
  this.gl ? this.gl.canvas = canvas : null;

  /* Instantiate buffer preview renderer */
  this.preview = this.gl ? new cls.WebGLMeshDrawer(this.gl) : null;

  /* Contains shader used when displaying textures and buffers in the debugger */
  this.shaders = {};

  this.inject = function (rt_id, cont_callback)
  {
    if (this.runtime_id !== rt_id)
    {
      this.runtime_id = rt_id;
      window.host_tabs.activeTab.addEventListener("webgl-debugger-ready",
          this._on_new_context.bind(this), false, false);
      this._send_injection(rt_id, cont_callback);
    }
    else
    {
      cont_callback();
    }
  };

  this.available = function ()
  {
    return this.contexts.length > 0;
  };

  this.clear = function ()
  {
    this.injected = false;
    this.runtime_id = -1;
    this.contexts = [];
    this.snapshots = [];

    messages.post('webgl-clear');
  };

  /**
   * Gets a snapshot of WebGL state for the next frame.
   * @param context_id Id of the context which should be traced.
   */
  this.request_snapshot = function(context_id)
  {
    context_id = context_id || this.contexts[0];
    this.snapshots[context_id].send_snapshot_request();
  };

  this._send_injection = function (rt_id, cont_callback)
  {
    var finalize = function (events)
    {
      this.injected = true;
      this.events = events;

      cont_callback();
    };

    var scoper = new cls.Scoper(finalize, this);
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.injection);
    scoper.set_reviver_tree({
      _depth: 1
    });
    scoper.eval_script(rt_id, script, [], false, true);
  };

  this._on_new_context = function (message)
  {
    var finalize = function (handler_interface, context_id)
    {
      this.contexts.push(context_id);
      this.interfaces[context_id] = handler_interface;
      this.snapshots[context_id] = new cls.WebGLSnapshotArray(context_id);

      // Tell the target context that the debugger is ready.
      this.interfaces[context_id].debugger_ready();

      messages.post('webgl-new-context', context_id);
    }.bind(this);

    // Revives a "simple" function (a function where the return value if of no
    // interest)
    var revive_function = function (runtime_id, context_id, function_id)
    {
      return function ()
        {
          var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.call_function);
          window.services["ecmascript-debugger"].requestEval(
              cls.TagManager.IGNORE_RESPONSE,
              [runtime_id, 0, 0, script, [["f", function_id]]]
          );
        };
    };

    var revive_interfaces = function (list, runtime_id)
    {
      for (var i = 0; i < list.length; i++)
      {
        var handler_interface = list[i];
        var context_id = handler_interface.object_id;
        delete handler_interface.object_id;

        for (var fun_name in handler_interface)
        {
          var fun = handler_interface[fun_name];
          // # of arguments
          var argc = fun.length;
          switch (fun_name)
          {
            case "debugger_ready":
            case "request_snapshot":
              handler_interface[fun_name] = revive_function(runtime_id, handler_interface.object_id, fun.object_id);
              break;
            default:
              handler_interface[fun_name] = { object_id : fun.object_id, runtime_id: runtime_id };
          }
        }

        finalize(handler_interface, context_id);
      }
    };

    if (message.runtime_id === this.runtime_id)
    {
      var scoper = new cls.Scoper(revive_interfaces, this, [this.runtime_id]);
      scoper.set_reviver_tree({
        _action: cls.Scoper.ACTIONS.EXAMINE_RELEASE,
        _array_elements: {
          _action: cls.Scoper.ACTIONS.EXAMINE,
          context: {
            _action: cls.Scoper.ACTIONS.NOTHING
          }
        }
      });
      scoper.execute_remote_function(this.events["new-context"], false);
    }
  };

  this.handle_error = function(status, message, obj_id)
  {
    window.services["ecmascript-debugger"].requestReleaseObjects(0, [obj_id]);

    if (status === 0)
    {
      var msg_vars = message[0][0][0][0][1];
      var obj = {};
      for (var i = 0; i < msg_vars.length; i++)
      {
        obj[msg_vars[i][0]] = msg_vars[i][2];
      }
      console.log("Remote error:");
      console.log(obj);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_error");
    }
  };

  this.init_gl = function()
  {
    var gl = this.gl;
    if (!gl)
    {
      return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.enable(gl.DEPTH_TEST);

    gl.programs = {};
    var shaders = this.shaders;

    var compile_buffer_program = function ()
    {
      var program = WebGLUtils.compile_program(
        shaders["buffer-vs"],
        shaders["buffer-fs"]
      );

      gl.useProgram(program);

      program.positionAttrib = gl.getAttribLocation(program, "aVertexPosition");
      gl.enableVertexAttribArray(program.positionAttrib);
      program.vertex2Attrib = gl.getAttribLocation(program, "aVertex2Position");
      gl.enableVertexAttribArray(program.vertex2Attrib);
      program.vertex3Attrib = gl.getAttribLocation(program, "aVertex3Position");
      gl.enableVertexAttribArray(program.vertex3Attrib);
      program.normalAttrib = gl.getAttribLocation(program, "aVertexNormal");
      gl.enableVertexAttribArray(program.normalAttrib);

      program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
      program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");

      gl.useProgram(null);

      return program;
    };

    gl.programs.buffer = compile_buffer_program();
  };

  var load_shaders = function(callback)
  {
    var num_shaders = 0;
    var loaded_shaders = 0;

    var request_shader = function(shader_id, src, type)
    {
      var request = new XMLHttpRequest();
      request.open("GET", src, true);
      request.overrideMimeType('text/plain');
      request.onreadystatechange = function()
      {
        if (request.status === 404)
        {
          opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
              "failed downloading shaders, 404 " + src + " not found");
        }
        else if (request.status === 200 && request.readyState === 4)
        {
          this.shaders[shader_id] = {
            "src": request.responseText,
            "type": type,
            "id" : shader_id
          };

          loaded_shaders++;
          if (loaded_shaders === num_shaders)
          {
            callback();
          }
        }
      }.bind(this);
      request.send();
    }.bind(this);

    var scripts = document.getElementsByTagName("script");
    var requests = [];

    for (var i=0; i<scripts.length; i++)
    {
      var type = scripts[i].type.match(/vertex|fragment/);
      if (!type)
      {
        continue;
      }

      num_shaders++;

      requests.push({ type: type[0], shader_id: scripts[i].id, src: scripts[i].src });
    }

    requests.map(function(s) { request_shader(s.shader_id, s.src, s.type); });

  }.bind(this);

  load_shaders(this.init_gl.bind(this));

  var on_snapshots_complete = function(msg)
  {
    var finalize = function(snapshots)
    {
      for (var i = 0; i < snapshots.length; i++)
      {
        var snapshot = snapshots[i];
        var context_id = snapshot.context.object_id;
        this.snapshots[context_id].on_snapshot_complete(snapshot.snapshot);
      }
    };

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_reviver_tree({
      _depth: 2,
      _action: cls.Scoper.ACTIONS.EXAMINE_RELEASE
    });

    scoper.execute_remote_function(this.events["snapshot-completed"]);
  };

  // ---------------------------------------------------------------------------

  messages.addListener('runtime-selected', this.clear.bind(this));

  window.host_tabs.activeTab.addEventListener("webgl-snapshot-completed",
      on_snapshots_complete.bind(this), false, false);
};
