"use strict";

window.cls || (window.cls = {});

/**
 * Class that handles communication with Scope. Gives easy control of examination
 * of objects and takes care of the releasing of them as well. The default behavior
 * is to examine recursively until there is nothing more to examine or a certain depth have been found.
 * TODO if the same object is requested from multiple places only the last place will it be stored.
 */
cls.Scoper = function(callback, callback_that, callback_arguments)
{
  this.runtime_id;

  this.callback = callback;
  this.callback_that = callback_that;
  this.callback_arguments = callback_arguments || [];
  this.error_callback;
  this.error_callback_that;
  this.callback_arguments;

  this.current_depth = 0;

  this._default_reviver_tree = {
    _action: cls.Scoper.ACTIONS.EXAMINE_RELEASE,
    _depth: 20,
    _reviver: this.reviver_basic
  };

  this.reviver_tree = this._default_reviver_tree;
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
 * Sets the reviver tree which should be formed as the actual structure of the
 * examined data. The tree should contain properties from the list below. Only
 * the parts of the tree that should differ needs to be set. Some properties
 * are valid recursively.
 *
 * Properties:
 * _ignore: {Boolean} if true a non-object value should be ignored.
 * _class: {Function} the class of the object that will be created.
 * _action: {Number} the action to take on the object, should be a value from
 *   cls.Scoper.ACTIONS. Recursive.
 * _array_elements: {Object} when the object is a Array the specified object is
 *   then used for all the elements. If the property key is specified then this
 *   will be ignored for that key.
 * _reviver: {Function} the reviver to use, recursive.
 * _depth: {Number} specifies the maximum depth from a particular point in the
 *   tree, recursive.
 */
cls.Scoper.prototype.set_reviver_tree = function(reviver_tree)
{
  this.reviver_tree = reviver_tree;
  this._inherit_reviver_properties(this._default_reviver_tree, reviver_tree);
  return this;
};

/**
 * Executes a function that exists on the host.
 *
 * @param remote_function An object containing properties for object id of a
 *   remote function and also a runtime id.
 * @param {Boolean} release optional, if the root object should be released or not.
 *   Defaults to true.
 */
cls.Scoper.prototype.execute_remote_function = function(remote_function, release)
{
  var script = "(function(){return f();}).call();";
  this.runtime_id = remote_function.runtime_id;
  var object_id = remote_function.object_id;
  this.eval_script(this.runtime_id, script, [["f", object_id]], release);
};

/**
 * Evaluates a script and examines the result if its an object.
 *
 * @param {Number} runtime_id Runtime id.
 * @param {String} script Script to be executed on the specified runtime.
 * @param {Array} objects Objects that should be available for the script.
 *   Use the following format: [["object_name", object_id]]
 * @param {Boolean} release optional, if the root object should be released or not.
 *   Defaults to true.
 * @param {Boolean} debugging optional, if debugging should be enabled for
 *   script evaluation. Defaults to false
 */
cls.Scoper.prototype.eval_script = function(runtime_id, script, objects, release, debugging)
{
  this.runtime_id = runtime_id;
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

      var object_targets = {};
      object_targets[object_id] = [{
        target: this,
        key: "result",
        reviver_tree: this.reviver_tree
      }];
      object_targets[object_id].release = release;

      if (this.reviver_tree._depth > 0)
      {
        this._examine_level(object_targets);
      }
      else
      {
        var object = message[OBJECT][OBJECT_TYPE].indexOf("Array") !== -1 ? [] : {};
        object.object_id = object_id;
        object.runtime_id = this.runtime_id;
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
      this._retrieve_stacktrace(error_id);
    }
  }
  else
  {
    this._error(message);
  }
};

/**
 * Examine a single object.
 *
 * @param {Object} object Object to examine, should have object_id and runtime_id properties.
 * @param {Boolean} release optional, True will force release the object in Scope.
 *   Otherwise the action in the reviver tree will decide.
 */
cls.Scoper.prototype.examine_object = function(object, release)
{
  typeof(release) === "boolean" || (release = false);
  this.runtime_id = object.runtime_id;
  this.current_depth = 0;

  var object_targets = {};
  this._prepair_object_examine("result", "object", this, object.object_id, object_targets, [], this.reviver_tree);
  if (release) object_targets[object.object_id].release = true;

  var args = [this.runtime_id, object_targets];
  var tag = tagManager.set_callback(this, this._examine_level_callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag,
      [this.runtime_id, [object.object_id], 0, 1]);
};

/**
 * Examine a list of objects.
 *
 * @param {Number} runtime_id Runtime id.
 * @param {Array} objects Object ids of the objects to examine.
 * @param {Boolean} release optional, True will force release the objects in Scope.
 *   Otherwise the action in the reviver tree will decide.
 */
cls.Scoper.prototype.examine_objects = function(runtime_id, object_ids, release)
{
  typeof(release) === "boolean" || (release = false);
  this.runtime_id = runtime_id;
  this.current_depth = 0;
  var targets = {};
  var base = [];
  this.result = base;

  var object_targets = {};
  for (var i = 0; i < object_ids.length; i++)
  {
    var object_id = object_ids[i];
    this._prepair_object_examine(i, "object", base, object_id, object_targets,
        [], this.reviver_tree);
    if (release) object_targets[object_id].release = true;
  }

  var args = [runtime_id, object_targets];
  var tag = tagManager.set_callback(this, this._examine_level_callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag,
      [this.runtime_id, object_ids, 0, 1]);
};

/**
 * Examines a depth level of objects in Scope.
 */
cls.Scoper.prototype._examine_level = function(object_targets)
{
  var list = [];
  for (var id in object_targets)
  {
    list.push(Number(id));
  }

  if (list.length === 0)
  {
    this.callback.apply(this.callback_that, [this.result].concat(this.callback_arguments));
    return;
  }

  var args = [this.runtime_id, object_targets];
  var tag = tagManager.set_callback(this, this._examine_level_callback, args);
  window.services["ecmascript-debugger"].requestExamineObjects(tag,
      [this.runtime_id, list, 0, 1]);
};

/**
 * Examines the next depth level of objects in Scope, if that is the action that is taken.
 */
cls.Scoper.prototype._examine_level_callback = function(status, message, rt_id, in_object_targets)
{
  if (status !== 0)
  {
    this._error(message);
    return;
  }

  this.current_depth++;

  var release_ids = {};
  var out_object_targets = {};

  for (var i = 0; i < message[0].length; i++)
  {
    var object_id = message[0][i][0][0][0][0];
    var target = in_object_targets[object_id];

    this._object_reviver(message[0][i][0][0], target, out_object_targets, release_ids);
  }

  this.release_objects(release_ids);

  this._examine_level(out_object_targets);
};

/**
 * Releases a list of objects.
 *
 * @param {Object} object_ids object with object ids that should be released as properties.
 */
cls.Scoper.prototype.release_objects = function(object_ids)
{
  var list = [];
  for (var id in object_ids)
  {
    list.push(Number(id));
  }

  if (list.length > 0)
  {
    window.services["ecmascript-debugger"].requestReleaseObjects(
        cls.TagManager.IGNORE_RESPONSE,
        [list]);
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
      value = value === "true";
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
 * Revives an object onto all the destinations that have previously been set up.
 */
cls.Scoper.prototype._object_reviver = function(message, object_target, out_object_targets, release_ids)
{
  var release = object_target.release;
  var scoper = this;
  object_target.forEach(function(target_info){
    target_info.target[target_info.key] = target_info.reviver_tree._reviver.call(scoper, release, message, release_ids, out_object_targets, target_info.reviver_tree);
  });
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
 * Takes information about an object prior to examination to know how to extract
 * the data when it have been examined.
 */
cls.Scoper.prototype._prepair_object_examine = function(key, type, target, id,
    object_targets, release_ids, reviver_tree)
{
  var action;
  if (reviver_tree._depth != null && this.current_depth >= reviver_tree._depth)
  {
    action = cls.Scoper.ACTIONS.NOTHING;
  }
  else if (reviver_tree._action != null)
  {
    action = reviver_tree._action;
  }
  else
  {
    action = this.default_object_action;
  }

  switch (action)
  {
    case cls.Scoper.ACTIONS.NOTHING:
      target[key] = type.indexOf("Array") !== -1 ? [] : {};
      target[key].object_id = id;
      target[key].runtime_id = this.runtime_id;
      break;
    case cls.Scoper.ACTIONS.RELEASE:
      // currently overrides all other actions in terms of releasing.
      target[key] = type.indexOf("Array") !== -1 ? [] : {};
      release_ids[id] = true;
      break;
    case cls.Scoper.ACTIONS.EXAMINE:
      if (!(id in object_targets)) object_targets[id] = [];
      object_targets[id].push({
        target: target,
        key: key,
        reviver_tree: reviver_tree
      });
      object_targets[id].release = false;
      break;
    default:
      if (!(id in object_targets)) object_targets[id] = [];
      object_targets[id].push({
        target: target,
        key: key,
        reviver_tree: reviver_tree
      });
      // If already marked for not to be released then don't release it.
      object_targets[id].release = object_targets[id].release !== false;
  }
};

/**
 * Revives the result of a examine of a single object. Determines if it should be released, and what action to take on sub objects.
 */
cls.Scoper.prototype.reviver_basic = function(release, message, release_ids,
    object_targets, reviver_tree)
{
  var NAME = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT = 3,
      // sub message Object
      OBJECT_ID = 0;

  var obj_info = message[0];
  var msg_vars = message[1];

  var object_id = obj_info[0];

  var target;
  if (reviver_tree._class)
  {
    target = new reviver_tree._class();
  }
  else
  {
    target = obj_info[4].indexOf("Array") !== -1 ? [] : {};
  }

  if (release)
  {
    release_ids[object_id] = true;
  }
  else
  {
    target.object_id = object_id;
    target.runtime_id = this.runtime_id;
  }

  if (msg_vars === undefined) return target;

  if (reviver_tree._array_elements && reviver_tree._array_elements._depth)
  {
    reviver_tree._array_elements._depth += this.current_depth;
  }

  for (var j = 0; j < msg_vars.length; j++)
  {
    var key = msg_vars[j][NAME];
    var type = msg_vars[j][TYPE];

    var property_reviver_tree;
    if (reviver_tree[key])
    {
      property_reviver_tree = reviver_tree[key];

      if (property_reviver_tree._depth)
      {
        property_reviver_tree._depth += this.current_depth;
      }
    }
    else if (reviver_tree._array_elements && !isNaN(key))
    {
      property_reviver_tree = reviver_tree._array_elements;
    }
    else
    {
      property_reviver_tree = {};
    }
    this._inherit_reviver_properties(reviver_tree, property_reviver_tree);

    if (type === "object")
    {
      var id = msg_vars[j][OBJECT][OBJECT_ID];

      this._prepair_object_examine(key, type, target, id, object_targets, release_ids, property_reviver_tree);
    }
    else if (property_reviver_tree._ignore !== true)
    {
      target[key] = this.value_reviver(msg_vars[j][TYPE], msg_vars[j][VALUE]);
    }
  }

  return target;
};

/**
 * Same as reviver_basic but will revive typed arrays correctly.
 */
cls.Scoper.prototype.reviver_typed = function(release, message, release_ids,
    object_targets, reviver_tree)
{
  var NAME = 0,
      TYPE = 1,
      VALUE = 2,
      OBJECT = 3,
      // sub message Object
      OBJECT_ID = 0;

  var target;
  var object_id = message[0][0];
  var obj_class_name = message[0][4];

  var msg_vars = message[1];

  var j;
  var idx;
  // Determine if it is an array or another type of object.
  if (reviver_tree._class)
  {
    target = new reviver_tree._class();
  }
  else if ((idx = obj_class_name.indexOf("Array")) !== -1)
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

  if (release)
  {
    release_ids[object_id] = true;
  }
  else
  {
    target.object_id = object_id;
    target.runtime_id = this.runtime_id;
  }

  if (msg_vars === undefined) return target;

  if (reviver_tree._array_elements && reviver_tree._array_elements._depth)
  {
    reviver_tree._array_elements._depth += this.current_depth;
  }

  for (j = 0; j < msg_vars.length; j++) {
    var key = msg_vars[j][NAME];
    var type = msg_vars[j][TYPE];
    // Do not try to set keys that are already defined.
    if (isNaN(key) && key in target) continue;

    var property_reviver_tree;
    if (reviver_tree[key])
    {
      property_reviver_tree = reviver_tree[key];

      if (property_reviver_tree._depth)
      {
        property_reviver_tree._depth += this.current_depth;
      }
    }
    else if (reviver_tree._array_elements && !isNaN(key))
    {
      property_reviver_tree = reviver_tree._array_elements;
    }
    else
    {
      property_reviver_tree = {};
    }
    this._inherit_reviver_properties(reviver_tree, property_reviver_tree);

    if (type === "object")
    {
      var id = msg_vars[j][OBJECT][OBJECT_ID];

      this._prepair_object_examine(key, type, target, id,
          object_targets, release_ids, property_reviver_tree);
    }
    else if (property_reviver_tree._ignore !== true)
    {
      target[key] = this.value_reviver(msg_vars[j][TYPE], msg_vars[j][VALUE]);
    }
  }

  return target;
};

/**
 * Copies over some properties from the parent reviver tree to the child reviver tree.
 */
cls.Scoper.prototype._inherit_reviver_properties = function(parent, child)
{
  if (child._action == null) child._action = parent._action;
  if (child._depth == null) child._depth = parent._depth;
  if (child._reviver == null) child._reviver = parent._reviver;
};

cls.Scoper.prototype._have_error_callback = function()
{
  return this.error_callback != null;
};

/**
 * Trigger an error, which will call the error callback if set.
 */
cls.Scoper.prototype._error = function(message)
{
  if (this._have_error_callback())
  {
    this.error_callback.apply(this.error_callback_that,
        this.error_callback_arguments);
  }
  else
  {
    opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
        "cls.Scoper failed!" + (message != null ? " - " + message : ""));
    throw "Scoper error";
  }
};

/**
 * Retrieves a stacktrace when an error have occurred.
 */
cls.Scoper.prototype._retrieve_stacktrace = function(error_id)
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
  var scoper = new cls.Scoper(console.log, console);
  scoper.examine_object({object_id: obj_id, runtime_id: rt_id});
  return scoper;
}

function scoper_eval(rt_id, depth){
  var scoper = new cls.Scoper(console.log, console);
  var script = "return [{typed: new Int32Array(100), untyped: [1,2,3]},{obj: {num: 2, sobj: {}}, num: 0, other: {bla: \"bla\"}, noexamine: {hidden: 1337}}, 2, {art: 42}];";
  scoper.set_reviver_tree({_reviver: scoper.reviver_typed});
  scoper.eval_script(rt_id, script, []);
  return scoper;
}
*/
