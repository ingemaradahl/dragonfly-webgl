"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.WebGLDebugger = function ()
{
  this.injected = false;
  this.runtime_id = -1;

  /* Each context have its own data object, the context id is used as a key. */
  this.data = {};

  this.api = new cls.WebGLAPI();
  this.buffer = new cls.WebGLBuffer();
  this.state = new cls.WebGLState();
  this.trace = new cls.WebGLTrace(this.api);
  this.test = new cls.WebGLTest();
  this.texture = new cls.WebGLTexture();

  // Object IDs for Wrapped Context Objects
  this.contexts = [];

  this.inject = function (rt_id, cont_callback)
  {
    if (this.runtime_id != rt_id)
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
    this.data[context_id] = new cls.WebGLData();
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
    if (message[0] == 'completed')
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
    if (message.runtime_id == this.runtime_id) 
    {
      // Unfortunately, it's impossible to have the message contain the object
      // id of the WrappedContext object without heavy modification to tabs.js,
      // thus we need to query the DOM for the possible contexts.
      var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.query_contexts);
      var tag = tagManager.set_callback(this, this._handle_context_query);
      window.services["ecmascript-debugger"].requestEval(tag, [this.runtime_id, 0, 0, script, []]);
    }
  };

  this._handle_context_query = function(status, message)
  {
    var
      STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT_VALUE = 3,
      // sub message ObjectValue
      OBJECT_ID = 0;

    if (message[STATUS] == 'completed')
    {
      if (message[TYPE] == 'null')
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "no WebGL context present, yet message recieved");
      }
      else {
        var return_arr = message[OBJECT_VALUE][OBJECT_ID];
        var tag = tagManager.set_callback(this, this._finalize_context_query);
        window.services["ecmascript-debugger"].requestExamineObjects(tag, [this.runtime_id, [return_arr]]);
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed _handle_context_query in WebGLDebugger");
    }
  };

  this._finalize_context_query = function(status, message)
  {
    if (status === 0)
    { 
      var gl_object_ids = [];
      // TODO: Cleanup, describing all message indices
      // ?[0] -> ObjectChainList[0] -> ObjectList[0] -> ObjectInfo[1] -> Property
      // TODO: Remove or mark contexts that no longer exists.
      var property_list = message[0][0][0][0][1];
      for (var i=0; i < property_list.length-1; i++)
      {
        var ctx_id = property_list[i][3][0];
        gl_object_ids.push(ctx_id);
        if (!(ctx_id in this.data)) this.add_context(ctx_id);

        // Tell the target context that the debugger is ready.
        var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.debugger_ready);
        window.services["ecmascript-debugger"].requestEval(0,
            [this.runtime_id, 0, 0, script, [["gl", ctx_id]]]);
      }

      this.contexts = gl_object_ids;
      messages.post('webgl-new-context', gl_object_ids);
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed finalize_context_query in WebGLDebugger");
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

  messages.addListener('runtime-selected', this.clear.bind(this));
};
