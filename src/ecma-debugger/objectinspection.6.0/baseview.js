﻿window.cls || (window.cls = {});
cls.EcmascriptDebugger || (cls.EcmascriptDebugger = {});
cls.EcmascriptDebugger["6.0"] || (cls.EcmascriptDebugger["6.0"] = {});

/**
  * @constructor 
  * @extends ViewBase
  */

cls.EcmascriptDebugger["6.0"].InspectionBaseView = function()
{

  this.createView = function(container)
  {
    var data_model = this._data || window.inspections[this._cur_data];
    if (data_model)
      data_model.expand(this._create_view.bind(this, container, data_model));
    else
      container.innerHTML = '';
  };

  this._on_setting_change = function(msg)
  {
    if (msg.id == 'inspection')
      switch (msg.key)
      {
        case 'show-default-nulls-and-empty-strings':
          this.update();
          break;
      }
  };

  this._create_view = function(container, data_model)
  {
    container.clearAndRender(window.templates.inspected_js_object(data_model, false));
  };

}

cls.EcmascriptDebugger["6.0"].InspectionBaseView.prototype = ViewBase;