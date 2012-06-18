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
      this.texture._send_texture_query(ctx);
    }
  };

  // Request for one texture image data string.
  this.request_texture_data = function(ctx, texture_url)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.texture._get_texture_data(ctx, texture_url);
    }
  };

  this.request_state = function (ctx)
  {
    if (this.available())
    {
      ctx = (ctx || this.contexts[0]);
      this.state._send_state_query(ctx);
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

  this._send_injection = function (rt_id, cont_callback)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.injection);
    var tag = tagManager.set_callback(this, this._handle_injection, [rt_id, cont_callback]);
    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, []]);
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

  this.handle_error = function(status, message, rt_id, ctx_id)
  {
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

  this._load_shaders = function()
  {
    var _request_shader = (function(shader_id, src, type)
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
          this.shaders[shader_id] = {"src": request.responseText, "type": type };
        }
      }).bind(this);
      request.send();
    }).bind(this);

    var scripts = document.getElementsByTagName("script");

    for (var i=0; i<scripts.length; i++)
    {
      var type = scripts[i].type.match(/vertex|fragment/);
      if (!type)
      {
        continue;
      }

      var t = type[0]

      var shader = scripts[i].id;
      var src = scripts[i].src;

      _request_shader(shader, src, t);
    }
  };

  // TODO: Move this
  //  this.quad.Add(-1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0);
  this.quad = [ -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0 ];
  this.uv = [ 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0 ];

  // TODO: And this
  this.compileProgram = function (vs_src, fs_src, gl)
  {
    var _compile = function (src, type)
    {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {    
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "An error occurred compiling shader: " + gl.getShaderInfoLog(shader));    
        return null;
      }

      return shader;
    };

    var vs = _compile(vs_src, gl.VERTEX_SHADER);
    var fs = _compile(fs_src, gl.FRAGMENT_SHADER);

    var prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);

    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {  
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "An error occured while linking shaders.");  
      return null;
    }

    return prg;
  };


  this._load_shaders();


  messages.addListener('runtime-selected', this.clear.bind(this));
};
