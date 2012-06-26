"use strict";

window.cls || (window.cls = {});

/**
 * Class that handles communication with Scope. Gives easy control of examination
 * of objects and takes care of the releasing of them as well.
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
 * Sets a function that determines what action to take on an object based on the property name and object type.
 */
cls.Scoper.prototype.set_object_action = function(object_action)
{
  this.object_action = object_action;
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

cls.Scoper.prototype.eval_script = function(script, objects, release)
{
  typeof(release) === "boolean" || (release = true);
  this.current_depth = 0;
  var tag = tagManager.set_callback(
      this,
      this._eval_callback,
      [this.runtime_id, release]);
  window.services["ecmascript-debugger"].requestEval(tag,
      [this.runtime_id, 0, 0, script, objects]);
};

/**
 * Callback to Scopes requestEval.
 */
cls.Scoper.prototype._eval_callback = function(status, message, rt_id, release)
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

      this._examine_level([object_id], targets);
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
    if (this.have_error_callback())
    {
      this.release_objects([error_id]);
      this.error();
    }
    else
    {
      var tag_error = tagManager.set_callback(
          this, window.WebGLUtils.handle_error, [error_id]);
      window.services["ecmascript-debugger"].requestExamineObjects(
          tag_error, [this.runtime_id, [error_id]], true, true);
      // TODO remove handle_error ?
    }
  }
  else
  {
    this.error();
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
    this.error();
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
    action = cls.Scoper.ACTIONS.EXAMINE_RELEASE;
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

cls.Scoper.prototype.have_error_callback = function()
{
  return this.error_callback != null;
};

/**
 * Trigger an error, which will call the error callback if set.
 */
cls.Scoper.prototype.error = function()
{
  if (this.have_error_callback())
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
