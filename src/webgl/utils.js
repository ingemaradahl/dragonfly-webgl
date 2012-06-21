"use strict";

window.WebGLUtils || (window.WebGLUtils = {});

window.WebGLUtils.compile_program = function (vs, fs, gl)
{
  if (!gl)
  {
    if (!(gl = window.webgl.gl))
    {
      return null;
    }
  }

  var compile = function (shd)
  {
    var shader = gl.createShader(shd.type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, shd.src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "An error occurred compiling shader " + shd.id + ": " + gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  };

  var vertex_shader = compile(vs);
  var fragment_shader = compile(fs);

  var program = gl.createProgram();
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
        "An error occured while linking shaders.");
    return null;
  }

  return program;
};

window.WebGLUtils.get_fullscreen_quad = function()
{
  return {
    position : [ -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0 ],
    uv : [ 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0 ]
  };
};

window.WebGLUtils.draw_texture = function(program, texture, gl)
{
  if (!gl)  {
    if (!(gl = window.webgl.gl))
      return null;
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!gl._quad)
  {
    var quad = WebGLUtils.get_fullscreen_quad();

    gl._quad = {};
    gl._quad.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad.position), gl.STATIC_DRAW);

    gl._quad.uv = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.uv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad.uv), gl.STATIC_DRAW);
  }

  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.position);
  gl.vertexAttribPointer(program.positionAttrib, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl._quad.uv);
  gl.vertexAttribPointer(program.uvAttrib, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(program.samplerUniform, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
window.WebGLUtils.examine_eval_callback = function(callback, error_callback, release_objects)
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

      var value = window.WebGLUtils.revive_value(message);
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
      var tag_error = tagManager.set_callback(this, window.WebGLUtils.handle_error, [obj_id]);
      window.services["ecmascript-debugger"].requestExamineObjects(tag_error, [rt_id, [obj_id]], true, true); //TODO
    }
    else
    {
      if (error_callback != null) error_callback.apply(this, arguments);
      else opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "An unknown error occured during execution of a script on the host " +
          "function eval_examine_callback in WebGLUtils.");
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
window.WebGLUtils.examine_array_callback = function(callback, error_callback, extract, release_object)
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
        if (extract >= window.WebGLUtils.EXTRACT_ARRAY.EXTRACT)
        {
          next_callback = window.WebGLUtils.extract_array_callback.call(this, next_callback, error_callback, extract === window.WebGLUtils.EXTRACT_ARRAY.EXTRACT_REVIVE);
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
          "failed examine_array_callback in WebGLUtils: " + message[0]);
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
window.WebGLUtils.examine_array_eval_callback = function(callback, error_callback, extract, release_object)
{
  return window.WebGLUtils.examine_eval_callback(
      window.WebGLUtils.examine_array_callback(callback, error_callback, extract, release_object),
      error_callback,
      false);
};

/**
 * Use as a callback from requestExamineObjects. Simplifies the structure of
 * the recieved message.
 * @param {Function} callback this is called when the array have been examined.
 *   Arguments: [list of objects, runtime id, ..., root object id]
 * @param {Function} error_callback optional, is called when an error occurs.
 * @param {Boolean} revive optional, iff true then the objects is revived.
 * @param {Boolean} release_object optional, iff true then the array object will be
 *   released before the callback is called.
 */
window.WebGLUtils.extract_array_callback = function(callback, error_callback, revive, release_object)
{
  return function(status, message)
  {
    if (status !== 0)
    {
      if (error_callback != null) error_callback.apply(this, arguments);
      else opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed extract_array in WebGLUtils: " + message[0]);
      return;
    }

    if (release_object === true)
    {
      window.services["ecmascript-debugger"].requestReleaseObjects(0, arguments[arguments.length - 1]);
    }

    var data = [];
    if (message.length !== 0)
    {
      var i, j, msg_vars;
      if (revive === true)
      {
        for (i = 0; i < message[0].length; i++)
        {
          var obj;
          var obj_class_name = message[0][i][0][0][0][4];

          msg_vars = message[0][i][0][0][1];

          var idx;
          // Determine if it is an array or another type of object.
          if ((idx = obj_class_name.indexOf("Array")) !== -1)
          {
            if (idx === 0) // Regular array
            {
              obj = [];
            }
            else // Typed array
            {
              // Determine the size of the buffer
              var buffer;
              for (j = msg_vars.length - 1; j >= 0 && isNaN(msg_vars[j][0]); j--)
              {
                if (msg_vars[j][0] === "byteLength")
                {
                  buffer = new ArrayBuffer(Number(msg_vars[j][2]));
                  break;
                }
              }

              // If the size of the buffer could not be determined then use a regular array
              if (buffer === undefined)
              {
                obj = [];
              }
              else
              {
                switch (obj_class_name)
                {
                  case "Float32Array":
                    obj = new Float32Array(buffer);
                    break;
                  case "Float64Array":
                    obj = new Float64Array(buffer);
                    break;
                  case "Int32Array":
                    obj = new Int32Array(buffer);
                    break;
                  case "Int16Array":
                    obj = new Int16Array(buffer);
                    break;
                  case "Int8Array":
                    obj = new Int8Array(buffer);
                    break;
                  case "Uint32Array":
                    obj = new Uint32Array(buffer);
                    break;
                  case "Uint16Array":
                    obj = new Uint16Array(buffer);
                    break;
                  case "Uint8Array":
                    obj = new Uint8Array(buffer);
                    break;
                }
              }
            }
          }
          else
          {
            obj = {
              object_id: message[0][i][0][0][0][0],
              type: message[0][i][0][0][0][2],
              class_name: message[0][i][0][0][0][4]
            };
          }

          for (j = 0; j < msg_vars.length; j++) {
            var key = msg_vars[j][0];
            // Do not try to set keys that are already defined.
            if (isNaN(key) && key in obj) continue;

            obj[key] = window.WebGLUtils.revive_value(msg_vars[j]);
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

window.WebGLUtils.EXTRACT_ARRAY = {
  UNTOUCHED: 0,     // No extraction
  EXTRACT: 1,       // Simplifies the array by removing some depth.
  EXTRACT_REVIVE: 2 // Extracts and revives all elements.
};

/**
 * Use as a callback from requestExamineObjects. Simplifies the structure of
 * the recieved message.
 * @param {Function} callback this is called when the objects have been examined.
 *   Arguments: [status, list of objects, runtime id, ..., root object id]
 *   Arguments with extract: [simplified list of objects, runtime id, ..., root object id]
 * @param {Function} error_callback optional, is called when an error occurs.
 * @param {Boolean} revive optional, iff true then the object is revived.
 */
window.WebGLUtils.extract_object_callback = function(callback, error_callback, revive)
{
  return function(status, message, rt_id)
  {
    if (status === 0)
    {
      var msg_vars = message[0][0][0][0][1];

      var value = revive !== true ? msg_vars : window.WebGLUtils.revive_value(msg_vars);

      var args = Array.prototype.slice.call(arguments, 2);

      callback.apply(this, [value].concat(args));
    }
    else
    {
      if (error_callback != null) error_callback.apply(this, arguments);
      else opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "failed examine_array_callback in WebGLUtils: " + message[0]);
    }
  };
};

/**
 * Use as a callback on requestEval where the result is a object.
 * Examines the object returned and extracts it.
 * @param {Function} callback this is called when the array have been examined.
 *   Arguments: [object, runtime id, ..., root object id]
 * @param {Function} error_callback optional, is called when an error occurs.
 * @param {Boolean} revive optional, iff true then the object is revived.
 * @param {Boolean} release_object optional, iff true then the object will be
 *   released before the callback is called.
 */
window.WebGLUtils.extract_object_eval_callback = function(callback, error_callback, revive, release_object)
{
  return window.WebGLUtils.examine_eval_callback(
      window.WebGLUtils.extract_object_callback(callback, error_callback, revive),
      error_callback,
      release_object);
};

/**
 * Converts a Scope ObjectInfo - Property to a JavaScript type.
 * For objects a object is returned containing object id, type and class name.
 */
window.WebGLUtils.revive_value = function(msg_vars)
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

/**
 * Examines all object elements of an array that is on Scopes ObjectInfo form.
 * @param {Object} that context that the callback should be running with.
 * @param {Array} array Array with type ObjectInfo of the elements.
 * @param {Function} callback this is called when the array have been examined.
 *   Arguments: [status, list of objects, runtime id, ..., root object id]
 *   Arguments with extract: [simplified list of objects, runtime id, ..., root object id]
 * @param {Array} args arguments that should be passed to the callback.
 * @param {Number} extract optional, see enum EXTRACT_ARRAY.
 * @param {Function} error_callback optional, is called when an error occurs.
 */
window.WebGLUtils.examine_array = function(that, array, callback, args, extract, error_callback)
{
  if (extract >= window.WebGLUtils.EXTRACT_ARRAY.EXTRACT)
  {
    callback = window.WebGLUtils.extract_array_callback.call(this, callback,
        error_callback, extract === window.WebGLUtils.EXTRACT_ARRAY.EXTRACT_REVIVE);
  }
  var ids = [];
  for (var j = 0; j < array.length; j++) {
    if (array[j][1] !== "object") continue;
    ids.push(array[j][3][0]);
  }

  var tag = tagManager.set_callback(that, callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag, [args[0], ids]);
};
