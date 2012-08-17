"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLStartView = function(id, name, container_class)
{
  var snapshot_present = false;

  this.createView = function(container)
  {
    this._container = container;
    this.render();
  };

  this.render = function()
  {
    if (!this._container) return;

    var state = window.webgl.injected
      ? snapshot_present
        ? "select"
        : "snapshot"
      : "init";
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

  var on_snapshot = function(event, target)
  {
    snapshot_present = true;
    this.render();
  };

  var on_new_context = function()
  {
    var ui = UI.get_instance();
    // Could be improved
    var button = ui.get_button("webgl-trace-side-panel-take-snapshot") ||
                 ui.get_button("webgl-buffer-side-panel-take-snapshot") ||
                 ui.get_button("webgl-texture-side-panel-take-snapshot") ||
                 ui.get_button("webgl-program-side-panel-take-snapshot");
    if (button)
      button.addClass("button-focus");

    messages.removeListener('webgl-new-context', on_new_context_bound);
  };
  var on_new_context_bound = on_new_context.bind(this);

  var on_taking_snapshot = function()
  {
    var ui = UI.get_instance();
    var button = ui.get_button("webgl-trace-side-panel-take-snapshot");
    if (button)
      button.removeClass("button-focus");

    messages.removeListener('webgl-taking-snapshot', on_taking_snapshot_bound);
  };
  var on_taking_snapshot_bound = on_taking_snapshot.bind(this)

  messages.addListener('setting-changed', on_settings.bind(this));
  messages.addListener('webgl-new-snapshot', on_snapshot.bind(this));
  messages.addListener('webgl-new-context', on_new_context_bound);
  messages.addListener('webgl-taking-snapshot', on_taking_snapshot_bound);

  var eh = window.eventHandlers;
  eh.click["webgl-open-settings"] = on_open_settings.bind(this);

  this.init(id, name, container_class);
};
cls.WebGLStartView.prototype = ViewBase;

