"use strict";

window.cls || (window.cls = {});

cls.WebGLBuffer = function()
{
  // Activate automatic updating of buffer information from the host
  this.activate = function()
  {
    for (var i in window.webgl.interfaces)
    {
      var interfac = window.webgl.interfaces[i];
      interfac.enable_buffers_update();
    }
  };

  // Deactivate automatic updating
  this.deactivate = function()
  {
    for (var i in window.webgl.interfaces)
    {
      var interfac = window.webgl.interfaces[i];
      interfac.disable_buffers_update();
    }
  };

  // Initiates a sequence of calls to update the metadata of a buffer and get the current data.
  this.get_buffer_data = function(buffer_index, buffer)
  {
    var finalize = function (updated_buffer)
    {
      buffer.update(updated_buffer);
      buffer.set_data(updated_buffer.data);
      messages.post('webgl-buffer-data', buffer);
    };

    var scoper = new cls.Scoper(finalize, this);
    scoper.set_object_action(cls.Scoper.ACTIONS.EXAMINE);
    scoper.set_reviver(scoper.reviver_typed);
    scoper.examine_object(buffer, false);
  };

  // Runs when new buffers have been created on the host.
  var on_buffer_created = function(msg)
  {
    var finalize = function (buffers, ctx_id)
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

    var ctx_id = window.webgl.canvas_contexts[msg.object_id];
    var interface_call = window.webgl.interfaces[ctx_id].get_new_buffers;
    var scoper = new cls.Scoper(finalize, this, [ctx_id]);
    scoper.set_max_depth(2);
    scoper.set_object_action(cls.Scoper.ACTIONS.EXAMINE);
    scoper.execute_remote_function(interface_call);
  };

  window.host_tabs.activeTab.addEventListener("webgl-buffer-created",
      on_buffer_created.bind(this), false, false);
};
