"use strict";

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends ViewBase
 */
cls.WebGLTraceView = function(id, name, container_class)
{
  this._state = null;

  this.createView = function(container)
  {
    // TODO temporary
    window.services["ecmascript-debugger"].onConsoleLog = function (status, message)
    {
      alert(message);
    };
  };

  this.ondestroy = function() 
  {
    window.services["ecmascript-debugger"].onConsoleLog = function (status, message) {};
  };

  this.init(id, name, container_class);
};

cls.WebGLTraceView.prototype = ViewBase;



cls.WebGLStateView = function(id, name, container_class)
{
  this._state = null;
  this._sortable_table;
  this._container = null;

  this.createView = function(container)
  {
    this._container = container;
    this._state = new cls.WebGLState();
    this._table = this._table || 
                           new SortableTable(this._state.tabledef, null, null, null, null, false, "state-table");


    messages.addListener('webgl-new-state', this._on_new_state.bind(this));

    // TODO temporary
    this._state.get_state();
    // Determine if execution is paused
    //   > if not, smart stuff
    // Get state

  };

  this.ondestroy = function() 
  {

  };

  this._on_new_state = function(obj_id)
  {
    var tbl_data = [];
    var state = this._state.state[obj_id];
    for (var pname in state)
    {
      tbl_data.push({"variable" : pname, "value" : state[pname]});
    }
    this._table.set_data(tbl_data);
    this._container.clearAndRender(this._table.render());

  };

  this.init(id, name, container_class);
}

cls.WebGLStateView.prototype = ViewBase;



cls.WebGLStateView.create_ui_widgets = function()
{

}

