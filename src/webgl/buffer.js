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
  this.get_buffer_data = function(rt_id, ctx_id, buffer_index, buffer_id)
  {
    var finalize = function (buffer)
    {
      var data = buffer.data;
      var buffer = window.webgl.data[ctx_id].buffers[buffer.index];
      buffer.set_data(data);
      messages.post('webgl-buffer-data', buffer);
    };

    var scoper = new cls.Scoper(rt_id, finalize, this);
    scoper.examine_object(buffer_id);
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

    for (var c=0; c<window.webgl.contexts.length; c++)
    {
      var ctx_id = window.webgl.contexts[c];
      var interface_call = window.webgl.interfaces[ctx_id].get_new_buffers;
      var scoper = new WebGLUtils.Scoperer(interface_call, finalize, this, [ctx_id]);
      scoper.set_max_depth(2);
      scoper.set_object_action(function() { return cls.Scoper.ACTIONS.EXAMINE; });
      scoper.exec();
    }
  };

  window.host_tabs.activeTab.addEventListener("webgl-buffer-created",
      on_buffer_created.bind(this), false, false);
};
