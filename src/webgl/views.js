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
    if (!this.disabled)
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
   * Returns false if there is no context selected.
   */
  this.get_selected_context = function()
  {
    if (window.webgl.available())
      return window.webgl.contexts[this._selected_option_index];
    return false;
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

