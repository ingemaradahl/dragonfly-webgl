"use strict";

window.cls || (window.cls = {});

cls.WebGLState = function ()
{
  // Retrieves the state of a WebGL context denoted by it's id.
  this.send_state_query = function(ctx_id)
  {
    var finalize = function (data)
    {
      var state = {};
      for (var i = 0; i < data.length; i++)
      {
        var param = data[i].split(/\|(.+)?/)[0];
        var value = data[i].split(/\|(.+)?/)[1];
        state[param] = value;
      }

      messages.post('webgl-new-state', {"object_id" : ctx_id, "state" : state });
    };

    var scoper = new WebGLUtils.Scoperer(webgl.interfaces[ctx_id].get_state, finalize, this);
    scoper.exec();
  };

  this._error = function(status, message)
  {
    messages.post('webgl-error', {"origin": "state", status : status, message :message});
  };
};
