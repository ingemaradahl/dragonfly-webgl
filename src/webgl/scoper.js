"use strict";

window.cls || (window.cls = {});

/**
 * Class that handles communication with Scope. Gives easy control of examination
 * of objects and takes care of the releasing of them as well. The default behavior
 * is to examine recurivly until there is nothing more to examine or a certain depth have been found.
 * TODO rebuild to not take the runtime_id in the constructor and set it in non released objects.
 */
cls.Scoper = function(runtime_id, callback, callback_that, callback_arguments)
{
  this.runtime_id = runtime_id;

  this.callback = callback;
  this.callback_that = callback_that;
  this.callback_arguments = callback_arguments || [];
  this.error_callback;
  this.error_callback_that;
  this.callback_arguments;

  this.default_object_action = cls.Scoper.ACTIONS.EXAMINE_RELEASE;
  this.object_action;

  this.max_depth = 20;
  this.current_depth = 0;

  this.reviver = this.reviver_basic;
};

/**
 * Sets the callback where the result will be sent to.
 */
cls.Scoper.prototype.set_callback = function(callback, callback_that, callback_arguments,
    error_callback, error_callback_that, error_callback_arguments)
{
  this.callback = callback;
  this.callback_that = callback_that;
  this.callback_arguments = callback_arguments || [];
  this.error_callback = error_callback;
  this.error_callback_that = error_callback_that || callback_that;
  this.error_callback_arguments = error_callback_arguments || callback_arguments || [];
  return this;
};

/**
 * Sets an action to take on an object when examined or a function that
 * determines what action to take on an object based on the property name and object type.
 *
 * @param {Function, Number} object_action either a default action or a
 * function that will determine the action based on the property name and type
 * of the object.
 */
cls.Scoper.prototype.set_object_action = function(object_action)
{
  switch (typeof(object_action))
  {
    case "number":
      this.default_object_action = object_action;
      this.object_action = null;
      break;
    case "function":
      this.object_action = object_action;
      break;
    default:
      throw "Type must be a function or a number from the enum cls.Scoper.ACTIONS";
  }
  return this;
};

/**
 * @param {Number} max_depth maximum depth that should be examined.
 */
cls.Scoper.prototype.set_max_depth = function(max_depth)
{
  this.max_depth = max_depth;
  return this;
};

/**
 * @param {Function} reviver Reviver to be used.
 */
cls.Scoper.prototype.set_reviver = function(reviver)
{
  this.reviver = reviver;
  return this;
};

/**
 * Evaluates a script and examies the result if its an object.
 *
 * @param {String} script Script to be executed on the specified runtime.
 * @param {Array} objects Objects that should be available for the script.
 *   Use the following format: [["object_name", object_id]]
 * @param {Boolean} release optional, if the root object should be released or not.
 *   Defaults to true.
 * @param {Boolean} debugging optional, if debugging should be enabled for
 *   script evaluation. Defaults to false
 */
cls.Scoper.prototype.eval_script = function(script, objects, release, debugging)
{
  typeof(release) === "boolean" || (release = true);
  this.current_depth = 0;

  var tag;
  if (this.callback == null)
  {
    tag = cls.TagManager.IGNORE_RESPONSE;
  }
  else
  {
    tag = tagManager.set_callback(
        this,
        this._eval_callback,
        [release]);
  }
  window.services["ecmascript-debugger"].requestEval(tag,
      [this.runtime_id, 0, 0, script, objects, debugging ? 1 : 0]);
};

/**
 * Callback to Scopes requestEval.
 * TODO: Add support for _not_ examining the result, just returning the object id
 */
cls.Scoper.prototype._eval_callback = function(status, message, release)
{
  var STATUS = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT = 3,
      OBJECT_ID = 0,
      OBJECT_TYPE = 4;

  if (message[STATUS] === "completed")
  {
    if (message[TYPE] === "object")
    {
      var object_id = message[OBJECT][OBJECT_ID];

      var targets = {};
      targets[object_id] = this._object_reviver(this, "result", release);

      if (this.max_depth > 0)
      {
        this._examine_level([object_id], targets);
      }
      else
      {
        var object = message[OBJECT][OBJECT_TYPE].indexOf("Array") !== -1 ? [] : {};
        object.object_id = object_id;
        this.callback.apply(this, [object].concat(this.callback_arguments));
      }
    }
    else
    {
      var value = this.value_reviver(message[TYPE], message[VALUE]);
      this.callback.apply(this, [value].concat(this.callback_arguments));
    }
  }
  else if (message[STATUS] === "unhandled-exception" &&
      message[OBJECT][OBJECT_TYPE] === "Error")
  {
    var error_id = message[OBJECT][OBJECT_ID];
    if (this._have_error_callback())
    {
      this.release_objects([error_id]);
      this._error();
    }
    else
    {
      this._retrive_stacktrace(error_id);
    }
  }
  else
  {
    this._error();
  }
};

/**
 * Examine a single object.
 *
 * @param {Number} object_id Object id of the object to examine.
 * @param {Boolean} release optional, True will release the object in Scope.
 *   Defaults to true.
 */
cls.Scoper.prototype.examine_object = function(object_id, release)
{
  typeof(release) === "boolean" || (release = true);
  this.current_depth = 0;
  var targets = {};
  targets[object_id] = this._object_reviver(this, "result", release);

  var args = [this.runtime_id, targets];
  var tag = tagManager.set_callback(this, this._examine_level_callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag,
      [this.runtime_id, [object_id]]);
};

/**
 * Examine a list of objects.
 *
 * @param {Array} object_ids Object ids of the objects to examine.
 * @param {Boolean} release optional, True will release the objects in Scope.
 *   Defaults to true.
 */
cls.Scoper.prototype.examine_objects = function(object_ids, release)
{
  typeof(release) === "boolean" || (release = true);
  this.current_depth = 0;
  var targets = {};
  var base = [];
  for (var i = 0; i < object_ids.length; i++) {
    targets[object_ids[i]] = this._object_reviver(base, i, release);
  }

  var args = [this.runtime_id, targets];
  var tag = tagManager.set_callback(this, this._examine_level_callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag,
      [this.runtime_id, object_ids]);
};

/**
 * Examines a depth level of objects in Scope.
 */
cls.Scoper.prototype._examine_level = function(object_ids, object_targets)
{
  var args = [this.runtime_id, object_targets];
  var tag = tagManager.set_callback(this, this._examine_level_callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag,
      [this.runtime_id, object_ids]);
};

/**
 * Examines the next depth level of objects in Scope, if that is the action that is taken.
 */
cls.Scoper.prototype._examine_level_callback = function(status, message, rt_id, targets)
{
  if (status !== 0)
  {
    this._error();
    return;
  }

  this.current_depth++;

  var object_ids = [];
  var release_ids = [];
  var object_targets = {};

  for (var i = 0; i < message[0].length; i++)
  {
    var object_id = message[0][i][0][0][0][0];
    var target = targets[object_id];

    target.call(this, message[0][i][0][0], release_ids, object_ids, object_targets);
  }

  if (release_ids > 0) this.release_objects(release_ids);

  if (object_ids.length > 0)
  {
    this._examine_level(object_ids, object_targets);
  }
  else
  {
    this.callback.apply(this.callback_that, [this.result].concat(this.callback_arguments));
  }
};

/**
 * Revives a non-object value.
 *
 * @param {String} type The type of the value.
 * @param {String} value The value in String form.
 * @returns Revived value.
 */
cls.Scoper.prototype.value_reviver = function(type, value)
{
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
  }
  return value;
};

/**
 * Sets up the reviver to revive an object when the data is available.
 */
cls.Scoper.prototype._object_reviver = function(target_object, target_key, release)
{
  return function(message, release_ids, object_ids, object_targets)
  {
    this.reviver.call(this, target_object, target_key, release, message, release_ids, object_ids, object_targets);
  };
};

/**
 * Enum of different actions that can be performed on objects.
 */
cls.Scoper.ACTIONS =
{
  NOTHING: 0, // Do not examine, but keep the object id for later examination.
  RELEASE: 1, // Do not examine, release directly.
  EXAMINE: 2, // Examine, but do not release it.
  EXAMINE_RELEASE: 3 // Examine and release.
};

/**
 * Revives the result of a examine of a single object. Determines if it should be released, and what action to take on sub objects.
 */
cls.Scoper.prototype.reviver_basic = function(target_object, target_key, release,
    message, release_ids, object_ids, object_targets)
{
  var NAME = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT = 3,
      // sub message Object
      OBJECT_ID = 0;

  var obj_info = message[0];
  var msg_vars = message[1];

  var target = target_object[target_key] = obj_info[4].indexOf("Array") !== -1 ? [] : {};

  if (release)
  {
    release_ids.push(obj_info[0]);
  }
  else
  {
    target.object_id = obj_info[0];
  }

  if (msg_vars === undefined) return;

  for (var j = 0; j < msg_vars.length; j++)
  {
    var key = msg_vars[j][NAME];
    var type = msg_vars[j][TYPE];
    if (type === "object")
    {
      var id = msg_vars[j][OBJECT][OBJECT_ID];

      this._perform_object_action(key, type, target, id, object_ids, object_targets, release_ids);
    }
    else
    {
      target[key] = this.value_reviver(msg_vars[j][TYPE], msg_vars[j][VALUE]);
    }
  }
};

/**
 * Same as reviver_basic but will revive typed arrays correctly.
 */
cls.Scoper.prototype.reviver_typed = function(target_object, target_key, release,
    message, release_ids, object_ids, object_targets)
{
  var NAME = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT = 3,
      // sub message Object
      OBJECT_ID = 0;

  var target;
  var obj_class_name = message[0][4];

  var msg_vars = message[1];

  var j;
  var idx;
  // Determine if it is an array or another type of object.
  if ((idx = obj_class_name.indexOf("Array")) !== -1)
  {
    if (idx === 0 && obj_class_name === "Array") // Regular array
    {
      target = [];
    }
    else // Typed array (probably)
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
        target = [];
      }
      else
      {
        switch (obj_class_name)
        {
          case "Float32Array":
            target = new Float32Array(buffer);
            break;
          case "Float64Array":
            target = new Float64Array(buffer);
            break;
          case "Int32Array":
            target = new Int32Array(buffer);
            break;
          case "Int16Array":
            target = new Int16Array(buffer);
            break;
          case "Int8Array":
            target = new Int8Array(buffer);
            break;
          case "Uint32Array":
            target = new Uint32Array(buffer);
            break;
          case "Uint16Array":
            target = new Uint16Array(buffer);
            break;
          case "Uint8Array":
            target = new Uint8Array(buffer);
            break;
          default:
            target = {};
        }
      }
    }
  }
  else
  {
    target = {};
  }

  target_object[target_key] = target;

  if (release)
  {
    release_ids.push(message[0][0]);
  }
  else
  {
    target.object_id = message[0][0];
  }

  if (msg_vars === undefined) return;

  for (j = 0; j < msg_vars.length; j++) {
    var key = msg_vars[j][NAME];
    var type = msg_vars[j][TYPE];
    // Do not try to set keys that are already defined.
    if (isNaN(key) && key in target) continue;

    if (type === "object")
    {
      var id = msg_vars[j][OBJECT][OBJECT_ID];

      this._perform_object_action(key, type, target, id, object_ids, object_targets, release_ids);
    }
    else
    {
      target[key] = this.value_reviver(msg_vars[j][TYPE], msg_vars[j][VALUE]);
    }
  }
};

/**
 * Determines what action to take on an object and perform it.
 */
cls.Scoper.prototype._perform_object_action = function(key, type, target, id,
    object_ids, object_targets, release_ids)
{
  var action;
  if (this.current_depth >= this.max_depth)
  {
    action = cls.Scoper.ACTIONS.NOTHING;
  }
  else if (this.object_action == null)
  {
    action = this.default_object_action;
  }
  else
  {
    action = this.object_action(key, type);
  }

  switch (action)
  {
    case cls.Scoper.ACTIONS.NOTHING:
      target[key] = type.indexOf("Array") !== -1 ? [] : {};
      target[key].object_id = id;
      break;
    case cls.Scoper.ACTIONS.RELEASE:
      target[key] = type.indexOf("Array") !== -1 ? [] : {};
      release_ids.push(id);
      break;
    case cls.Scoper.ACTIONS.EXAMINE:
      object_ids.push(id);
      target[key] = this._object_reviver(target, key, false);
      object_targets[id] = target[key];
      break;
    default:
      object_ids.push(id);
      target[key] = this._object_reviver(target, key, true);
      object_targets[id] = target[key];
      release_ids.push(id);
  }
};

/**
 * Releases a list of objects.
 *
 * @param {Array} object_ids list of object ids that should be released.
 */
cls.Scoper.prototype.release_objects = function(object_ids)
{
  window.services["ecmascript-debugger"].requestReleaseObjects(
      cls.TagManager.IGNORE_RESPONSE,
      [object_ids]);
};

cls.Scoper.prototype._have_error_callback = function()
{
  return this.error_callback != null;
};

/**
 * Trigger an error, which will call the error callback if set.
 */
cls.Scoper.prototype._error = function()
{
  if (this._have_error_callback())
  {
    this.error_callback.apply(this.error_callback_that,
        this.error_callback_arguments);
  }
  else
  {
    opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
        "cls.Scoper failed!");
  }
};

/**
 * Retreives a stacktrace when an error have occurred.
 */
cls.Scoper.prototype._retrive_stacktrace = function(error_id)
{
  var callback = function(error)
  {
    console.log("Remote error:");
    console.log(error);
  };
  var error_callback = function()
  {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "Scoper failed to retreive a stacktrace.");
  };
  var scoper = new cls.Scoper(this.runtime_id);
  scoper.set_callback(callback, null, null, error_callback);
  scoper.examine_object(error_id);
};

/*
Example usage:

function scoper_examine(rt_id, obj_id){
  var scoper = new cls.Scoper(rt_id, console.log, console);
  scoper.examine_object(obj_id);
  return scoper;
}

function scoper_eval(rt_id, depth){
  var scoper = new cls.Scoper(rt_id, console.log, console);
  var script = "return [{typed: new Int32Array(100), untyped: [1,2,3]},{obj: {num: 2, sobj: {}}, num: 0, other: {bla: \"bla\"}, noexamine: {hidden: 1337}}, 2, {art: 42}];";
  scoper.set_object_action(function(key, type){return key === "noexamine" ? cls.Scoper.ACTIONS.NOTHING : cls.Scoper.ACTIONS.EXAMINE_RELEASE;});
  scoper.set_max_depth(depth);
  scoper.eval_script(script, []);
  return scoper;
}
*/
