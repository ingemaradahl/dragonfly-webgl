"use strict";

window.cls || (window.cls = {});

cls.WebGLBuffer = function()
{
  this._on_buffer_created = function(msg)
  {
    var rt_id = msg.runtime_id;
    // TODO: figure out which context the event originates from, or poll all of them.
    var ctx_id = window.webgl.contexts[0];

    var script = cls.WebGL.RPCs.prepare(cls.WebGL.RPCs.get_new_buffers);
    var tag = tagManager.set_callback(this, window.webgl.examine_array_objects_eval_callback(this._finalize_buffer_created, null, window.webgl.EXTRACT_ARRAY.EXTRACT_REVIVE, true), [rt_id, ctx_id]);
    window.services["ecmascript-debugger"].requestEval(tag,
        [rt_id, 0, 0, script, [["handler", ctx_id]]]);
  };

  this._finalize_buffer_created = function(buffers, rt_id, ctx_id)
  {
    if (buffers.length > 0)
    {
      for (var i = 0; i < buffers.length; i++)
      {
        window.webgl.data[ctx_id].add_buffer(buffers[i]);
      }

      messages.post('webgl-new-buffers', ctx_id);
    }
  };

  this.get_buffer_data = function(rt_id, ctx_id, buffer_index, buffer_id)
  {
    var tag = tagManager.set_callback(this, window.webgl.extract_array_callback(this._handle_buffer_data, null, true), [rt_id, ctx_id, buffer_index]);
    window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [buffer_id]]);
  };

  this._handle_buffer_data = function(buffers, rt_id, ctx_id, buffer_index)
  {
    var buffer = buffers[0];
    window.webgl.data[ctx_id].buffers[buffer_index].update(buffer);

    var tag = tagManager.set_callback(this, window.webgl.extract_array_callback(this._finalize_buffer_data, null, true), [rt_id, ctx_id, buffer.index]);
    window.services["ecmascript-debugger"].requestExamineObjects(tag, [rt_id, [buffer.data.object_id]]);
  };

  this._finalize_buffer_data = function(buffer_data, rt_id, ctx_id, buffer_index)
  {
    var data = buffer_data[0];
    var buffer = window.webgl.data[ctx_id].buffers[buffer_index];
    buffer.set_data(data);
    messages.post('webgl-buffer-data', buffer);
  };

  window.host_tabs.activeTab.addEventListener("webgl-buffer-created",
      this._on_buffer_created.bind(this), false, false);
};
