"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

cls.WebGLTestView = function(id, name, container_class)
{
  this._container = null;
	this._test_done = false;

  this.createView = function(container)
  {
    this._container = container;
		this._test_done = false;

    if (window.webgl.available())
    {
      window.webgl.request_test();
		}

    this._render();
  };

  this.ondestroy = function() 
  {
    // TODO remove listeners

  };

  this.clear = function ()
  {
    if (window.webgl.available())
    {
      window.webgl.request_test(this._context);
    }

    this._render();
  };

  this._render = function()
  {
    if (!this._container)
    {
      return;
    }

    if (window.webgl.available() && this._test_done )
 		{
			// Results already printed in _on_new_test
    }
		else if (window.webgl.available())
		{
			this._container.clearAndRender(
				['div',
					['p', "Running test ..."],
					'class', 'info-box'
				]
			);
		}
    else
    {
      this._container.clearAndRender(
        ['div',
         ['p', "No WebGLContext present..."],
         'class', 'info-box'
        ]
      );
    }
  };

  this._on_new_test = function(msg)
  {
		this._test_time = window.webgl.data.get_test_data();
		this._data_length = msg["test-length"];
		this._container.clearAndRender(
			['div',
				['p', "Test done"],
				['p', "Execution time: " + (this._test_time/1000)
					+ " seconds."			
				],
				['p', "Size of payload: " + this._data_length ],
				// Assuming a string, every character 16bit long. 
				// Last division by 1000000 for Mbit/s
				['p', "Estimated speed: " + 
					Math.round((16*this._data_length) / (this._test_time/1000) / 1000000) 
					+ " Mbit/s"],	
			'class', 'info-box'
			]
		);
		this._test_done = true;
		this._render();
  };

  this._on_refresh = function()
  {
		this._test_done = false;
    window.webgl.request_test(this._context);
		this._render();
  };

  this._on_context_change = function(ctx)
  {
		this._test_done = false;
    this._render();
  };


  var eh = window.eventHandlers;

  eh.click["refresh-webgl-test"] = this._on_refresh.bind(this);

  messages.addListener('webgl-new-test', this._on_new_test.bind(this));
  messages.addListener('webgl-clear', this.clear.bind(this));
  messages.addListener('webgl-context-selected', this._on_context_change.bind(this));

  this.init(id, name, container_class);
}

cls.WebGLTestView.prototype = ViewBase;


cls.WebGLTestView.create_ui_widgets = function()
{
  new ToolbarConfig(
    'webgl_test',
    [
      {
        handler: 'refresh-webgl-test',
        title: "Refresh the test", // TODO
        icon: 'reload-webgl-test'
      }
    ],
    null,
    null,
    [
      {
        handler: 'select-webgl-context',
        title: "Select WebGL context", // TODO
        type: 'dropdown',
        class: 'context-select-dropdown',
        template: window['cst-selects']['context-select'].getTemplate()
      }
    ]
  );
};

