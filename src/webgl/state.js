"use strict";

window.cls || (window.cls = {});

cls.WebGLState = function ()
{
  // Retrieves the state of a WebGL context denoted by it's runtime & object id
  this.send_state_query = function(rt_id, ctx_id)
  {
    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_state);
    var cb = window.webgl.extract_array_callback(this._finalize_state_query);
    var tag = tagManager.set_callback(
        this,
        window.webgl.eval_examine_callback(cb, this._error.bind(this), true),
        [rt_id, ctx_id]
    );

    window.services["ecmascript-debugger"].requestEval(tag, [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._finalize_state_query = function(data, rt_id, ctx_id)
  {
    data = data[0];
    var state = {};
    for (var i = 0; i < data.length - 1; i++) // length member included, thus -1
    {
      var param = data[i][2].split(/\|(.+)?/)[0];
      var value = data[i][2].split(/\|(.+)?/)[1];
      state[param] = value;
    }

    messages.post('webgl-new-state', {"object_id" : ctx_id, "state" : state });
  };

  this._error = function(status, message)
  {
    messages.post('webgl-error', {"origin": "state", status : status, message :message});
  };
};
