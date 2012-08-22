"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLStartView = function(id, name, container_class)
{
  var snapshot_present = false;
  var info_open = false;

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
    this._container.clearAndRender(window.templates.webgl.start_view(state, info_open));
  };

  this.ondestroy = function()
  {
    this._container = null;
  };

  var on_settings = function(msg)
  {
    if (msg.id === "webgl-snapshot")
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

  var on_clear = function(event, target)
  {
    snapshot_present = false;
    window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab(this.id);
  };

  var on_snapshot = function(event, target)
  {
    snapshot_present = true;
    this.render();
  };

  var on_toggle_info = function(event, target)
  {
    var box = target.parentElement;
    var open = false;
    var class_ = null;
    for (var i=0; i<box.classList.length; i++)
    {
      if (box.classList[i] === "open")
      {
        open = true;
        break;
      }
    }

    if (open)
    {
      box.removeClass("open");
      info_open = false;
    }
    else
    {
      box.addClass("open");
      info_open = true;
    }
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

  if (window.settings["webgl-general"].map["first-run"])
  {
    messages.addListener('webgl-new-context', on_new_context_bound);
    messages.addListener('webgl-taking-snapshot', on_taking_snapshot_bound);
    window.settings["webgl-general"].set("first-run", false);
  }

  messages.addListener('setting-changed', on_settings.bind(this));
  messages.addListener('webgl-new-snapshot', on_snapshot.bind(this));
  messages.addListener('webgl-clear', on_clear.bind(this));

  var eh = window.eventHandlers;
  eh.click["webgl-open-settings"] = on_open_settings.bind(this);
  eh.click["webgl-info-box-toggle"] = on_toggle_info.bind(this);

  this.init(id, name, container_class);
};
cls.WebGLStartView.prototype = ViewBase;

