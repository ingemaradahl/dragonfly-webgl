"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.WebGLDebugger = function ()
{
  this.injected = false;
  this.runtime_id = -1;

  this.inject = function (rt_id, cont_callback)
  {
    if (this.runtime_id != rt_id)
    {
      this.runtime_id = rt_id;
      this._send_injection(rt_id, cont_callback)
    }
  }

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
  }
}

