"use strict";

window.templates = window.templates || {};
window.templates.webgl = window.templates.webgl || {};


window.templates.webgl.reload_info = function()
{
  return [
    "div",
    [
      "span", "Initialize WebGL Debugger",
      "class", "ui-button reload-window",
      "handler", "reload-window",
      "tabindex", "1"
    ],
    "class", "info-box"
  ];
};

window.templates.webgl.no_contexts = function()
{
  return [
    "div",
    [
      "span", "No WebGL contexts have been found.",
    ],
    "class", "info-box"
  ];
};

window.templates.webgl.buffer_base = function(buffer, buffer_settings, coordinates, selected_item, start_row)
{
  var data_table;
  if (buffer.data_is_loaded())
  {
    data_table = window.templates.webgl.buffer_data_table(buffer, coordinates, start_row);
  }
  else
  {
    data_table = ["div", "Loading buffer data."];
  }

  var buffer_info = [
    {name: "Target", value: buffer.target_string()},
    {name: "Usage", value: buffer.usage_string()},
    {name: "Size", value: String(buffer.size)},
    {name: "Length", value: String(buffer.data.length)}
  ];
  var info_table_rows = buffer_info.map(function(info){
    return [
      "tr",
      [
        [
          "th",
          info.name
        ],
        [
          "td",
          info.value
        ]
      ]
    ];
  });

  var buffer_options = [
          ["option", "(x)", "value", "x"],
          ["option", "(x,y,z)", "value", "x,y,z"],
          ["option", "(u,v)", "value", "u,v"],
          ["option", "(x,y,z,u,v)", "value", "x,y,z,u,v"],
          ["option", "Custom", "value", "custom"],
      ];

  if (typeof(selected_item) === "number")
  {
    buffer_options[selected_item].push("selected", "selected");
  };

  var coordinate_selector = ["div",
      ["select",
      buffer_options,
      "handler", "webgl-select-layout",
      "id", "webgl-layout-selector"
      ],
    ];

  var history = window.templates.webgl.history(buffer);
  var preview = buffer_settings && window.webgl.gl ? window.templates.webgl.buffer_preview(buffer_settings) : "";

  var row_inputbox = ["div",
    ["input", "type", "text", "handler",
      "webgl-input-row", "id", "webgl-row-input",
      "maxlength", "30",
      "value", "Start at row.."]
  ];

  var layout_inputbox = ["div",
      ["input", "type", "text", "handler",
          "webgl-input-layout", "id", "webgl-layout-input",
          "hidden", "true", "maxlength", "30",
          "value", "E.g. \"a,b,c,d\""
      ],
    ];

  return [
    "div",
    [
      [
        "div",
        [
          [
            "h2",
            buffer.toString()
          ],
          [
            "table",
            info_table_rows,
            "class",
            "table-info"
          ],
        ]
      ],
      history,
      preview,
      row_inputbox,
      coordinate_selector,
      layout_inputbox,
      data_table
    ]
  ];
};

window.templates.webgl.buffer_data_table = function(buffer, coordinates, start_row)
{
  var coordinate_list = coordinates || "x";
      coordinate_list = coordinate_list.split(",");
  var columns = coordinate_list.length || 1;
  var data_table_rows = [];
  var number_of_rows = Math.ceil(buffer.data.length/columns);
  var max_rows = 100;
  var max_elements = max_rows * columns;
  var row_number = 0;

  if (!start_row)
  {
    start_row = 0;
  }
  start_row = parseInt(start_row);
  row_number = start_row;
  if (isNaN(start_row))
  {
    start_row = 0;
    row_number = 0;
  }
  // Iterating over rows.
  for (var i = start_row; i < Math.min(number_of_rows, (start_row + max_rows)); i++)
  {
    var next_row = [];
    next_row.push(["td", String(row_number)]);
    // Iterating over columns.
    for (var j=0; j<columns; j++)
    {
      var value = buffer.data[row_number*columns+j];
      if (value !== undefined)
      {
        next_row.push(["td", String(value)]);
      }
    }
    row_number++;
    data_table_rows.push(["tr", [next_row]]);
  }

  // TODO temporary solution since Dragonfly will freeze when to many elements
  var more_data = [];
  if (buffer.data.length > row_number*columns)
  {
    var diff = buffer.data.length - row_number*columns;
    more_data = [
      "div",
      "There are " + String(diff) + " more elements."
    ];
  }

  var table_head = [["td", "Index"]];
  for (var k=0; k<columns; k++)
  {
    table_head.push(["td", coordinate_list[k]]);
  }

  var data_table_head = [
    "tr",
    [
      table_head
    ],
    "class",
    "header"
  ];

  var data_table = [
    "table",
    [
      data_table_head,
      data_table_rows
    ],
    "class",
    "sortable-table buffer-data-table"
  ];

  return [data_table, more_data];
};

/**
 * Returns a div containing a buffer preview with options for setting offset,
 * stride, element buffer and such..
 */
window.templates.webgl.buffer_preview = function (buffer_settings)
{
  var position = ['fieldset',
    ['legend', 'Position'],
    ['table',
      ['tr', ['td', 'Offset:'],
        ['td',
          ['input',
            'type', 'number',
            'handler', 'webgl-buffer-settings',
            'setting', 'offset',
            'min', '0',
            'max', '255',
            'value', String(buffer_settings.offset)
          ]
        ]
      ],
      ['tr', ['td', 'Stride:'],
        ['td',
          ['input',
            'type', 'number',
            'handler', 'webgl-buffer-settings',
            'setting', 'stride',
            'min', '0',
            'max', '255',
            'value', String(buffer_settings.stride)
          ]
        ]
      ],
      ['tr', ['td', 'Size:'],
        ['td',
          ['input',
            'type', 'number',
            'handler', 'webgl-buffer-settings',
            'setting', 'size',
            'min', '1',
            'max', '4',
            'value', String(buffer_settings.size)
          ]
        ]
      ],
      ['tr', ['td', 'Type:'],
        ['td',
          ['select',
            buffer_settings.options.types.map(function(type) {
              var option = ['option',
                window.webgl.api.constant_value_to_string(type),
                'value', String(type)
              ];

              if (type === buffer_settings.type)
              {
                option.push('selected', 'selected');
              }

              return option;
            }),
            'handler', 'webgl-buffer-settings',
            'setting', 'type',
          ]
        ]
      ],
    ]
  ];

  var parameters = ['fieldset',
    ['legend', 'Parameters'],
    ['table',
      ['tr', ['td', 'Mode:'],
        ['td',
          ['select',
            buffer_settings.options.modes.map(function(mode) {
              var option = [
                'option', window.webgl.api.draw_mode_to_sting(mode),
                'value', String(mode)
              ];

              if (mode === buffer_settings.mode)
              {
                option.push('selected', 'selected');
              }

              return option;
            }),
            'handler', 'webgl-buffer-settings',
            'setting', 'mode',
          ]
        ]
      ],
      ['tr', ['td', 'Element Array:'],
        ['td',
          ['select',
            buffer_settings.options.element_buffers.map(function(buffer) {
              var option = ['option',
                buffer ? buffer.toString() : "unindexed",
                'value', buffer,
                'buffer', buffer,
              ];

              if (buffer === buffer_settings['element-array'])
              {
                option.push('selected', 'selected');
              }

              return option;
            }),
            'handler', 'webgl-buffer-settings',
            'setting', 'element-array',
          ]
        ]
      ],
      ['tr', ['td', 'Element Type:'],
        ['td',
          ['select',
            buffer_settings.options.element_types.map(function(type) {
              var option = ['option',
                window.webgl.api.constant_value_to_string(type),
                'value', String(type)
              ];

              if (type === buffer_settings['element-type'])
              {
                option.push('selected', 'selected');
              }

              return option;
            }),
            'handler', 'webgl-buffer-settings',
            'setting', 'element-type',
          ]
        ]
      ],
      ['tr', ['td', 'Start/Count:'],
        ['td',
          ['input',
            'type', 'number',
            'handler', 'webgl-buffer-settings',
            'setting', 'start',
            'min', '0',
            'value', String(buffer_settings.start)
          ],
          "/",
          ['input',
            'type', 'number',
            'handler', 'webgl-buffer-settings',
            'setting', 'count',
            'min', '0',
            'value', String(buffer_settings.count)
          ],
        ]
      ]
    ]
  ];

  return ["div",
    window.templates.webgl.preview_canvas(),
    ["div",
      ["div", position],
      ["div", parameters],
      "class", "buffer-settings"
    ]
  ];
};

window.templates.webgl.linked_object = function(obj, handler, data_name)
{
  var html = ["span", String(obj.text)];
  if (obj.action)
  {
    html.push("handler", handler ? handler : "webgl-linked-object");
    if (window.settings["webgl-general"].map["highlight-objects"]) html.push("class", "link");
  }

  if (obj.tooltip) html.push("title", obj.tooltip);

  html.push(data_name ? data_name : "data-linked-object", obj);

  return html;
};

window.templates.webgl.history = function(history)
{
  if (history === null) return [];
  var arg_func = function(arg)
  {
    return arg.text;
  };

  var call_to_row = function(call)
  {
    var content = [["span",call.function_name]];
    content.push(["span", "("]);

    var args = window.webgl.api.function_arguments_to_objects(call.function_name, call.args);
    for (var i = 0; i < args.length; i++)
    {
      var html = window.templates.webgl.linked_object(args[i], "webgl-trace-argument");

      if (i > 0) content.push(["span", ", "]);
      content.push(html);
    }
    content.push(["span", ")"]);
    if (call.loc)
      window.templates.webgl.goto_script(call.loc, content[0]);

    return [
      "tr",
      [
        ["td", String(call.frame)],
        ["td", content]
      ]
    ];
  };

  var his_list = [];
  his_list.push([
    "tr",
    [
      ["th", "Frame"],
      ["th", "Call"]
    ],
    "class", "header"
  ]);
  if (history.create) his_list.push(call_to_row(history.create));

  if (history.number > history.length)
  {
    var num = history.number - history.length;
    his_list.push([
      "tr",
      [
        ["td"],
        ["td", num + " calls omitted."]
      ]
    ]);
  }

  var number = history.number % history.length;
  for (var i = number; i < history.length; i++)
  {
    his_list.push(call_to_row(history[i]));
  }
  for (i = 0; i < number; i++)
  {
    his_list.push(call_to_row(history[i]));
  }

  return [
    "div",
    [
      "table", his_list,
      "class", "sortable-table"
    ]
  ];
};

window.templates.webgl.trace_row = function(call, call_number, view_id)
{
  var func_text = [
    "span", call.function_name
  ];

  var content = [func_text];

  content.push(["span", "("]);

  var args = window.webgl.api.function_arguments_to_objects(call.function_name, call.args);
  for (var i = 0; i < args.length; i++)
  {
    var arg = args[i];
    var html = window.templates.webgl.linked_object(arg, "webgl-trace-argument");

    if (i > 0) content.push(["span", ", "]);
    content.push(html);
  }

  content.push(["span", ")"]);

  if (call.result)
  {
    var result_html;
    if (typeof(call.result) === "object")
    {
      result_html = window.templates.webgl.linked_object(call.result, "webgl-trace-argument");
    }
    else
    {
      result_html = ["span", String(call.result)];
    }
    content.push(" = ", result_html);
  }

  var row_class = "";
  if (call.have_error)
  {
    var error = window.webgl.api.constant_value_to_string(call.error_code);
    content.push(" » ", ["span", String(error)]);
    row_class = "trace-error";
  }
  else if (call.redundant)
  {
    row_class = "trace-redundant";
  }
  else if (call.drawcall)
  {
    row_class = "trace-drawcall";
  }

  return [
    "tr", [
      ["td", String(call_number + 1)],
      ["td", content]
      //["td", call.is_drawcall()]
    ],
    "class", row_class,
    "data-call-number", call_number,
    "handler", "webgl-trace-row"
  ];
};

window.templates.webgl.trace_table = function(calls, view_id)
{
  var content = [];
  for (var i = 0; i < calls.length; i++)
  {
    var call = calls[i];
    content.push(window.templates.webgl.trace_row(call, i, view_id));
  }

  return [
    "table", content,
    "class", "sortable-table trace-table" // TODO css
  ];
};

window.templates.webgl.framebuffer_image = function (framebuffers, binding)
{
  var select = ["select"];
  var bound_framebuffer;
  var image;
  var options = 0;

  for (var f in framebuffers)
  {
    var framebuffer = framebuffers[f];
    var option = ["option", String(framebuffer), "value", framebuffer, "framebuffer", framebuffer];

    if (framebuffer.index === binding.index)
    {
      option.push("selected", "selected");
      bound_framebuffer = framebuffer;
    }

    select.push(option);
    options++;
  }

  select.push("handler", "webgl-select-framebuffer");
  // To get it floating properly it needs to be put in a div
  select = [
    "div", select,
    "class", "select-float"
  ];

  switch (bound_framebuffer.type)
  {
    case "init":
      image = ["div", "TODO: inital framebuffer"];
      break;
    case "clear":
      var color = bound_framebuffer.image.color;
      var colors = Math.round(color[0] * 255) + ", " +
                   Math.round(color[1] * 255) + ", " +
                   Math.round(color[2] * 255) + ", " +
                   color[3];
      image = ["div",
        "style",
          "width:" + String(bound_framebuffer.image.width) +
          "px; height:" + String(bound_framebuffer.image.height) +
          "px; background: rgba(" + colors + ");",
        "class", "checkerboard"
      ];
      break;
    case "draw":
      image = window.templates.webgl.image(bound_framebuffer.image);
      image = window.templates.webgl.thumbnail_container(image);
      break;
  }

  return ["div",
    options > 1 ? select : [],
    image,
    "class", "framebuffer-thumbnail"
  ];
};

window.templates.webgl.thumbnail_container = function(image)
{
  return [
    "div",
    image,
    "class", "thumbnail"
  ];
};

window.templates.webgl.image = function(level)
{
  var image;
  if (level.img == null)
  {
    image = ["span", "No data."];
  }
  else if (level.img.data)
  {
    image = [
      "img",
      "src", level.img.data,
      "handler", "webgl-texture-image"
    ];
    var classes = ["checkerboard"];
    if (level.img.flipped)
    {
      classes.push("flipped");
    }

    image.push("class", classes.join(" "));
  }
  else
  {
    image = ["div",
      ["img", "src", "./ui-images/loading.png"],
      "class", "loading-image",
      "style", "width: " + String(level.width ? level.width : 128) + "px; height: " + String(level.height ? level.height : 128) + "px;"
    ];
  }

  return image;
};

window.templates.webgl.texture_info = function(texture)
{
  var level0 = texture.levels[0];
  var const_to_string = window.webgl.api.constant_value_to_string;
  var border_info = !level0 || !level0.border ? null : {
    name: "Border",
    value: String(level0.border)
  };
  var url = !level0 || !level0.url ? null : {
    name: "Source",
    value: level0.url
  };
  var dimensions =  !level0 || !level0.height || !level0.width ? null : {
    name: "Dimensions",
    value: level0.width + "x" + level0.height + " px",
  };

  var build_info_row = function(info)
  {
    return info == null ? [] : [
      "tr",
      [
        [
          "th",
          info.name
        ],
        [
          "td",
          info.value
        ]
      ]
    ];
  };

  var texture_info = [
    url,
    dimensions,
    {
      name: "Format",
      value: const_to_string(texture.format)
    },
    {
      name: "Internal format",
      value: const_to_string(texture.internalFormat)
    },
    {
      name: "Type",
      value: const_to_string(texture.type)
    },
    border_info,
    {
      name: "TEXTURE_WRAP_S",
      value: const_to_string(texture.texture_wrap_s)
    },
    {
      name: "TEXTURE_WRAP_T",
      value: const_to_string(texture.texture_wrap_t)
    },
    {
      name: "TEXTURE_MIN_FILTER",
      value: const_to_string(texture.texture_min_filter)
    },
    {
      name: "TEXTURE_MAG_FILTER",
      value: const_to_string(texture.texture_mag_filter)
    }
  ];

  var info_table_rows = texture_info.map(build_info_row);

  var info_table = [
    "table",
    info_table_rows,
    "class", "table-info"
  ];

  return info_table;
};

//  var level0 = texture.levels[0];
//
//  var base_image;
//  if (!level0 || level0.img == null && !texture.mipmapped)
//  {
//    base_image = ["span", "No data."];
//  }
//  else
//  {
//    base_image = window.templates.webgl.image(level0);
//  }
//

window.templates.webgl.mipmap_table = function(texture)
{
  var ret = ["div", "No mipmaps"];

  var build_info_row = function(info)
  {
    return info == null ? [] : [
      "tr",
      [
        [
          "th",
          info.name
        ],
        [
          "td",
          info.value
        ]
      ]
    ];
  };
  var mipmap_table = [];
  if (texture.mipmapped && texture.levels.length > 1)
  {
    var mipmap_levels = texture.levels.slice(1).map(function(level) {
      var image = window.templates.webgl.image(level);
      var image_source = null;
      if (level.url)
        image_source = { name: "Image source", value: level.url };

      var level_info_rows = [
        { name: "Level", value: String(level.level) },
        { name: "Source", value: level.element_type },
        image_source,
        { name: "Dimensions", value: level.height + "x" + level.width + " px" },
      ].map(build_info_row);

      var info_table = [
        "table",
        level_info_rows,
        "class", "table-info"
      ];

      return [ "tr",
        [ "th", image ],
        [ "td", info_table ]
        ];
    });

    mipmap_table = [ "div",
      [ "h3", "Custom mipmap levels" ],
      [ "table", mipmap_levels, "class", "sortable-table" ],
      "class", "mipmap-table"
    ];
    ret = mipmap_table;
  }

  return ret;
};
//
//  var const_to_string = window.webgl.api.constant_value_to_string;
//
//  var border_info = !level0 || !level0.border ? null : {
//    name: "Border",
//    value: String(level0.border)
//  };
//
//  var texture_info = [
//    {
//      name: "Format",
//      value: const_to_string(texture.format)
//    },
//    {
//      name: "Internal format",
//      value: const_to_string(texture.internalFormat)
//    },
//    {
//      name: "Type",
//      value: const_to_string(texture.type)
//    },
//    border_info,
//    {
//      name: "TEXTURE_WRAP_S",
//      value: const_to_string(texture.texture_wrap_s)
//    },
//    {
//      name: "TEXTURE_WRAP_T",
//      value: const_to_string(texture.texture_wrap_t)
//    },
//    {
//      name: "TEXTURE_MIN_FILTER",
//      value: const_to_string(texture.texture_min_filter)
//    },
//    {
//      name: "TEXTURE_MAG_FILTER",
//      value: const_to_string(texture.texture_mag_filter)
//    }
//  ];
//
//  if (level0)
//  {
//    texture_info.unshift({
//      name: "Dimensions",
//      value: level0.height + "x" + level0.width + " px"
//    });
//
//    if (level0.url)
//    {
//      texture_info.unshift({
//        name: "Image source",
//        value: level0.url
//      });
//    }
//
//    texture_info.unshift({
//      name: "Source",
//      value: level0.element_type
//    });
//  }
//
//  var info_table_rows = texture_info.map(build_info_row);
//
//  var info_table = [
//    "table",
//    info_table_rows,
//    "class", "table-info"
//  ];
//
//  var history = window.templates.webgl.history(texture);
//
//  return [ "div",
//    ["h2", texture.toString()],
//    base_image,
//    info_table,
//    mipmap_table,
//	  history
//  ];
//};

/**
 * Makes a link to the script tag to show where the call was made on, adds it to an existing tag.
 */
window.templates.webgl.goto_script = function(loc, content)
{
  var script_url = loc.short_url || loc.url;

  if (loc.script_id != null)
  {
    content.push("class", "goto-script");
    content.push("handler", "webgl-drawcall-goto-script");
    content.push("data-line", String(loc.line));
    content.push("data-script-id", String(loc.script_id));
  }
  content.push("title", "Called from " + loc.caller_name + " in " + script_url);
};

window.templates.webgl.state_parameter = function(param_name, param)
{
  var value = param.value;
  var param_content = window.templates.webgl.state_parameter_value(param_name, value);
  if (param.old_value)
  {
    var old_value = param.old_value;
    var old_param_content = window.templates.webgl.state_parameter_value(param_name, old_value);
    old_param_content.push("class", "old-value");
    param_content = [
      old_param_content,
      ["span", " » "],
      param_content
    ];
  }
  return param_content;
};

window.templates.webgl.state_parameters = function(state_parameters)
{
  var content = [];
  for (var param_name in state_parameters)
  {
    if (!state_parameters.hasOwnProperty(param_name)) continue;
    var param = state_parameters[param_name];
    var param_content = window.templates.webgl.state_parameter(param_name, param);
    content.push(["tr", [["td", param_name], ["td", param_content]]]);
  }

  return [
    "table", content,
    "class", "state-table sortable-table"
  ];
};

window.templates.webgl.state_parameter_value = function(param, value)
{
  var param_content;
  if (value != null && value instanceof cls.WebGLLinkedObject)
  {
    if (window.webgl.api.STATE_PARAMETER_TYPES[param] === window.webgl.api.TYPES.COLOR)
    {
      var color = value.data;
      var colors = Math.round(color[0] * 255) + ", " +
                   Math.round(color[1] * 255) + ", " +
                   Math.round(color[2] * 255) + ", " +
                   color[3];
      param_content = [
        "div",
        [
          ["div",
            ["div", "style", "background-color: rgba(" + colors + ");"],
            "class", "color-box checkerboard"
          ],
          ["span", value.text]
        ]
      ];
    }
    else
    {
      param_content = window.templates.webgl.linked_object(value, "webgl-draw-argument", "argument");
    }
  }
  else
  {
    param_content = [
      "span", window.webgl.api.state_parameter_to_string(param, value)
    ];
  }

  return param_content;
};

window.templates.webgl.error_message = function(call)
{
  var error_code = window.webgl.api.constant_value_to_string(call.error_code);

  var fun_errors = window.webgl.api.functions[call.function_name].errors;
  if (!fun_errors || !(error_code in fun_errors)) return [];

  var errors = fun_errors[error_code];
  errors = errors.map(function(error){return [
    "div",
    [
      [
        "span", error.txt
      ],
      !error.ref ? [] : [
        "a", "Read more here.",
        "href", error.ref
      ]
    ]
  ];});


  var content = [];
  var result = [
    "div", content,
    "class", "error-message"
  ];

  content.push([
    "div", "Possible cause" + (errors.length === 1 ? "" : "s") + ":",
    "class", "cause"
  ]);
  content.push(errors);

  return result;
};

window.templates.webgl.tabs = function(tabs, active_tab)
{
  var html = tabs.map(function(tab)
  {
    if (!tab.enabled) return [];
    var content = [
      "div", tab.name,
      "handler", "webgl-tab",
      "id", tab.id
    ];
    if (tab === active_tab)
      content.push("class", "active");
    return content;
  });
  html.push(["div"]);
  return html;
};

window.templates.webgl.start_of_frame_header = function(call, trace_call)
{
  var header = [
    "div",
    [
      [
        "h2", "Start of frame"
      ]
    ],
    "class", "call-header"
  ];

  return header;
};

window.templates.webgl.call_header = function(call, trace_call)
{
  var callnr = parseInt(call, 10) + 1; // Start call count on 1.

  // Makes a link to the webgl specification of the actual function.
  var spec_url = window.webgl.api.function_to_speclink(trace_call.function_name);
  var spec_link = spec_url == null ? [] : [
    "span", "Specification",
    "handler", "webgl-speclink-click",
    "class", "ui-button ui-control specification",
    "specification_url", spec_url
  ];

  var function_name = ["span", trace_call.function_name];

  // Construct struture to display call arguments.
  var function_arguments = [];
  var argobj = window.webgl.api.function_arguments_to_objects(trace_call.function_name, trace_call.args);
  for (var i = 0; i < argobj.length; i++)
  {
    var arg = argobj[i];
    var html = window.templates.webgl.linked_object(arg, "webgl-draw-argument", "argument");
    if (i > 0) function_arguments.push(["span", ", "]);
    function_arguments.push(html);
  }

  if (trace_call.loc)
    window.templates.webgl.goto_script(trace_call.loc, function_name);

  var header = [
    "div",
    [
      [
        "h2",
        [
          ["span", "Call " + callnr + ": "],
          function_name,
          ["span", "("]
        ]
      ],
      [
        "div", function_arguments,
        "class", "arguments"
      ],
      ["h2", ")"],
      spec_link
    ],
    "class", "call-header",
  ];

  return header;
};

window.templates.webgl.summary = function(primary, secondary)
{
  return [
      "div",
    [
      [
        "div",
        primary.map(window.templates.webgl.summary_view),
        "class", "primary-summary"
      ],
      secondary && secondary.length > 0 ? [
        "div",
        secondary.map(window.templates.webgl.summary_view),
        "class", "secondary-summary"
      ] : []
    ],
    "class", "summary"
  ];
};

window.templates.webgl.summary_view = function(item)
{
  if (item == null) return [];
  var header = [
    "h3",
    item.title
  ];

  var classes = "summary-item";
  if (item.class) classes += " " + item.class;
  return [
    "div",
    [
      header,
      item.content
    ],
    "class", classes
  ];
};

window.templates.webgl.drawcall = function(draw_call, trace_call, framebuffer)
{
  var img = window.templates.webgl.framebuffer_image(framebuffer);

  var buffer_display = [];
  if (window.webgl.gl)
  {
    buffer_display = window.templates.webgl.drawcall_buffer(draw_call);
  }

  var program = draw_call.program;

  var call_index = draw_call.call_index;
  var html = [
    window.templates.webgl.summary_item(["h3", "Framebuffer"], img),
    window.templates.webgl.summary_item(["h3", "Buffer"], buffer_display),

    [
      "div",
      [
       window.templates.webgl.summary_item(["h3", "Attributes"], window.templates.webgl.attribute_table(call_index, program)),
       window.templates.webgl.summary_item(["h3", "Uniforms"], window.templates.webgl.uniform_table(call_index, program))
      ] ,
      "style", "clear: both;"]
  ];

  return html;
};

/**
 * Returns a div containing the buffer preview to be used together with draw
 * calls, including select form for switching attribute
 */
window.templates.webgl.drawcall_buffer = function (draw_call)
{
  var call_index = draw_call.call_index;
  var attributes = draw_call.program.attributes;
  var select = [
    "select",
    attributes.map(function(attribute) {
      var pointer = attribute.pointers.lookup(call_index);
      var option = [ "option",
        attribute.name + " (" + pointer.buffer + ")",
        "value", attribute,
        "pointer", pointer
      ];
      if (!pointer.buffer)
      {
        option.push("disabled", "true");
      }
      return option;
    }),
    "handler", "webgl-select-attribute",
    "id", "webgl-attribute-selector"
  ];
  // To get it floating properly it needs to be put in a div
  select = [
    "div", select,
    "class", "select-float"
  ];
  return ["div",
    select,
    window.templates.webgl.preview_canvas()
  ];
};

window.templates.webgl.preview_canvas = function()
{
  var front_face = window.settings['webgl-preview'].map['front-face-normal']
    ? "normal value"
    : "black";
  var back_face = window.settings['webgl-preview'].map['back-face-normal']
    ? "normal value"
    : "black";

  return ["div",
    ["div",
      "?",
      ["div",
        ["span", "Front facing: " + front_face],
        ["br"],
        ["span", "Back facing: " + back_face],
        "id", "webgl-preview-help"
      ]
    ],
    "handler", "webgl-canvas",
    "id", "webgl-canvas-holder",
    "class", "webgl-holder"
  ];
};

window.templates.webgl.preview_disabled = function(buffer_size, setting_size)
{
  return ["div",
    ['div', "Buffer size (" + buffer_size + "kB) is larger than maximum preview size (" + setting_size + "kB), automatic download disabled."],
    ['span',
      ['span', "Load buffer"],
      'handler', 'webgl-force-buffer',
      'class', 'ui-button'
    ]
  ];
};

window.templates.webgl.shader_source = function(source)
{
  var line_count = 1;
  var lines = [];
  source.split('\n').forEach(function() { lines.push(line_count++); });
  return (
  ['div',
    ['pre', source, 'class', 'sh_glsl'],
    ['div', lines.join('\n'), 'class', 'resource-line-numbers', 'unselectable', 'on'],
    'class', 'resource-detail-container mono line-numbered-resource js-resource-content'
  ]);
};

window.templates.webgl.attribute_table = function(call_index, program)
{
  var attributes = program.attributes;
  var rows = [];

  rows.push([
    "tr",
    [
      [
        "td",
        "Attribute name"
      ],
      [
        "td",
        "Type"
      ],
      [
        "td",
        "Buffer"
      ],
      [
        "td",
        "Layout"
      ],
    ],
    "class", "header"
  ]);

  for (var i=0; i<attributes.length; i++)
  {
    var attribute = attributes[i];
    var pointer = attribute.pointers.lookup(call_index);
    var changed_this_call = pointer.call_index === call_index;

    rows.push([
      "tr",
      [
        [
          "td",
          attribute.name
        ],
        [
          "td",
          window.webgl.api.constant_value_to_string(attribute.type)
        ],
        [
          "td",
          pointer.buffer ? String(pointer.buffer) : "",
          "class", changed_this_call ? "changed" : ""
        ],
        [
          "td",
          pointer.layout
         	? String(pointer.layout.size) + "x"
              + window.webgl.api.constant_value_to_string(pointer.layout.type)
              + ",  +" + String(pointer.layout.offset) + "/"
              + String(pointer.layout.stride)
            : "",
          "class", changed_this_call ? "changed" : ""
        ]
      ]
    ]);
  }

  var table = [
    "div",
    [
      "table",
      rows,
      "class", "sortable-table uniform-table"
    ],
    "class", "uniforms"
  ];

  return table;
};

window.templates.webgl.uniform_table = function(call_index, program)
{
  var uniforms = program.uniforms;
  var rows = [];

  rows.push([
    "tr",
    [
      [
        "td",
        "Uniform name"
      ],
      [
        "td",
        "Type"
      ],
      [
        "td",
        "Value"
      ]
    ],
    "class", "header"
  ]);

  for (var i = 0; i < uniforms.length; i++)
  {
    var uniform = uniforms[i];

    var value = uniform.values[0].value;

    var last_index = 0;
    var values = uniform.values;
    for (var j = 1; j < values.length && values[j].call_index <= call_index; j++)
    {
      last_index = j;
      value = values[j].value;
    }

    var changed_this_call = false;
    if (last_index !== 0)
    {
      if (values[last_index].call_index === call_index)
      {
        changed_this_call = true;
      }
      value = values[last_index].value;
    }

    // To make long matrices print out shorter strings.
    var format_value = function(value)
    {
      var ret = "[";
      var val;
      for (var j=0; j<value.length && j < 4; j++)
      {
        val = value[j].toFixed(5);
        ret += val + ", ";
      }
      ret.substr(0,ret.length-2);
      if (j === value.length)
      {
        ret += "]";
      }
      else
      {
        ret += "...]";
      }
      return ret;
    };

    // Adding a tooltip to matrices and formating long matrices.
    var data_tooltip = null;
    var uniform_tooltip = null;
    var type = window.webgl.api.constant_value_to_string(uniform.type)
    switch (type)
    {
      case "FLOAT_MAT3": data_tooltip = "data-tooltip";
                         uniform_tooltip = "webgl-uniform-tooltip";
                         value = format_value(value);
                         break;
      case "FLOAT_MAT4": data_tooltip = "data-tooltip";
                         uniform_tooltip = "webgl-uniform-tooltip";
                         value = format_value(value);
                         break;
      default: break;
    }
    // End

    rows.push([
      "tr",
      [
        [
          "td",
          uniform.name
        ],
        [
          "td",
          window.webgl.api.constant_value_to_string(uniform.type)
        ],
        [
          "td",
          String(value),
          "id", uniform.index,
          "class", changed_this_call ? "changed" : "",
          data_tooltip, uniform_tooltip
        ]
      ]
    ]);
  }

  var table = [
    "div",
    [
      "table",
      rows,
      "class", "sortable-table uniform-table"
    ],
    "class", "uniforms"
  ];

  return table;
};


window.templates.webgl.uniform_tooltip = function(value)
{
  var html = [];
  var row = [];
  var cols = [];
  var table = ["table"];
  var dim = Math.sqrt(value.length);

  for (var i=0; i<dim; i++)
  {
    row = ["tr"];
    cols = [];
    for (var j=0; j<dim; j++)
    {
      var fixed_val = value[i+j].toFixed(5);
      var val = fixed_val === "0.00000" ? "0" : fixed_val;
      cols.push(["td", val]);
    }
    row.push(cols);
    table.push(row);
  }

  html = ["div", "Matrix " + String(dim) + "x" + String(dim), ["hr"], table];

  return html;
};


window.templates.webgl.taking_snapshot = function()
{
    var html = ["div",
                  ["p", ["img", "src", "./ui-images/loading.png"]],
                  ["p", "Taking snapshot..."],
                  "class", "info-box"
                ];
    return html;
};

window.templates.webgl.taking_delayed_snapshot = function(count)
{
    var html = ["div",
                  ["p", ["img", "src", "./ui-images/loading.png"]],
                  ["p", "Taking snapshot in " + String(count) + " seconds"],
                  "class", "info-box"
                ];
    return html;
};

window.templates.webgl.program = function(call_index, program)
{
  var programs = [];

  for (var i = 0; i < program.shaders.length; i++)
  {
    var shader = program.shaders[i];

    var shader_type = window.webgl.api.constant_value_to_string(shader.type);
    switch (shader_type)
    {
      case "VERTEX_SHADER":
        shader_type = "Vertex";
        break;
      case "FRAGMENT_SHADER":
        shader_type = "Fragment";
        break;
    }
    programs.push([
      ["h1", shader_type + " shader " + String(shader.index)],
      window.templates.webgl.shader_source(shader.src)
    ]);
  }

  var attribute_table = null;
  var uniform_table = null;
  var html =
  [
    "div",
    programs
  ];

  // If the program is related to a call, attribute and uniforms tables
  // will be created and attached to the template.
  if (call_index !== -1 && call_index !== null)
  {
    attribute_table = window.templates.webgl.attribute_table(call_index, program);
    uniform_table = window.templates.webgl.uniform_table(call_index, program);
    html =
    [
      "div",
      attribute_table,
      uniform_table,
      programs
    ];
  }
  return html;
};

window.templates.webgl.settings = function(settings)
{
    var port = 9000;
    var error = null;
    var PORT_MIN = 1024;
    var PORT_MAX = 65535;
    return [
      ['label',
        ui_strings.S_LABEL_PORT + ': ',
        ['input',
          'type', 'number',
          'min', PORT_MIN,
          'max', PORT_MAX,
          'value', Math.min(PORT_MAX, Math.max(port, PORT_MIN))
        ],
        ['span',
          ui_strings.S_BUTTON_TEXT_APPLY,
          'handler', 'apply-remote-debugging',
          'class', 'ui-button',
          'tabindex', '1'
        ]
      ],
      ['p',
        error || "",
        'id', 'remote-debug-info'
      ],
      'id', 'remote-debug-settings'
    ];

};
