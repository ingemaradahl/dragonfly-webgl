"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLStartView = function(id, name, container_class)
{
  this.createView = function(container)
  {
    this._container = container;
    this.render();
  };

  this.render = function()
  {
    if (!this._container) return;

    var state = window.webgl.injected ? "snapshot": "init";
    this._container.clearAndRender(window.templates.webgl.start_view(state));
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  var on_settings = function(msg)
  {
    if (msg.id === "webgl-snapshot" && msg.key === "pre-composite-capture")
    {
      this.render()
    }
  };

  var on_open_settings = function(event, target)
  {
    var overlay = Overlay.get_instance();
    if (!overlay.is_visible)
    {
      // Hack to get the settings overlay to display properly
      var ui = UI.get_instance();
      target = ui.get_button("toggle-settings-overlay");

      var broker = ActionBroker.get_instance();
      broker.dispatch_action("global", "show-overlay", event, target);
    }
    overlay.change_group("webgl");
  };

  messages.addListener('setting-changed', on_settings.bind(this));

  var eh = window.eventHandlers;
  eh.click["webgl-open-settings"] = on_open_settings.bind(this);

  this.init(id, name, container_class);
};
cls.WebGLStartView.prototype = ViewBase;

