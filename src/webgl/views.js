"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLContextSelect = function(id)
{
  this._snapshot_list = [{}];
  this.disabled = true;
  this._selected_snapshot_index = 0;
  this._selected_context_id;

  this.getSelectedOptionText = function()
  {
    if (!this.disabled && this._snapshot_list.length > 0)
    {
      return "WebGLSnapshot #" + this._selected_snapshot_index;
    }
    else 
    {
      return "No WebGLContext available...";
    }
  };

  this.getSelectedOptionValue = function()
  {

  };

  /** To become obsolete!
   * Returns the id of the context that is currently selected.
   * Returns null if there is no context selected.
   */
  this.get_selected_context = function()
  {
    // TODO get correct context
    if (window.webgl.available())
    {
      if (this._selected_context_id === undefined)
      {
        this._selected_context_id = window.webgl.contexts[0]; 
      }
      return this._selected_context_id;
    }
    return null;
  };

  /**
   * Return the snapshot that is currently selected.
   *  
   */
  this.get_selected_snapshot = function()
  {
    if (window.webgl.available())
    {
      var ret = {contex_id: this._selected_context_id, 
                 snapshot_index: this._selected_snapshot_index}
      return
        window.webgl.snapshots[this._selected_context_id][this._selected_snapshot_index];
    }
    return null
 }; 

  this.getTemplate = function()
  {
    var select = this;
    return function(view)
    {
      return window.templates['cst-select'](select, select.disabled);
    };
  };

  this.templateOptionList = function(select_obj)
  {
    var ret = [];
    var snapshots = select_obj._snapshot_list;
    var opt = null; 
    var i;
    var j;
    var entries=0;

    // Iterating the contexts.
    for(i=0; i<window.webgl.contexts.length; i++)
    {
      ret[entries] = 
        ["cst-title",
         "WebGLContext #" + i,
         "class", "js-dd-dir-path"
        ];
      entries++;
      // Iterating the snapshots in that context.
      for(j=0; opt = snapshots[window.webgl.contexts[i]][j]; j++)
      {
        ret[entries] = 
        [
          "cst-option",
          "Snapshot #" + j,
          "snapshot-index", j,
          "context-index", i,
          "context-id", window.webgl.contexts[i],
          "unselectable", "on"
        ];
        entries++;
      }
      // TODO add handler
      // Adding a take snapshot entry
      ret[entries] =
      [
        "cst-option",
        "Take snapshot",
        "context-id", window.webgl.contexts[i],
        "take-snapshot", true 
      ]
      entries++;
    }

    return ret;
  };

  this.checkChange = function(target_ele)
  {
    // TODO The context should also be highlighted on the debuggee
    var context_id = target_ele['context-id'];
    var snapshot_index = target_ele['snapshot-index'];
    var take_snapshot = target_ele['take-snapshot'];    
    this._selected_contex_id = context_id;
    
    if (take_snapshot !== undefined)
    {
      messages.post('webgl-take-snapshot', context_id);
      return false;
    }
    else if (this._selected_option_index != snapshot_index)
    {
      this._selected_option_index = snapshot_index;
      messages.post('webgl-changed-snapshot',
          window.webgl.snapshots[context_id][snapshot_index]);
      return true;
    }
    return false;
  };

  this._on_new_snapshot = function()
  {
    this.disabled = !window.webgl.available();
    this._snapshot_list = window.webgl.snapshots;
  };
  
  this._on_take_snapshot = function(context_id)
  {
    this.snapshots[context_id].send_snapshot_request();
    console.log("take snapshot");
  };

  messages.addListener('webgl-new-trace', this._on_new_snapshot.bind(this));
  messages.addListener('webgl-take-snapshot', this._on_take_snapshot.bind(this));

  this.init(id);
};

cls.WebGLContextSelect.prototype = new CstSelect();


cls.WebGLTraceSelect = function(id)
{
  this._option_list = [{}];
  this.disabled = true;
  this._selected_option_index = 0;

  this.getSelectedOptionText = function()
  {
    if (!this.disabled && this._option_list.length > 0)
    {
      return "Trace #" + this._selected_option_index;
    }
    else 
    {
      return "No trace available...";
    }
  };

  this.getSelectedOptionValue = function()
  {

  };

  /**
   * Returns the id of the trace that is currently selected.
   * Returns null if there is no trace selected.
   */
  this.get_selected_trace_idx = function()
  {

  };

  this.getTemplate = function()
  {
    var select = this;
    return function(view)
    {
      return window.templates['cst-select'](select, select.disabled);
    };
  };

  this.templateOptionList = function(select_obj)
  {
    var 
    ret = [],
    opt_list = select_obj._option_list,
    opt = null, 
    i = 0;

    for( ; opt = opt_list[i]; i++)
    {
      ret[i] = 
      [
        "cst-option",
        "Trace #" + i,
        "opt-index", i,
        "unselectable", "on"
      ];
    }
    return ret;
  };

  this.checkChange = function(target_ele)
  {
    var index = target_ele['opt-index'];
    if (index == undefined) return false;

    if (this._selected_option_index != index)
    {
      this._selected_option_index = index;
      messages.post('webgl-trace-selected', index);
      return true;
    }
    return false;
  }

  var on_new_trace = function(trace_idx)
  {
    this.disabled = false; 
    this._option_list = this._option_list.push(trace_idx);
  };

  messages.addListener('webgl-new-trace', on_new_trace.bind(this));

  this.init(id);
};

cls.WebGLTraceSelect.prototype = new CstSelect();


