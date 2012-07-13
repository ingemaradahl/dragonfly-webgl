﻿"use strict";

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
  //this.test = new cls.WebGLTest();

  /* Keep an own WebGL instance used when displaying buffer contents and such */
  var canvas = document.createElement("canvas");
  this.gl = canvas.getContext("experimental-webgl");
  this.gl ? this.gl.canvas = canvas : null;

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

  this.request_test = function (ctx)
  {
    if (this.available())
    {
      window.webgl._start_time = (new Date()).getTime();
      // TODO choosen context
      ctx = (ctx || this.contexts[0]);
      this.test._send_test_query(ctx);
    }
  };

  // Request for texture names.
  this.request_textures = function(ctx)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.texture._send_texture_query(ctx);
    }
  };

  // Request for one texture image data string.
  this.request_texture_data = function(ctx, texture_id)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.texture._get_texture_data(ctx, texture_id);
    }
  };

  this.request_state = function (ctx)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.state.send_state_query(ctx);
    }
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

  this.request_buffer_data = function(context_object_id, buffer_index)
  {
    var buffer = this.data[context_object_id].buffers[buffer_index];
    this.buffer.get_buffer_data(buffer_index, buffer);
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
            case "enable_buffers_update":
            case "disable_buffers_update":
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

    gl.programs = {};
    var shaders = this.shaders;

    var compile_texture_program = function ()
    {
      var program = WebGLUtils.compile_program(
        shaders["texture-vs"],
        shaders["texture-fs"]
      );

      gl.useProgram(program);

      program.positionAttrib = gl.getAttribLocation(program, "aVertexPosition");
      gl.enableVertexAttribArray(program.positionAttrib);

      program.uvAttrib = gl.getAttribLocation(program, "aTexturePosition");
      gl.enableVertexAttribArray(program.uvAttrib);

      program.samplerUniform = gl.getUniformLocation(program, "uTexture");

      gl.useProgram(null);

      return program;
    };

    gl.programs.texture = compile_texture_program();
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
