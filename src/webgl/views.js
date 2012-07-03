"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLContextSelect = function(id)
{
  this._option_list = [{}];
  this.disabled = true;
  this._selected_option_index = 0;

  this.getSelectedOptionText = function()
  {
    if (!this.disabled && this._option_list.length > 0)
    {
      return "WebGLContext #" + this._selected_option_index;
    }
    else 
    {
      return "No WebGLContext available...";
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
    if (window.webgl.available())
      return window.webgl.contexts[this._selected_option_index];
    return null;
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
        "WebGLContext #" + i,
        "opt-index", i,
        "title", opt.title || "",
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
      messages.post('webgl-context-selected', window.webgl.contexts[index]);
      return true;
    }
    return false;
  }

  this._new_context = function(contexts)
  {
    this.disabled = !window.webgl.available();
    this._option_list = window.webgl.contexts;
  };


  messages.addListener('webgl-new-context', this._new_context.bind(this));

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
        "title", opt.title || "",
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


