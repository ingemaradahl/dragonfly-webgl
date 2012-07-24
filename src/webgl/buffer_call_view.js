"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLHeaderViewBase
 */

cls.WebGLBufferCallView = function(id, name, container_class)
{
  this._container = null;
  this._snapshot = null;
  this._call_index = null;

  this.createView = function(container)
  {
    this._container = container;
  };

  this.display_by_call = function(snapshot, call_index)
  {
    this._snapshot = snapshot;
    this._call_index = call_index;

    var call = snapshot.trace[call_index];
    var template = window.templates.webgl.buffer_base(call.linked_object.buffer);
    call.linked_object.buffer.show();

    this.render_with_header(snapshot, call_index, template);
  };

  this._ondestroy = function()
  {
    this._container = null;
  };

  this._on_buffer_data = function(msg)
  {
    if (this._container)
    {
      var template = window.templates.webgl.buffer_base(msg);
      this.render_with_header(this._snapshot, this._call_index, template);
    }
  };

  messages.addListener('webgl-buffer-data', this._on_buffer_data.bind(this));

  this.init(id, name, container_class);
};

cls.WebGLBufferCallView.prototype = cls.WebGLHeaderViewBase;


