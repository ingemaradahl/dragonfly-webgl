"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.WebGLDebugger = function ()
{
  this.injected = false;
  this.runtime_id = -1;

  /* Object IDs for Handler objects from Wrapped contexts. */
  this.contexts = [];

  /* Each context have its own data object, the context id is used as a key. */
  this.data = {};

  this.api = new cls.WebGLAPI();
  this.buffer = new cls.WebGLBuffer();
  this.state = new cls.WebGLState();
  this.trace = new cls.WebGLTrace();
  this.test = new cls.WebGLTest();
  this.texture = new cls.WebGLTexture();

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

    messages.post('webgl-clear');
  };

  this.add_context = function (context_id)
  {
    this.contexts.push(context_id);
    this.data[context_id] = new cls.WebGLData(context_id);
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

  // Request for texture names (===urls).
  this.request_textures = function(ctx)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.texture._send_texture_query(this.runtime_id, ctx);
    }
  };

  // Request for one texture image data string.
  this.request_texture_data = function(ctx, texture_url)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.texture._get_texture_data(this.runtime_id, ctx, texture_url);
    }
  };

  this.request_state = function (ctx)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.state.send_state_query(this.runtime_id, ctx);
    }
  };

  /**
   * Gets a trace of all WebGL calls from the current frame.
   * TODO: Temporary requires that the script runs gl.new_frame() before each new frame is drawn.
   * @param context_object_id Id of the context object which should be traced.
   */
  this.request_trace = function(context_object_id)
  {
    this.trace._send_trace_request(this.runtime_id, context_object_id);
  };

  this.request_buffer_data = function(context_object_id, buffer_index)
  {
    var buffer = this.data[context_object_id].buffers[buffer_index];
    this.buffer.get_buffer_data(this.runtime_id, context_object_id, buffer_index, buffer.object_id);
  };

  this._send_injection = function (rt_id, cont_callback)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.injection);
    var tag = tagManager.set_callback(this, this._handle_injection, [rt_id, cont_callback]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [], 1]); // TODO remove debugging flag
  };

  this._handle_injection = function (status, message, rt_id, cont_callback)
  {
    if (message[0] === 'completed')
    {
      this.injected = true;
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed to inject WebGL wrapping script");
    }

    cont_callback();
  };

  this._on_new_context = function (message)
  {
    if (message.runtime_id === this.runtime_id)
    {
      var canvas_id = message.object_id;
      var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_handler);
      var tag = tagManager.set_callback(this, this._handle_context_handler);
      window.services["ecmascript-debugger"].requestEval(tag, [this.runtime_id, 0, 0, script, [["canvas", canvas_id]]]);
    }
  };

  this._handle_context_handler = function(status, message)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (message[STATUS] === 'completed')
    {
      if (message[TYPE] !== 'object')
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "WebGL context handler could not be recieved");
      }
      else
      {
        var handler_id = message[OBJECT_VALUE][OBJECT_ID];

        this.add_context(handler_id);

        // Tell the target context that the debugger is ready.
        var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.debugger_ready);
        window.services["ecmascript-debugger"].requestEval(0,
            [this.runtime_id, 0, 0, script, [["handler", handler_id]]]);

        messages.post('webgl-new-context', handler_id);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_context_query in WebGLDebugger");
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

      gl.useProgram(program)

      program.positionAttrib = gl.getAttribLocation(program, "aVertexPosition");
      gl.enableVertexAttribArray(program.positionAttrib);

      program.uvAttrib = gl.getAttribLocation(program, "aTexturePosition");
      gl.enableVertexAttribArray(program.uvAttrib);

      program.samplerUniform = gl.getUniformLocation(program, "uTexture");

      gl.useProgram(null);

      return program;
    };

    gl.programs["texture"] = compile_texture_program();
  };

  var load_shaders = (function(callback)
  {
    var num_shaders = 0;
    var loaded_shaders = 0;

    var request_shader = (function(shader_id, src, type)
    {
      var request = new XMLHttpRequest();
      request.open("GET", src, true);
      request.overrideMimeType('text/plain');
      request.onreadystatechange = (function()
      {
        if (request.status == 404)
        {
          opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
              "failed downloading shaders, 404 " + src + " not found");
        }
        else if (request.status == 200 && request.readyState == 4)
        {
          this.shaders[shader_id] = {
            "src": request.responseText,
            "type": type,
            "id" : shader_id
          };

          loaded_shaders++;
          if (loaded_shaders == num_shaders)
          {
            callback();
          }
        }
      }).bind(this);
      request.send();
    }).bind(this);

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

  }).bind(this);

  load_shaders(this.init_gl.bind(this));

  messages.addListener('runtime-selected', this.clear.bind(this));
};
