"use strict";

window.templates = window.templates || {};
window.templates.webgl = window.templates.webgl || {};


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
  if (start_row == null) start_row = 0;
  var buffer_size = Number(buffer.size / 1024).toFixed(2);
  var setting_size = window.settings['webgl-preview'].map['max_preview_size'];
  var target = window.webgl.api.constant_value_to_string(buffer.target);
  var data_table;

  if (buffer.data_is_loaded())
  {
    data_table = window.templates.webgl.buffer_data_table(buffer, coordinates, start_row);
  }
  else if(buffer.data_is_downloading())
  {
    return window.templates.webgl.loading_buffer_data();
  }
  else
  {
    var template = window.templates.webgl.preview_disabled(buffer_size, setting_size, "webgl-load-buffer-data");
    template.push("class", "buffer-data");
    return template;
  }

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
  }

  var coordinate_selector = [
    "select", buffer_options,
    "handler", "webgl-select-layout",
    "id", "webgl-layout-selector"
  ];

  var layout_inputbox = [
    "input",
    "type", "text",
    "handler", "webgl-input-layout",
    "id", "webgl-layout-input",
    "maxlength", "30",
    "placeholder", "E.g. \"a,b,c,d\""
  ];

  if (coordinates != null && selected_item === buffer_options.length - 1)
  {
    layout_inputbox.push("value", coordinates);
  }
  else
  {
    layout_inputbox.push("hidden", "true");
  }


  var start_row_row = [
    "tr", [
      [
        "td", "Start row:"
      ],
      [
        "td",
        [
          "input",
          "type", "number",
          "min", "0",
          "handler", "webgl-input-row",
          "id", "webgl-row-input",
          "value", String(start_row)
        ]
      ]
    ]
  ];

  var layout_row = [
    "tr", [
      [
        "td", "Layout:"
      ],
      [
        "td",
        [
          coordinate_selector,
          layout_inputbox
        ]
      ]
    ]
  ];

  return [
    "div", [
      [
        "table", [
          start_row_row,
          layout_row
        ]
      ],
      data_table
    ],
    "class", "buffer-data"
  ];
};

window.templates.webgl.loading_buffer_data = function()
{
  return [
    "div", "Downloading buffer data ",
    ["img", "src", "./ui-images/loading.png"],
    "class", "buffer-data"
  ];
};

window.templates.webgl.buffer_info_table = function(buffer)
{
  var buffer_info = [
    {name: "Target", value: buffer.target_string()},
    {name: "Usage", value: buffer.usage_string()},
    {name: "Byte size", value: String(buffer.size) + " bytes"},
    {name: "Length", value: String(buffer.data_length) + " elements"}
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

  var ret = ["div",
    ["table",
      info_table_rows,
      "class",
      "table-info"
    ]
  ];

  return ret;
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

  var table_head = [["td", "Row"]];
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

  return ["div", data_table, more_data];
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
    ],
    "class" , "buffer-visual"
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

window.templates.webgl.framebuffer_image = function (framebuffer, additional_classes)
{
  additional_classes = additional_classes || [];
  var image;
  switch (framebuffer.type)
  {
    case "clear":
      var color = framebuffer.image.color;
      var to_hex = function(float_val)
      {
        return (Math.round(float_val * 255).toString(16));
      };
      var colors = Math.round(color[0] * 255) + ", " +
                   Math.round(color[1] * 255) + ", " +
                   Math.round(color[2] * 255) + ", " +
                   color[3];
      image = ["svg:svg",
        ["rect",
          "width", String(framebuffer.image.width),
          "height", String(framebuffer.image.height),
          "x", "0",
          "y", "0",
          "style", "fill: rgba(" + colors + ");",
        ],
        "width", String(framebuffer.image.width),
        "height", String(framebuffer.image.height),
        "version", "1.1",
        "preserveAspectRatio", "xMinYMin meet",
        "viewBox", "0 0 " + String(framebuffer.image.width) + " " + String(framebuffer.image.width),
        "class", ["checkerboard"].concat(additional_classes).join(" ")

      ];
      break;
    case "init":
    case "draw":
      image = window.templates.webgl.image(framebuffer.image, additional_classes);
      break;
  }

  return image;
};

window.templates.webgl.framebuffer_summary = function (framebuffers, binding)
{
  var select = window.templates.webgl.framebuffer_selector(framebuffers, binding);
  var text = "Dimensions: " + binding.image.width + "×" +
    binding.image.height +" px";
  var dimensions = [
    "div",
    [
      "div", text
    ],
    "class", "dimensions-float"
  ];

  var image = window.templates.webgl.framebuffer_image(binding, ["thumbnail"]);

  return [
    "div",
    select,
    image,
    dimensions,
    "class", "framebuffer-thumbnail"
  ];
};

window.templates.webgl.framebuffer_selector = function (framebuffers, binding)
{
  var select = ["select"];
  var options = 0;

  for (var f in framebuffers)
  {
    var framebuffer = framebuffers[f];
    var option = ["option", String(framebuffer), "value", framebuffer, "framebuffer", framebuffer];

    if (framebuffer.index === binding.index)
    {
      option.push("selected", "selected");
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


  return options > 1 ? select : [];
};

window.templates.webgl.image = function(level, additional_classes)
{
  additional_classes = additional_classes || [];
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
      "handler", "webgl-scroll-image"
    ];
    var classes = ["checkerboard"].concat(additional_classes);
    if (level.img.flipped)
      classes.push("flipped");

    image.push("class", classes.join(" "));
  }
  else
  {
    image = ["div",
      "class", (["loading-image"].concat(additional_classes)).join(" "),
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

  if (level0)
  {
    texture_info.unshift({
      name: "Dimensions",
      value: level0.width + "×" + level0.height + " px"
    });

    if (level0.url)
    {
      texture_info.unshift({
        name: "Image source",
        value: level0.url
      });
    }

    texture_info.unshift({
      name: "Source",
      value: level0.element_type
    });
  }

  var info_table_rows = texture_info.map(build_info_row);

  var info_table = [
    "table",
    info_table_rows,
    "class", "table-info"
  ];

  return info_table;
};

window.templates.webgl.mipmaps = function(texture, selected)
{
  var mipmaps = [];
  var selector = [];
  var ret = [];
  selected = selected || 0;

  var img;
  if (texture.levels.length > 1)
  {
    for (var i=0; i<texture.levels.length; i++)
    {
      mipmaps.push({title: "Level " + i, index: i});
    }

    img = window.templates.webgl.image(texture.levels[selected],
            ["full-texture"]) ||
          window.templates.webgl.image(texture.levels[0],
            ["full-texture"]);
    var options = mipmaps.map(function(level) {
      var option = ['option', level.title];
        if (level.index === selected)
        {
          option.push('selected', 'selected');
        }
        return option;
      });

    selector = ["select", options, "handler", "webgl-mipmap-select"];
    selector = ["div", selector, "class", "select-float"];
  }
  else
  {
    img = window.templates.webgl.image(texture.levels[0], ["full-texture"]);
    selector = null;
  }

  img = [
    "div", img,
    "style", "position: relative;"
  ];

  if (selector)
  {
    ret.push(selector);
  }
  ret.push(img);

  return ret;
};

window.templates.webgl.mipmap_table = function(texture)
{
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
  if (!texture.mipmapped || texture.levels.length === 0)
  {
    return ["div", "No mipmaps"];
  }

  var mipmap_index = 1;
  var mipmap_levels = texture.levels.slice(1).map(function(level)
  {
    var image = window.templates.webgl.image(level, "mipmap-image");
    var image_source = null;
    if (level.url)
      image_source = { name: "Image source", value: level.url };

    var level_info_rows = [
      { name: "Level", value: String(level.level) },
      { name: "Source", value: level.element_type },
      image_source,
      { name: "Dimensions: ", value: level.width + "×" + level.height + " px" },
    ].map(build_info_row);

    var info_table = [
      "table",
      level_info_rows,
      "class", "table-info"
    ];

    return [
      "tr",
      [
        "th", image,
        "handler", "webgl-mipmap-click",
        "index", String(mipmap_index++)
      ],
      ["td", info_table]
    ];
  });

  mipmap_table = [ "div",
    [ "h3", "Custom mipmap levels" ],
    [ "table", mipmap_levels, "class", "sortable-table" ],
    "class", "mipmap-table"
  ];

  return mipmap_table;
};

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
      param_content = window.templates.webgl.linked_object(value, "webgl-state-argument", "argument");
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

window.templates.webgl.error_message = function(solutions)
{
  solutions = solutions.map(function(solution){return [
    "li",
    [
      [
        "span", solution.txt
      ],
      !solution.ref ? [] : [
        "a", "Read more",
        "target", "_blank",
        "href", solution.ref
      ]
    ]
  ];});

  var content = [];

  content.push([
    "div", "Possible cause" + (solutions.length === 1 ? "" : "s") + ":",
    "class", "cause"
  ]);
  content.push(["ui", solutions]);

  return [
    "div", content,
    "class", "error-message"
  ];
};

window.templates.webgl.tabs = function(tabs, active_tab)
{
  var html = tabs.map(function(tab)
  {
    var content = [
      "div", tab.name,
      "id", tab.id,
      "handler", "webgl-tab"
    ];

    if (tab === active_tab)
      content.push("class", "active");
    else if (!tab.enabled)
      content.push("class", "disabled");

    return content;
  });
  html.push(["div"]);
  return html;
};

window.templates.webgl.start_of_frame_header = function(object)
{
  var title = [["h2", "Start of frame"]];
  if (object != null)
  {
    title.push(["h2", " - ", "class", "divider"],
      ["h2", String(object), "class", "call-object"]);
  }

  return [
    "div",
    title,
    "class", "call-header"
  ];
};

window.templates.webgl.call_header = function(call, trace_call, object)
{
  var callnr = parseInt(call, 10) + 1; // Start call count on 1.

  // Makes a link to the webgl specification of the actual function.
  var spec_url = window.webgl.api.function_to_speclink(trace_call.function_name);
  var spec_link = spec_url == null ? [] : [
    "span", "Specification",
    "handler", "webgl-speclink-click",
    "title", "Open " + trace_call.function_name + " specification in a new tab",
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

  var object_title = object == null ? [] : [
    ["h2", " - ", "class", "divider"],
    ["h2", String(object), "class", "call-object"]
  ];
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
      object_title,
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

window.templates.webgl.preview_disabled = function(buffer_size, setting_size, handler)
{
  // TODO translation
  return [
    "div", "Buffer size (" + buffer_size + "kB) is larger than maximum preview size ("
      + setting_size + "kB). Automatic download disabled.",
    [
      "div", "Load buffer",
      "handler", handler,
      "class", "ui-button"
    ],
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
    var pointer = attribute.pointers.lookup ? attribute.pointers.lookup(call_index) : null;
    var changed_this_call = pointer ? pointer.call_index === call_index : false;

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
          pointer && pointer.buffer ? String(pointer.buffer) : "",
          "class", changed_this_call ? "changed" : ""
        ],
        [
          "td",
          pointer && pointer.layout ?
            String(pointer.layout.size) + "×"
              + window.webgl.api.constant_value_to_string(pointer.layout.type)
              + ",  +" + String(pointer.layout.offset) + "/"
              + String(pointer.layout.stride)
            : "",
          "class", changed_this_call ? "changed" : "",
          "data-tooltip", "webgl-layout-tooltip",
          "data-layout", pointer.layout
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

  // To make long matrices print out shorter strings.
  var format_matrix = function(value)
  {
    var ret = "[";
    for (var j = 0; j < value.length && j < 4; j++)
    {
      var val = value[j].toFixed(3);
      ret += val + ", ";
    }
    ret.substr(0, ret.length - 2);
    ret += j === value.length ? "]" : "...]";

    return ret;
  };

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

    // Adding a tooltip to matrices and formating long matrices.
    var tooltip = [];
    var type = window.webgl.api.constant_value_to_string(uniform.type);
    if (type === "FLOAT_MAT3" || type === "FLOAT_MAT4")
    {
      tooltip = [
        "data-call-index", call_index,
        "data-uniform", uniform,
        "data-tooltip", "webgl-uniform-tooltip",
      ];
      value = format_matrix(value);
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
          "class", changed_this_call ? "changed" : "",
          "data-uniform-index", uniform.index,
        ].concat(tooltip)
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
  var table = ["table"];
  var dim = Math.sqrt(value.length);

  for (var i = 0; i < dim; i++)
  {
    var row = ["tr"];
    var cols = [];
    for (var j = 0; j < dim; j++)
    {
      var fixed_val = value[i + j].toFixed(5);
      var val = fixed_val === "0.00000" ? "0" : fixed_val;
      cols.push(["td", val]);
    }
    row.push(cols);
    table.push(row);
  }
  table.push("class", "sortable-table uniform-tooltip");

  return ["div", ["h4", "Matrix " + String(dim) + "×" + String(dim), "class", "uniform-tooltip"], table];
};

window.templates.webgl.layout_tooltip = function(layout)
{
  return ["div", ["div", "Offset: " + layout.offset], ["div", "Stride: " + layout.stride]];
};

window.templates.webgl.taking_snapshot = function()
{
  return [
    "div",
    ["p", ["img", "src", "./ui-images/loading.png"]],
    ["p", "Taking snapshot..."],
    "class", "info-box"
  ];
};

window.templates.webgl.taking_delayed_snapshot = function(count)
{
  return [
    "div",
    ["p", ["img", "src", "./ui-images/loading.png"]],
    ["p", "Taking snapshot in " + String(count) + " seconds"],
    "class", "info-box"
  ];
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
      [
        "div", shader_type + " shader " + String(shader.index),
        "class", "header"
      ],
      window.templates.webgl.shader_source(shader.src)
    ]);
  }

  return [
    "div",
    programs
  ];
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

window.templates.webgl.info_box = function(title, string, button, custom)
{
  button = button || [];
  custom = custom || [];

  return [ "div",
    [ "h3", title],
    string ? [ "p", string] : [],
    custom,
    button,
    "class", "info-box"
  ];
};

window.templates.webgl.collapse_box = function(title, string, button, custom, info_open)
{
  button = button || [];
  custom = custom || [];

  return ["div",
    [ "h3", title, "handler", "webgl-info-box-toggle"],
    string instanceof Array ? string : [ "p", string],
    custom,
    button,
    "class", "info-box collapsable" + (info_open ? " open" : "")
  ];
};

window.templates.webgl.start_view = function(state, info_open)
{
  var html = ["div"];
  html.push(["h2", "Welcome to the Dragonfly WebGL Debugger"]);

  switch (state)
  {
    case "init":
      var warning = window.settings["webgl-snapshot"].map["pre-composite-capture"];
      if (warning)
      {
        var warning_html = [ "div",
          ["h3", "Pre composite capturing enabled"],
          ["p", "This is an experimental feature, expect unstable behaviour"],
          [ "span", "Open settings",
            "class", "ui-button",
            "handler", "webgl-open-settings",
            "tabindex", "1"
          ],
          "class", "info-box warning"
        ];
        html.push(warning_html);
      }

      html.push(window.templates.webgl.info_box(
        "Refresh the page you want to debug",
        "The WebGL Debugger needs to be present from the start of the " +
           "execution of the application you want to debug. Click the button " +
           "below to refresh.",
        [ "span", "Initialize WebGL Debugger",
          "class", "ui-button reload-window",
          "handler", "reload-window",
          "tabindex", "1"
        ]
      ));
      break;
    case "snapshot":
      html.push(window.templates.webgl.info_box(
        "Request a snapshot from a WebGLRenderingContext",
        "Press the button to the right or below to request a new snapshot of " +
        "WebGL. It will constitute of the state of WebGL and all calls made " +
        "to WebGL during an entire frame.",
        [ "span", "Request snapshot",
          "class", "ui-button",
          "handler", "webgl-take-snapshot"
        ]
      ));
      var settings = window.settings["webgl-snapshot"];
      var show_settings = [
        { key: 'fbo-readpixels',
          desc: "A call to gl.readPixels will be executed after each draw " +
                "call to record the framebuffer. This can take a lot of time " +
                "on some devices."
        },
        { key: 'stack-trace',
          desc: "Record the location of every call made to WebGL. This is done " +
                "by analyzing the stack trace at each call. The stack trace is " +
                "retrieved by throwing an exception, which affects the " +
                "behaviour of the Javascript debugger."
        }
      ];

      var setting_to_paragraph = function(setting)
      {
        return ["div",
          ["h4", settings.label_map[setting.key] + ": " + (settings.map[setting.key] ? "enabled" : "disabled")],
          ["p", setting.desc]
        ];
      }

      html.push(window.templates.webgl.collapse_box(
        "Snapshot settings",
        show_settings.map(setting_to_paragraph),
        [ "span", "Open settings",
          "class", "ui-button",
          "handler", "webgl-open-settings",
          "tabindex", "1"
        ],
        ["p", "Snapshots can be customized to some extent from the WebGL settings tab"],
        info_open
      ));
      break;
    case "select":
      html.push(window.templates.webgl.info_box(
        "Select a call to start inspecting",
        "Or use the tabs for buffers, textures or programs to select which " +
        "object you want to inspect.",
        null,
        // TODO: Make this prettier
        ["p", "Errors are marked with a ",
          ["span", "red", "class", "info-error-block"],
          " background, redundant calls a ",
          ["span", "yellow", "class", "info-redundant-block"],
          " background and draw calls a ",
          ["span", "green", "class", "info-drawcall-block"],
          " background."
        ]
      ));
      break;
  }

  html.push("class", "webgl-start", "id", "webgl-start");

  return html;
};
