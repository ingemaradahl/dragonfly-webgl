﻿"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/* Settings view for snapshots */
cls.WebGLSnapshotView = function(id, name, container_class)
{
  this.init(id, name, container_class);
};

cls.WebGLSnapshotView.create_ui_widgets = function()
{
  var checkboxes =
  [
    'pre-composite-capture',
    'fbo-readpixels',
    'stack-trace'
  ];

  var on_change_stacktrace = function (enabled)
  {
    /* When this option is enabled, there is no use in having the "break on
     * exceptions" option set, as it will break for every call that webgl
     * does during snapshot recording and for calls that is recorded in
     * objects history.
     */
    if (enabled)
    {
      var js_settings = window.settings['js_source'];
      if (js_settings.map['error'] || js_settings.map['exception'])
      {
        var message = "When enabling this option the options " +
          "'Break when an exception is thrown' and " +
          "'Show parse errors and break on exceptions' can not be active " +
          "while this option is active. Do you want to disable them to enable " +
          "this option, otherwise this option will remain disabled?";
        // TODO show a fancy Dragonfly UI control instead
        var response = confirm(message);
        if (!response)
        {
          window.settings['webgl-snapshot'].set('stack-trace', false);
          return;
        }
      }

      if (js_settings.map['error'])
        js_settings.set('error', false);

      if (js_settings.map['exception'])
        js_settings.set('exception', false);
    }
  };

  messages.addListener("setting-changed", function(setting) {
    if (setting.id !== "js_source") return;

    if (setting.key === "error" || setting.key === "exception")
    {
      if (window.settings['webgl-snapshot'].map['stack-trace'] && setting.value === true)
      {
        window.settings['webgl-snapshot'].set('stack-trace', false);
      }
    }
  });

  new Settings
  (
    // id
    'webgl-snapshot',
    // key-value map
    {
      'pre-composite-capture' : false,
      'fbo-readpixels' : true,
      'stack-trace' : false,
      'history_length' : 4,
      'snapshot_delay' : 4
    },
    // key-label map
    {
      'pre-composite-capture': "Capture calls issued prior to first compositing (experimental)",
      'history-length': "Object history length",
      'fbo-readpixels': "Read pixels from framebuffers after draw calls",
      'snapshot-delay': "Custom snapshot delay in seconds",
      'stack-trace': "Get WebGL call reference"
    },
    // settings map
    {
      checkboxes: checkboxes,
      customSettings:
      [
        'history_length',
        'snapshot_delay'
      ],
    },
    // template
    {
      'history_length':
      function(setting)
      {
        return (
        [
          'setting-composite',
          ['label',
            setting.label_map['history-length'] + ': ',
            ['input',
              'type', 'number',
              'handler', 'set-history-size',
              'max', '128',
              'min', '0',
              'value', setting.get('history_length')
            ]
          ]
        ] );
      },
      'snapshot_delay':
      function(setting)
      {
        return (
        [
          'setting-composite',
          ['label',
            setting.label_map['snapshot-delay'] + ': ',
            ['input',
              'type', 'number',
              'handler', 'set-snapshot-delay',
              'max', '60',
              'min', '0',
              'value', setting.get('snapshot_delay')
            ]
          ]
        ] );
      }
    },
    "webgl",
    {
      'stack-trace': on_change_stacktrace.bind(this)
    }
  );

  var eh = window.eventHandlers;
  eh.change['set-history-size'] = function(event, target)
  {
    var history_size = Number(event.target.value);
    settings['webgl-snapshot'].set('history_length', history_size);
  };

  eh.change['set-snapshot-delay'] = function(event, target)
  {
    var snapshot_delay = Number(event.target.value);
    settings['webgl-snapshot'].set('snapshot_delay', snapshot_delay);
  };
};

/* General settings view */
cls.WebGLGeneralView = function(id, name, container_class)
{
  this.init(id, name, container_class);
};

cls.WebGLGeneralView.create_ui_widgets = function()
{
  var checkboxes =
  [
    'enable-debugger',
    'highlight-objects'

  ];

  new Settings
  (
    // id
    'webgl-general',
    // key-value map
    {
      'enable-debugger' : true, // TODO: Actually use this setting for hiding the webgl-mode tab
      'highlight-objects' : true,

      'first-run' : true,
    },
    // key-label map
    {
      'enable-debugger': "Enable the WebGL Debugger",
      'highlight-objects': "Highlight objects in the trace list"
    },
    // settings map
    {
      checkboxes: checkboxes,
    },
    // template
    {
    },
    "webgl"
  );

  var eh = window.eventHandlers;
  eh.change['set_max_preview_size'] = function(event, target)
  {
    var preview_size = Number(event.target.value);
    settings['webgl-general'].set('max_preview_size', preview_size);
  };
};

/* Preview settings view */
cls.WebGLPreviewView = function(id, name, container_class)
{
  this.init(id, name, container_class);
};

cls.WebGLPreviewView.create_ui_widgets = function()
{
  var checkboxes =
  [
    'front-face-normal',
    'back-face-normal'
  ];

  new Settings
  (
    // id
    'webgl-preview',
    // key-value map
    {
      'front-face-normal' : false,
      'back-face-normal' : true,
      'max_preview_size' : 128 // In KB
    },
    // key-label map
    {
      'front-face-normal': "Show normal on front facing triangles",
      'back-face-normal': "Show normal on back facing triangles",
      'max_preview_size': "Max size of automatic buffer preview"
    },
    // settings map
    {
      checkboxes: checkboxes,
      customSettings:
      [
        'max_preview_size'
      ]
    },
    // template
    {
      'max_preview_size':
      function(setting)
      {
        return (
        [
          'setting-composite',
          ['label',
            setting.label_map['max_preview_size'] + ': ',
            ['input',
              'type', 'number',
              'handler', 'set_max_preview_size',
              'max', '10240', // Roughly 10 Megabyte
              'min', '0',
              'value', setting.get('max_preview_size')
            ],
            'kB'
          ]
        ] );
      }
    },
    "webgl"
  );

  var eh = window.eventHandlers;
  eh.change['set_max_preview_size'] = function(event, target)
  {
    var preview_size = Number(event.target.value);
    settings['webgl-preview'].set('max_preview_size', preview_size);
  };
};

// ----------------------------------------------------------------------------

cls.WebGLSnapshotSelect = function(id)
{
  this._snapshot_list = [{}];
  this.disabled = true;
  this._selected_snapshot_index = null;
  this._selected_context_id = null;
  this._highlighting = null;

  this.getSelectedOptionText = function()
  {
    if (this.disabled)
    {
      return "No WebGL contexts available.";
    }
    else if (this._selected_context_id != null && this._selected_snapshot_index != null)
    {
      var snapshot = window.webgl.snapshots[this._selected_context_id][this._selected_snapshot_index];
      return "Snapshot #" + this._selected_snapshot_index + ", frame " + snapshot.frame;
    }
    else
    {
      return "No Snapshot available...";
    }
  };

  this.getSelectedOptionValue = function()
  {
  };

  /**
   * Returns the id of the context that is currently selected.
   * Returns null if there is no context selected.
   */
  this.get_selected_context = function()
  {
    return this._selected_context_id;
  };

  /**
   * Return the snapshot that is currently selected.
   *
   */
  this.get_selected_snapshot = function()
  {
    if (this._selected_context_id != null && this._selected_snapshot_index != null)
    {
      return window.webgl.snapshots[this._selected_context_id][this._selected_snapshot_index];
    }
    return null;
  };

  this.getTemplate = function()
  {
    var select = this;
    return function(view)
    {
      return window.templates['cst-select'](select);
    };
  };

  this.templateOptionList = function(select_obj)
  {
    var ret = ["div"];
    var snapshots = select_obj._snapshot_list;

    var contexts = window.webgl.contexts;

    // Iterating the contexts.
    for (var i = 0; i < contexts.length; i++)
    {
      var context_id = contexts[i];
      ret.push([
        "cst-webgl-title",
        "WebGLRenderingContext #" + i,
        "context-id", context_id,
        "class", "js-dd-dir-path"
      ]);

      if (context_id in snapshots)
      {
        // Iterating the snapshots in that context.
        for (var j = 0; j < snapshots[context_id].length; j++)
        {
          var snapshot = snapshots[context_id][j];
          ret.push([
            "cst-option",
            "Snapshot #" + j + ", frame " + snapshot.frame,
            "snapshot-index", j,
            "context-index", i,
            "context-id", context_id,
            "unselectable", "on"
          ]);
        }
      }

      ret.push([
        "cst-option",
        "Take snapshot",
        "context-id", context_id,
        "take-snapshot", true,
      ]);
    }

    ret.push("handler", "webgl-select-context");

    return ret;
  };

  this.checkChange = function(target_ele)
  {
    var context_id = target_ele['context-id'];
    var snapshot_index = target_ele['snapshot-index'];
    var take_snapshot = target_ele['take-snapshot'];

    if (take_snapshot !== undefined)
    {
      window.webgl.request_snapshot(context_id);
      this._selected_context_id = context_id;
      this._selected_snapshot_index = null;
      clear_spotlight();
      return false;
    }
    else if (snapshot_index != null && this._selected_snapshot_index !== snapshot_index)
    {
      this._selected_context_id = context_id;
      this._selected_snapshot_index = snapshot_index;
      messages.post('webgl-changed-snapshot', window.webgl.snapshots[context_id][snapshot_index]);
      clear_spotlight();
      return true;
    }
    return false;
  };

  /**
   * Reloads the tab if it is currently shown.
   */
  var refresh_tab = function()
  {
    var tab = "webgl_mode";
    if (window.topCell.tab.activeTab === tab)
    {
      window.topCell.tab.setActiveTab(tab, true);
    }
  };

  var on_new_context = function(ctx_id)
  {
    if (!this.disabled) return;
    this.disabled = false;
    this._selected_context_id = ctx_id;
    refresh_tab();
  };

  var on_new_snapshot = function(ctx_id)
  {
    var snapshots = window.webgl.snapshots;
    this.disabled = !window.webgl.available();
    this._snapshot_list = snapshots;

    this._selected_context_id = ctx_id;
    this._selected_snapshot_index = snapshots[ctx_id].length - 1;

    var snapshot = snapshots[ctx_id].get_latest_snapshot();
    messages.post("webgl-changed-snapshot", snapshot);
    refresh_tab();
    this.updateElement();
  };

  var clear = function()
  {
    this._selected_snapshot_index = null;
    this._selected_context_id = null;
    clear_spotlight();

    if (!this.disabled)
    {
      this.disabled = true;
      refresh_tab();
    }
  };

  var clear_spotlight = function()
  {
    if (this._highlighting)
    {
      window.hostspotlighter.soft_spotlight(0);
      this._highlighting = null;
    }
  }.bind(this);

  var on_mouseover = function(event, target)
  {
    var option = event.target.get_ancestor("cst-option") || event.target.get_ancestor("cst-webgl-title");

    if (option)
    {
      var context_id = option['context-id'];
      var canvas_id = window.webgl.interfaces[context_id].canvas.object_id;
      if (canvas_id !== this._highlighting)
      {
        window.hostspotlighter.soft_spotlight(canvas_id);
        this._highlighting = canvas_id;
      }

    }
  };

  var on_mouseout = function(event, target)
  {
    clear_spotlight();
  };

  var eh = window.eventHandlers;
  eh.mouseover["webgl-select-context"] = on_mouseover.bind(this);
  eh.mouseout["webgl-select-context"] = on_mouseout.bind(this);

  messages.addListener('webgl-new-context', on_new_context.bind(this));
  messages.addListener('webgl-new-snapshot', on_new_snapshot.bind(this));
  messages.addListener('webgl-clear', clear.bind(this));

  this.init(id);
};

cls.WebGLSnapshotSelect.prototype = new CstSelect();

// ----------------------------------------------------------------------------

cls.WebGLSideView = Object.create(ViewBase, {
  _container: {
    writable: true,
    value: null
  },
  _last_scroll_position: {
    writable: true,
    value: null
  },
  createView: {
    writable: true, configurable: true,
    value: function(container)
    {
      this._container = container;
      this.render();

      var set_scroll = this._last_scroll_position != null;
      this._container.scrollTop = set_scroll ? this._last_scroll_position.top : 0;
      this._container.scrollLeft = set_scroll ? this._last_scroll_position.left : 0;
    }
  },
  ondestroy: {
    writable: true, configurable: true,
    value: function()
    {
      this._last_scroll_position = {
        top: this._container.scrollTop,
        left: this._container.scrollLeft
      };

      this._container = null;
    }
  },
  render: {
    value: function()
    {
      if (window.webgl.runtime_id === -1)
      {
        window.toolbars[this.id].disable();
      }

      if (!this._container || window.webgl.runtime_id === -1) return;

      if (window.webgl.taking_snapshot)
      {
        this._container.clearAndRender(window.templates.webgl.taking_snapshot());
      }
      else if (window.webgl.contexts.length === 0)
      {
        this._container.clearAndRender(window.templates.webgl.no_contexts());
      }
      else
      {
        this._render();
      }
    }
  },
  on_snapshot_delay: {
    value: function(msg)
    {
      if (!this._container) return;

      this._container.clearAndRender(window.templates.webgl.taking_delayed_snapshot(msg.delay));
    }
  },
  init_events: {
    value: function()
    {
      messages.addListener('webgl-changed-snapshot', this.on_snapshot_change.bind(this));
      messages.addListener('webgl-taking-snapshot', this.render.bind(this));
      messages.addListener('webgl-snapshot-delay', this.on_snapshot_delay.bind(this));
    }
  },
  on_snapshot_change: {
    value: function(snapshot)
    {
      this._last_scroll_position = null;
      if (this._on_snapshot_change) this._on_snapshot_change(snapshot);
      this.render();
    }
  }
});

cls.WebGLSideView.create_ui_widgets = function(id)
{
  new ToolbarConfig(
    id,
    [
      {
        handler: 'webgl-take-snapshot',
        title: "Take snapshot",
        icon: 'webgl-snapshot',
        id: 'webgl-' + id + '-take-snapshot',
      },
      {
        handler: 'webgl-take-custom-snapshot',
        title: "Take custom snapshot",
        icon: 'webgl-custom-snapshot',
      }
    ],
    null,
    null,
    [
      {
        handler: 'select-webgl-snapshot',
        title: "Select WebGL snapshot", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['snapshot-select'].getTemplate()
      }
    ]
  );
};

// ----------------------------------------------------------------------------

/**
 * @extends ViewBase
 */
cls.WebGLContentView = Object.create(ViewBase, {
  _container: {
    writable: true,
    value: null
  },
  _content_header: {
    writable: true,
    value: null
  },
  _content_tabs: {
    writable: true,
    value: null
  },
  _content_body: {
    writable: true,
    value: null
  },
  createView: {
    writable: true,
    value : function(container)
    {
      this._container = container;
      this._render_base();

      this._createView(this._header, this._body);
    }
  },
  ondestroy: {
    writable: true,
    value: function()
    {
      this._container = null;
    }
  },
  _render_base: {
    value: function()
    {
      var header = ["div"];
      var tabbar = ["div", this._content_tabs, "class", "tabs"];

      var content = ["div", [], "class", "scroll"];
      var template = [header, tabbar, content];

      this._container.clearAndRender(template);

      this._header = this._container.childNodes[0];
      this._tabbar = this._container.childNodes[1];
      this._body = this._container.childNodes[2];

      this.onresize();
    }
  },
  _render_header: {
    value: function(template)
    {
      this._content_header = template;
      if (this._container)
      {
        this._header.clearAndRender(template);
        this.onresize();
      }
    }
  },
  _render_tabbar: {
    value: function(template)
    {
      this._content_tabs = template;
      if (this._container)
      {
        this._tabbar.clearAndRender(template);
        this.onresize();
      }
    }
  },
  onresize: {
    writable: true, configurable: true,
    value: function()
    {
      var content_height = this._container.offsetHeight;
      var header_height = this._header.offsetHeight;
      var tabbar_height = this._tabbar.offsetHeight;
      content_height -= header_height + tabbar_height;

      var content_width = this._container.offsetWidth - 2; //TODO get real width

      this._body.style.height = content_height + "px";
      this._body.style.width = content_width + "px";

      this._onresize();
    }
  }
});

// ----------------------------------------------------------------------------

/**
 * @extends cls.WebGLContentView
 */
cls.WebGLCallView = Object.create(cls.WebGLContentView, {
  _created: {
    writable: true,
    value: false
  },
  _last_scroll_position: {
    writable: true,
    value: null
  },
  active_tab: {
    writable: true,
    value: null
  },
  change_tab: {
    /**
     * @param {Boolean} next true if the next right tab should be changed to, else left.
     */
    value: function(next)
    {
      var tab;
      var prev_tab = null;
      var next_tab = null;
      var passed_active = false;
      for (var i = 0; i < this.tabs.length; i++)
      {
        tab = this.tabs[i];
        if (!tab.enabled) continue;
        if (this.active_tab === tab)
        {
          passed_active = true;
        }
        else if (passed_active)
        {
          next_tab = tab;
          break;
        }
        else
        {
          prev_tab = tab;
        }
      }

      tab = next ? next_tab : prev_tab;
      if (tab != null)
      {
        this.set_active_tab(tab);
        this.active_tab.set_call(this._snapshot, this._call_index, this._object);
      }
    }
  },
  active_tab_is_pinned: {
    value: function()
    {
      return this.active_tab === this.get_start_tab();
    }
  },
  set_active_tab: {
    value: function(tab, user_click)
    {
      if (this.active_tab !== tab)
      {
        if (this.active_tab !== null)
          this.active_tab.ondestroy();
        this.active_tab = tab;

        this._render_tabbar();
        tab.createView(this._body);
      }
      else if(user_click === true)
      {
        var pinned_tabs = cls.WebGLCallView.pinned_tabs;

        // When unpinning a tab, remove all pinns for other tabs that is
        // available in the current view.
        var clear_pinned_tabs = function()
        {
          for (var j = 0; j < this.tabs.length; j++)
          {
            var tab = this.tabs[j];
            for (var i = 0; i < pinned_tabs.length; i++)
            {
              var pinned = pinned_tabs[i];
              if (pinned === tab.id)
              {
                pinned_tabs.splice(i, 1);
              }
            }
          }
        }.bind(this);

        var found = false;
        for (var i = 0; i < pinned_tabs.length; i++)
        {
          var pinned = pinned_tabs[i];
          if (pinned === tab.id)
          {
            clear_pinned_tabs();
            found = true;
            break;
          }
        }

        if (!found)
        {
          pinned_tabs.unshift(tab.id);
          pinned_tabs.splice(pinned_tabs.max);
        }

        this._render_tabbar();
      }

      if (this._body)
      {
        this._body.className = this.active_tab.container_class;
      }
    }
  },
  tabs: {
    writable: true,
    value: []
  },
  set_tab_enabled: {
    value: function (tab, enabled)
    {
      if (tab.enabled === enabled) return;
      tab.enabled = enabled;

      if (!enabled && this.active_tab === tab)
      {
        for (var i = 0; i < this.tabs.length; i++)
        {
          tab = this.tabs[i];
          if (!tab.enabled) continue;
          this.set_active_tab(tab);
          return;
        }
      }
      this._render_tabbar();
    }
  },
  set_tabs: {
    value: function (tabs)
    {
      this.tabs = tabs;
      if (this.active_tab == null) this.active_tab = tabs[0];
      this._render_tabbar();
    }
  },
  _render_tabbar: {
    value: function()
    {
      var template = window.templates.webgl.tabs(this.tabs, this.active_tab, this.active_tab_is_pinned());
      cls.WebGLContentView._render_tabbar.call(this, template);
    }
  },
  _lookup_tab: {
    value: function(tab_id)
    {
      for (var i = 0; i < this.tabs.length; i++)
      {
        var tab = this.tabs[i];
        if (tab.id === tab_id)
        {
          return tab;
        }
      }
      return null;
    }
  },
  get_start_tab: {
    /**
     * Get the tab that should be shown when the view is entered.
     */
    value: function()
    {
      var pinned_tabs = cls.WebGLCallView.pinned_tabs;
      for (var i = 0; i < pinned_tabs.length; i++)
      {
        var pinned = pinned_tabs[i];
        for (var j = 0; j < this.tabs.length; j++)
        {
          var tab = this.tabs[j];
          if (pinned === tab.id && tab.enabled)
          {
            return tab;
          }
        }
      }

      // If there where no matching pinned tab, use the first tab.
      return this.tabs[0];
    }
  },
  show_tab: {
    value: function(tab_name, user_click)
    {
      var tab = this._lookup_tab(tab_name);
      if (!tab || !tab.enabled) return;

      this.set_active_tab(tab, user_click);

      tab.set_call(this._snapshot, this._call_index, this._object);
    }
  },
  _createView: {
    value: function(header, body)
    {
      this._created = true;
      this._header = header;
      this._body = body;
      if (this.active_tab !== null)
        this.active_tab.createView(this._body);

      cls.WebGLCallView.active_view = this;

      if (this._snapshot != null && this._call_index != null)
        this.display_call(this._snapshot, this._call_index, this._object);
    }
  },
  ondestroy: {
    value: function()
    {
      cls.WebGLContentView.ondestroy.apply(this, arguments);
      this._created = false;
      this._header = null;
      this._body = null;

      if (this.active_tab !== null)
        this.active_tab.ondestroy();
    }
  },
  _call: {
    writable: true,
    value: null
  },
  _call_index: {
    writable: true,
    value: null
  },
  _snapshot: {
    writable: true,
    value: null
  },
  display_call: {
    writable: true,
    configurable: true,
    value: function(snapshot, call_index, object)
    {
      this._snapshot = snapshot ? snapshot : this._snapshot;
      this._object = object;
      this._call_index = object ? object.call_index : call_index;
      this._call = call_index === -1 ? null : snapshot.trace[call_index];

      this.set_tab_enabled(this._lookup_tab("state"), call_index !== -1);

      if (!this._container)
      {
        window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab(this.id);
      }

      this.set_active_tab(this.get_start_tab());

      this.active_tab.set_call(snapshot, this._call_index, object);

      this.render_header();
    }
  },
  get_object_text: {
    value: function()
    {
      var object;
      if (this._object)
      {
        object = this._object;
      }
      else
      {
        var linked_object = this._snapshot.trace[this._call_index].linked_object;
        if (linked_object == null) return null;

        var object_keys = ["buffer", "texture", "framebuffer", "program"];
        for (var i = 0; i < object_keys.length; i++)
        {
          var key = object_keys[i];
          if (linked_object.hasOwnProperty(key))
          {
            object = linked_object[key];
            break;
          }
        }
      }

      if (object == null) return null;

      return object.toStringLong ? object.toStringLong() : String(object);
    }
  },
  render_header: {
    value: function()
    {
      var object = this.get_object_text();
      var head = this._call_index === -1 ?
        window.templates.webgl.start_of_frame_header(object) :
        window.templates.webgl.call_header(this._call_index, this._call, object);

      this._render_header(head);
    }
  },
  _onresize: {
    value: function()
    {
      if (this._created && this.active_tab && this.active_tab._container && this.active_tab.onresize)
        this.active_tab.onresize();
    }
  }
});

// Add listeners and methods for call view events, also sets start view when
// starting dragonfly
cls.WebGLCallView.initialize = function()
{
  // Stores ids of tabs that are currently pinned in the order they where pinned in.
  cls.WebGLCallView.pinned_tabs = [];
  // Limit the amount of tabs that can be pinned.
  cls.WebGLCallView.pinned_tabs.max = 5;

  var on_goto_script_click = function(evt, target)
  {
    var line = parseInt(target.getAttribute("data-line"));
    var script_id = parseInt(target.getAttribute("data-script-id"));

    var sourceview = window.views.js_source;
    window.runtimes.setSelectedScript(script_id);
    UI.get_instance().show_view("js_mode");
    if (sourceview)
    {
      sourceview.show_and_flash_line(script_id, line);
    }
  };

  var on_speclink_click = function(evt, target)
  {
    var url = target.getAttribute("specification_url");
    window.open(url);
  };

  var tab_handler = function(evt, target)
  {
    evt.preventDefault();
    var tab_id = target.id;
    cls.WebGLCallView.active_view.show_tab(tab_id, true);
  };

  var on_tab_scroll = function(evt, target)
  {
    cls.WebGLCallView.active_view.change_tab(evt.detail > 0);
  };

  var on_framebuffer_select = function(event, target)
  {
    this.active_view.active_tab._framebuffer = target[target.selectedIndex].framebuffer;
    this.active_view.active_tab.render();
  };

  var on_state_parameter_click = function(event, target)
  {
    target.argument.action();
  };

  var on_framebuffer_data = function(message)
  {
    this.active_view.active_tab.render();
  };

  var on_new_snapshot = function(context_id)
  {
    // If the webgl tab is currently active then try to show the last draw call
    // else show the start view
    if (window.topCell.tab.activeTab === "webgl_mode")
    {
      var snapshot = window.webgl.snapshots[context_id].get_latest_snapshot();
      var draw_call = snapshot.drawcalls[snapshot.drawcalls.length - 1];

      if (draw_call)
      {
        window.views["webgl_draw_call"].display_call(snapshot, draw_call.call_index);
      }
      else
      {
        window.views.webgl_mode.cell.children[0].children[0].tab.setActiveTab("webgl_start");
      }
    }
    else
    {
      window.views.webgl_mode.cell.children[0].children[0].tab.activeTab = "webgl_start";
    }
  };

  var on_take_snapshot = function()
  {
    var ctx_id = window['cst-selects']['snapshot-select'].get_selected_context();
    if (ctx_id != null)
    {
      window.webgl.request_snapshot(ctx_id);
    }
  };

  var lookup_attrib = function(elem, key)
  {
    var attr = elem.getAttribute(key);
    while (!attr && (elem = elem.parentNode))
    {
      attr = elem.nodeType === 1 ? elem.getAttribute(key) : null;
    }
    return attr;
  };

  var on_summary_view_goto_tab = function(event, target)
  {
    this.active_view.show_tab(lookup_attrib(target, "data-tab"));
  };

  var on_summary_view_function = function(event, target)
  {
    target["data-function"](event, target);
  };

  //TODO Many improvments possible, for example run the timeout on the
  // debuggee, add multiple frames snapshot, etc.
  var on_take_custom_snapshot = function()
  {
    var ctx_id =
      window['cst-selects']['snapshot-select'].get_selected_context();
    if (ctx_id === null) return;

    var delay = window.settings['webgl-snapshot'].get('snapshot_delay')*1000;
    var count = window.settings['webgl-snapshot'].get('snapshot_delay')-1;

    if (count < 0)
    {
      count = 0;
    }
    var snapshot_timer;

    var render_func = function()
    {
      if (count > 0)
      {
        messages.post('webgl-snapshot-delay', { delay: count--});
      }
      else
      {
        clearInterval(snapshot_timer);
      }
    }.bind(this);

    snapshot_timer = setInterval(render_func, 1000);

    messages.post('webgl-snapshot-delay', { delay: count+1});
    setTimeout(on_take_snapshot, delay);
  };

  var eh = window.eventHandlers;
  eh.click["webgl-take-snapshot"] = on_take_snapshot.bind(this);
  eh.click["webgl-take-custom-snapshot"] = on_take_custom_snapshot.bind(this);
  eh.click["webgl-speclink-click"] = on_speclink_click;
  eh.click["webgl-drawcall-goto-script"] = on_goto_script_click;
  eh.mousedown["webgl-tab"] = tab_handler.bind(this);
  eh.change["webgl-select-framebuffer"] = on_framebuffer_select.bind(this);
  eh.click["webgl-state-argument"] = on_state_parameter_click.bind(this);
  eh.mousewheel["webgl-tab"] = on_tab_scroll.bind(this);
  eh.click["webgl-summary-view-goto-tab"] = on_summary_view_goto_tab.bind(this);
  eh.click["webgl-summary-view-function"] = on_summary_view_function.bind(this);

  messages.addListener("webgl-fbo-data", on_framebuffer_data.bind(this));
  messages.addListener("webgl-new-snapshot", on_new_snapshot.bind(this));

  var uniform_tooltip = Tooltips.register("webgl-uniform-tooltip");
  uniform_tooltip.ontooltip = function (event, target)
  {
    var uniform = target["data-uniform"];
    var call_index = target["data-call-index"];

    var value = uniform.values[0].value;
    var last_index = 0;
    var values = uniform.values;
    // We want the values related to this._call_index
    for (var i=1; i<values.length && values[i].call_index <= call_index; i++)
    {
      last_index = i;
      value = values[i].value;
    }
    var html = window.templates.webgl.uniform_tooltip(value);
    this.show(html, false);
  }.bind(uniform_tooltip);

  var layout_tooltip = Tooltips.register("webgl-layout-tooltip");
  layout_tooltip.ontooltip = function (event, target)
  {
    var layout = target["data-layout"];

    var html = window.templates.webgl.layout_tooltip(layout);
    this.show(html, false);
  }.bind(layout_tooltip);
};

// ----------------------------------------------------------------------------

/**
 * @extends ViewBase
 */
cls.WebGLTab = Object.create(ViewBase, {
  _container: {
    writable: true,
    value: null
  },
  _last_scroll_position: {
    writable: true,
    value: null
  },
  enabled: {
    writable: true,
    value: true
  },
  createView: {
    writable: true, configurable: true,
    value: function(container)
    {
      this._container = container;
    }
  },
  _rendered: {
    writable: true,
    value: false
  },
  ondestroy: {
    writable: true, configurable: true,
    value: function()
    {
      if (this._rendered)
      {
        this._last_scroll_position = {
          top: this._container.scrollTop,
          left: this._container.scrollLeft
        };
      }

      this._rendered = false;
      this._container = null;
    }
  },
  _snapshot: {
    writable: true,
    value: null
  },
  _call_index: {
    writable: true,
    value: null
  },
  clear: {
    writable: true,
    value: function ()
    {
      this._last_scroll_position = null;
      this._snapshot = null;
      this._call_index = null;
    }
  },
  set_call: {
    writable: true, configurable: true,
    value: function(snapshot, call_index)
    {
      var same_call = this._snapshot === snapshot && this._call_index === call_index;

      this._snapshot = snapshot;
      this._call_index = call_index;
      if (this._container != null)
      {
        this.render();
        this._rendered = true;

        var set_scroll = same_call && this._last_scroll_position != null;
        this._container.scrollTop = set_scroll ? this._last_scroll_position.top : 0;
        this._container.scrollLeft = set_scroll ? this._last_scroll_position.left : 0;
      }
    }
  },
  init: {
    writable: true,
    value: function()
    {
      ViewBase.init.apply(this, arguments);
      messages.addListener("webgl-clear", this.clear.bind(this));
    }
  }
});

// ----------------------------------------------------------------------------

/**
 * @extends cls.WebGLTab
 */
cls.WebGLSummaryTab = Object.create(cls.WebGLTab, {
  _call: {
    writable: true,
    value: null
  },
  _primary_clearer: {
    writable: true,
    value: false
  },
  _secondary_clearer: {
    writable: true,
    value: false
  },
  _framebuffer: {
    writable: true,
    value: null
  },
  ondestroy: {
    writable: true, configurable: true,
    value: function()
    {
      cls.WebGLTab.ondestroy.call(this);
      this._call = null;
      this._framebuffer = null;
    }
  },
  getStateView: {
    value: function()
    {
      var state_parameters = this._snapshot.state.get_function_parameters(
        this._call.function_name, this._call_index, true);
      var state_content = window.templates.webgl.state_parameters(state_parameters);

      return {
        title: "State parameters",
        content: state_content,
        onclick: {
          tab: "state",
          header_only: true
        }
      };
    }
  },
  getErrorView: {
    value: function()
    {
      var error_code = window.webgl.api.constant_value_to_string(this._call.error_code);
      var func_errors = window.webgl.api.functions[this._call.function_name].errors;
      var content = [];
      var classes = ["error-item"];
      if (func_errors && error_code in func_errors)
      {
        var solutions = func_errors[error_code];
        content = window.templates.webgl.error_message(solutions);
      }
      else
      {
        classes.push("no-description");
      }

      return {
        title: "Error: " + error_code,
        content: content,
        class: classes.join(" ")
      };
    }
  },
  getFrameBufferView: {
    value: function()
    {
      if (!this._snapshot.settings['fbo-readpixels'] ||
          this._call_index === -1) return null;
      var framebuffers = this._snapshot.framebuffers.lookup_all(this._call_index);

      // Make sure the fbo image is downloading if isn't
      for(var f in framebuffers)
      {
        var framebuffer = framebuffers[f];
        if (!framebuffer.is_loaded())
        {
          framebuffer.request_data();
        }
      }

      var framebuffer_binding;
      if (this._framebuffer)
      {
        framebuffer_binding = this._framebuffer;
      }
      else
      {
        framebuffer_binding = this._snapshot.state.get_parameter("FRAMEBUFFER_BINDING", this._call_index);
        // Framebuffer === null => default framebuffer (framebuffers[0])
        framebuffer_binding = framebuffer_binding ? framebuffer_binding.framebuffer : framebuffers[0];
      }

      var content = window.templates.webgl.framebuffer_summary(framebuffers, framebuffer_binding);

      return {
        title: "Framebuffer",
        content: content,
        class: "framebuffer fit",
        onclick: {
          func: function()
          {
            var draw_call = this._snapshot.drawcalls.get_by_call(this._call_index);
            if (!draw_call) return;
            // TODO prevent the draw call view to render the first tab first and then the frmebuffer tab
            window.views["webgl_draw_call"].display_call(this._snapshot, draw_call.call_index);
            window.views["webgl_draw_call"].show_tab("framebuffer");
          }.bind(this),
          header_only: true
        }
      };
    }
  },
  getPrimaryViews: {
    writable: true,
    value: function()
    {
      var primary = [];
      if (this._call && this._call.have_error) primary.push(this.getErrorView());
      if (this._call) primary.push(this.getStateView());
      primary.push(this.getFrameBufferView());
      return primary;
    }
  },
  getAdditionalPrimaryViews: {
    writable: true,
    value: function()
    {
      return [];
    }
  },
  getSecondaryViews: {
    writable: true,
    value: function()
    {
      return [];
    }
  },
  set_call: {
    writable: true,
    value: function(snapshot, call_index, object)
    {
      this._call = call_index === -1 ? null : snapshot.trace[call_index];
      this._object = object;
      this._draw_call = call_index === -1 ? null :
        snapshot.drawcalls.get_by_call(call_index);
      cls.WebGLTab.set_call.apply(this, arguments);
    }
  },
  render: {
    value: function()
    {
      var primary = this.getPrimaryViews().concat(this.getAdditionalPrimaryViews());
      var secondary = this.getSecondaryViews();
      var template = window.templates.webgl.summary(primary, secondary);
      this._container.clearAndRender(template);

      this.renderAfter();
    }
  },
  renderAfter: {
    writable: true,
    value: function()
    {
      this.layout(true);
    }
  },
  layout: {
    value: function(after_render, second_pass)
    {
      after_render = after_render === true;
      second_pass = second_pass === true;
      if (after_render)
      {
        this._primary_clearer = false;
        this._secondary_clearer = false;
      }

      var MAX_CHILD_HEIGHT = 300;

      var MIN_CHILD_WIDTH = 300;
      var MIN_CHILD_IMAGE_WIDTH = 200;
      var MAX_CHILD_WIDTH = 500;

      var primary = this._container.querySelector(".primary-summary");
      var secondary = this._container.querySelector(".secondary-summary");
      if (!primary) return;
      var primary_childs = primary.querySelectorAll(".summary-item");
      var secondary_childs = secondary ? primary.querySelectorAll(".summary-item") : [];
      var childs = this._container.querySelectorAll(".summary-item");
      var clear, clear_elem;

      var container_offset_width = this._container.childNodes[0].offsetWidth;
      var container_width = container_offset_width -
        parseInt(this._container.childNodes[0].currentStyle.paddingLeft, 10) -
        parseInt(this._container.childNodes[0].currentStyle.paddingRight, 10);

      // Assume the same margin on all children
      var child_margin = parseInt(childs[0].currentStyle.marginLeft, 10) +
        parseInt(childs[0].currentStyle.marginRight, 10);
      if (isNaN(child_margin)) child_margin = 0;

      // Get the total width of all children and save the original dimensions if
      // this call is directly after a render
      var total_child_width = 0;
      var max_child_width = 0;
      for (var i = 0; i < childs.length; i++)
      {
        if (after_render)
        {
          childs[i].originalWidth = childs[i].offsetWidth;
          childs[i].originalHeight = childs[i].offsetHeight;
        }
        var child_width = childs[i].originalWidth + child_margin;
        total_child_width += child_width;
        if (max_child_width < child_width && !childs[i].hasClass("fit"))
          max_child_width = child_width;
      }

      // Calculate how many columns to use and their width
      if (max_child_width < MIN_CHILD_WIDTH + child_margin)
        max_child_width = MIN_CHILD_WIDTH + child_margin;
      var max_columns = Math.floor(container_width / max_child_width);
      var column_width = max_columns === 1 ? container_width :
        Math.floor(container_width / max_columns);
      column_width -= child_margin;
      if (column_width > container_width) column_width = container_width - child_margin;
      if (column_width > MAX_CHILD_WIDTH) column_width = MAX_CHILD_WIDTH;

      // Set the width on all children
      for (var j = 0; j < childs.length; j++)
      {
        childs[j].style.width = String(column_width) + "px";
      }

      // Arrange the primary items in an order where minimum height is used
      var remove_primary_clearer = true;
      if (total_child_width >= container_width && max_columns <= 2)
      {
        var primary_childs_fit = primary.querySelectorAll(".summary-item.fit");
        if (primary_childs_fit.length >= 2)
        {
          var len = primary_childs.length;
          var height_one = primary_childs_fit[0].originalHeight;
          var height_two = primary_childs_fit[1].originalHeight;
          var height_before = 0;
          for (var k = 0; k < primary_childs.length; k++) {
            var child = primary_childs[k];
            if (child.hasClass("fit")) break;
            height_before += child.originalHeight;
          }

          if (height_one + height_two >= height_before + Math.max(height_one, height_two))
          {
            var width = max_columns === 1 ?
              Math.floor(container_width / 2) - child_margin : column_width;
            if (width < MIN_CHILD_IMAGE_WIDTH)
              width = Math.max(MIN_CHILD_IMAGE_WIDTH, column_width);

            primary_childs_fit[0].style.width = String(width) + "px";
            primary_childs_fit[1].style.width = String(width) + "px";

            if (!this._primary_clearer)
            {
              primary_childs_fit[0].className += " clear";
              this._primary_clearer = true;
            }
            remove_primary_clearer = false;
          }
        }
      }

      if (this._primary_clearer && remove_primary_clearer)
      {
        clear_elem = primary.querySelector(".primary-summary .summary-item.clear");
        clear_elem.className = clear_elem.className.replace(" clear", "");
        this._primary_clearer = false;
      }

      if (primary_childs.length >= max_columns && secondary_childs.length > 0)
      {
        if (!this._secondary_clearer)
        {
          secondary.firstChild.className += " clear";
          this._secondary_clearer = true;
        }
      }
      else if (this._secondary_clearer)
      {
        clear_elem = secondary.firstChild;
        clear_elem.className = clear_elem.className.replace(" clear", "");
        this._secondary_clearer = false;
      }

      // Fix the size of loading boxes
      var loadings = this._container.querySelectorAll(".summary-item .loading-image");
      if (loadings)
      {
        for (var i = 0; i < loadings.length; i++)
        {
          var loading = loadings[i];
          var elem = loading;
          while (!elem.hasClass("summary-item"))
            elem = elem.parentNode;

          var old_width = parseInt(loading.style.width);
          var old_height = parseInt(loading.style.height);
          var image_ratio = old_width / old_height;

          var elem_width = parseInt(elem.style.width);
          var elem_ratio = elem_width / MAX_CHILD_HEIGHT;

          var height, width;
          if (old_height > MAX_CHILD_HEIGHT && elem_ratio > image_ratio)
          {
            height = MAX_CHILD_HEIGHT;
            width = MAX_CHILD_HEIGHT * image_ratio;
          }
          else
          {
            height = elem_width / image_ratio;
            width = elem_width;
          }

          loading.style.height = height + "px";
          loading.style.width = width + "px";
        }
      }

      // If the "container" does not have a scrollbar before the calculation
      // but afterwards then make a second pass
      if (container_offset_width !== this._container.childNodes[0].offsetWidth && !second_pass)
        this.layout(false, true);

      if (this.layoutAfter) this.layoutAfter();
    }
  },
  onresize: {
    value: function()
    {
      this.layout();
    }
  }
});

// ----------------------------------------------------------------------------

cls.WebGLHistoryTab = Object.create(cls.WebGLTab, {
  _history: {
    writable: true, configurable: true,
    value: null
  },
  render: {
    value: function ()
    {
      var content = window.templates.webgl.history(this._history);
      this._container.clearAndRender(content);
    }
  }
});

// ----------------------------------------------------------------------------

cls.WebGLStateTab = function (id, name, container_class)
{
  this.render = function ()
  {
    var parameters = this._snapshot.state.get_all_parameters(this._call_index, true);
    var data = [];

    for (var key in parameters)
    {
      if (!parameters.hasOwnProperty(key)) continue;
      var param = parameters[key];
      data.push({
        parameter: String(key),
        value: window.templates.webgl.state_parameter(key, param)
      });
    }

    var table = cls.WebGLStateTab._state_table;
    table.set_data(data);
    this._container.clearAndRender(table.render());
  };

  this.init(id, name, container_class);
};

cls.WebGLStateTab.prototype = cls.WebGLTab;


cls.WebGLStateTab.initialize = function ()
{
  var tabledef = {
    handler: "webgl-state-table",
    column_order: ["parameter", "value"],
    columns: {
      parameter: {
        label: "Parameter"
      },
      value: {
        label: "Value"
      }
    }
  };

  this._state_table = new SortableTable(tabledef, null, ["parameter", "value"], null, null, false, "state-table");
};
