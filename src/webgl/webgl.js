﻿"use strict";

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
    this.data = {};

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

  /**
   * Extracts the result from requestEval call. If its a object then its examined.
   * The runtime id must be set as first element in the argument list.
   * Last argument must be the object id of the result from the eval request.
   * @param {Function} callback this is called when the object have been examined.
   *   Arguments: [status, object/value, runtime id, ...(, object id)]
   * @param {Function} error_callback optional, is called when an error occurs.
   * @param {Boolean} release_objects optional, iff true then objects are released after they are examined.
   */
  this.eval_examine_callback = function(callback, error_callback, release_objects)
  {
    var obj_id;

    function release_objects_callback()
    {
      window.services["ecmascript-debugger"].requestReleaseObjects(0, [obj_id]);
      callback.apply(this, arguments);
    }

    return function(status, message, rt_id)
    {
      var STATUS = 0;
      var TYPE = 1;
      var VALUE = 2;
      var OBJECT = 3;

      var OBJECT_ID = 0;
      var OBJECT_TYPE = 4;

      if (message[STATUS] === "completed")
      {
        var args = Array.prototype.slice.call(arguments, 2);

        var value = window.webgl.revive_value(message);
        if (typeof(value) === "object")
        {
          args.push(value.object_id);
          var next_callback = release_objects === true ? release_objects_callback : callback;
          var tag = tagManager.set_callback(this, next_callback, args);
          window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [value.object_id]]);
        }
        else
        {
          callback.apply(this, [0, value].concat(args)); // 0 is the status
        }
      }
      else if (message[STATUS] === "unhandled-exception" && message[OBJECT][OBJECT_TYPE] === "Error")
      {
        obj_id = message[OBJECT][OBJECT_ID];
        var tag_error = tagManager.set_callback(this, window.webgl.handle_error, [obj_id]);
        window.services["ecmascript-debugger"].requestExamineObjects(tag_error, [rt_id, [obj_id]], true, true); //TODO
      }
      else
      {
        if (error_callback != null) error_callback.apply(this, arguments);
        else opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "An unknown error occured during execution of a script on the host " +
            "function eval_examine_callback in WebGLDebugger.");
      }
    };
  };

  /**
   * Examines all objects in an array. Use as a callback on requestExamineObjects
   * where a single object id is specified.
   * The runtime id must be set as first element in the argument list.
   * Last argument must be the object id of the result from the eval request.
   * @param {Function} callback this is called when the objects have been examined.
   *   Arguments: [status, list of objects, runtime id, ..., root object id]
   *   Arguments with extract: [simplified list of objects, runtime id, ..., root object id]
   * @param {Function} error_callback optional, is called when an error occurs.
   * @param {Number} extract optional, see enum EXTRACT_ARRAY.
   * @param {Boolean} release_object optional, iff true then the object id in
   *   the last argument will be released when all array elements have been examined.
   */
  this.examine_array_callback = function(callback, error_callback, extract, release_object)
  {
    var root_object_id;

    function release_objects_callback()
    {
      window.services["ecmascript-debugger"].requestReleaseObjects(0, root_object_id);
      callback.apply(this, arguments);
    }

    return function(status, message, rt_id)
    {
      var STATUS = 0;
      var TYPE = 1;
      var VALUE = 2;
      var OBJECT = 3;
      // sub message ObjectValue
      var OBJECT_ID = 0;

      if (status === 0)
      {
        var msg_vars = message[0][0][0][0][1];

        // ignore the last element since its the lenth of the array
        var len = msg_vars.length - 1;

        var object_ids = [];
        for (var i = 0; i < len; i++)
        {
          var id = msg_vars[i][OBJECT][OBJECT_ID];
          object_ids.push(id);
        }

        var args = Array.prototype.slice.call(arguments, 2);
        if (object_ids.length > 0)
        {
          var next_callback = callback;
          if (release_object === true)
          {
            next_callback = release_objects_callback;
            root_object_id = arguments[arguments.length - 1];
          }
          if (extract >= window.webgl.EXTRACT_ARRAY.EXTRACT)
          {
            next_callback = window.webgl.extract_array_callback.call(this, next_callback, error_callback, extract === window.webgl.EXTRACT_ARRAY.EXTRACT_REVIVE);
          }
          var tag = tagManager.set_callback(this, next_callback, args);
          window.services["ecmascript-debugger"].requestExamineObjects(tag,
              [rt_id, object_ids]);
        }
        else
        {
          callback.apply(this, [0, []].concat(args));
        }
      }
      else
      {
        if (error_callback != null) error_callback.apply(this, arguments);
        else opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "failed examine_array_callback in WebGLDebugger: " + message[0]);
      }
    };
  };

  /**
   * Use as a callback on requestEval where the result is an array.
   * Examines the object that object that is resturned from requestEval and then examines the sub objects (the elements in the array).
   * @param {Function} callback this is called when the array have been examined.
   *   Arguments: [status, list of objects, runtime id, ..., root object id]
   *   Arguments with extract: [simplified list of objects, runtime id, ..., root object id]
   * @param {Function} error_callback optional, is called when an error occurs.
   * @param {Number} extract optional, see enum EXTRACT_ARRAY.
   * @param {Boolean} release_object optional, iff true then the object id in
   *   the last argument will be released when all array elements have been examined.
   */
  this.examine_array_objects_eval_callback = function(callback, error_callback, extract, release_object)
  {
    return this.eval_examine_callback(
        this.examine_array_callback(callback, error_callback, extract, release_object),
        error_callback,
        false);
  };

  /**
   * Examines an array that is on Scopes ObjectInfo form.
   * @param {Object} that context that the callback should be running with.
   * @param {Array} array Array with type ObjectInfo of the elements.
   * @param {Function} callback this is called when the array have been examined.
   *   Arguments: [status, list of objects, runtime id, ..., root object id]
   *   Arguments with extract: [simplified list of objects, runtime id, ..., root object id]
   * @param {Array} args arguments that should be passed to the callback.
   * @param {Number} extract optional, see enum EXTRACT_ARRAY.
   * @param {Function} error_callback optional, is called when an error occurs.
   */
  this.examine_array = function(that, array, callback, args, extract, error_callback)
  {
    if (extract >= window.webgl.EXTRACT_ARRAY.EXTRACT)
    {
      callback = window.webgl.extract_array_callback.call(this, callback,
          error_callback, extract === window.webgl.EXTRACT_ARRAY.EXTRACT_REVIVE);
    }
    var ids = [];
    for (var j = 0; j < array.length; j++) {
      if (array[j][1] !== "object") continue;
      ids.push(array[j][3][0]);
    }

    var tag = tagManager.set_callback(that, callback, args);
    window.services["ecmascript-debugger"].requestExamineObjects(tag, [args[0], ids]);
  };

  /**
   * Use as a callback from requestExamineObjects. Simplifies the structure of
   * the recieved message.
   * @param {Function} callback this is called when the array have been examined.
   *   Arguments: [list of objects, runtime id, ..., root object id]
   * @param {Function} error_callback optional, is called when an error occurs.
   */
  this.extract_array_callback = function(callback, error_callback, revive, release_object)
  {
    return function(status, message)
    {
      if (status !== 0)
      {
        if (error_callback != null) error_callback.apply(this, arguments);
        else opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
            "failed extract_array in WebGLDebugger: " + message[0]);
        return;
      }

      if (release_object === true)
      {
        window.services["ecmascript-debugger"].requestReleaseObjects(0, arguments[arguments.length - 1]);
      }

      var data = [];
      if (message.length !== 0)
      {
        var i, msg_vars;
        if (revive === true)
        {
          for (i = 0; i < message[0].length; i++)
          {
            var obj;
            if (message[0][i][0][0][0][4] === "Array")
            {
              obj = [];
            }
            else
            {
              obj = {
                object_id: message[0][i][0][0][0][0],
                type: message[0][i][0][0][0][2],
                class_name: message[0][i][0][0][0][4]
              };
            }

            msg_vars = message[0][i][0][0][1];
            for (var j = 0; j < msg_vars.length; j++) {
              var key = msg_vars[j][0];

              obj[key] = window.webgl.revive_value(msg_vars[j]);
            }
            data.push(obj);
          }
        }
        else
        {
          for (i = 0; i < message[0].length; i++)
          {
            msg_vars = message[0][i][0][0][1];
            data.push(msg_vars);
          }
        }
      }
      callback.apply(this, [data].concat(Array.prototype.slice.call(arguments, 2)));
    };
  };

  this.EXTRACT_ARRAY = {
    OFF: 0,
    EXTRACT: 1,
    EXTRACT_REVIVE: 2
  };

  this.revive_value = function(msg_vars)
  {
    var type = msg_vars[1];
    var value = msg_vars[2];

    switch (type)
    {
      case "number":
        value = Number(value);
        break;
      case "boolean":
        value = Boolean(value);
        break;
      case "null":
        value = null;
        break;
      case "undefined":
        value = undefined;
        break;
      case "object":
        value = {
          object_id: msg_vars[3][0],
          type: msg_vars[3][2],
          class_name: msg_vars[3][4],
        };
        break;
    }
    return value;
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
