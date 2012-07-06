"use strict";

window.templates = window.templates || {};
window.templates.webgl = window.templates.webgl || {};

window.templates.webgl.buffer_base = function(buffer)
{
  var MAX_NUM_ELEMENTS = 1000;
  var data_table;
  if (buffer.data_is_loaded())
  {
    data_table = window.templates.webgl.buffer_data_table(buffer);
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

  return [
    "div",
    [
      [
        "div",
        [
          [
            "h2",
            "Buffer " + String(buffer.index)
          ],
          [
            "table",
            info_table_rows,
            "class",
            "table-info"
          ]
        ]
      ],
      data_table
    ]
  ];
};

window.templates.webgl.buffer_data_table = function(buffer)
{
  var MAX_NUM_ELEMENTS = 1000;
  var data_table_rows = [];
  for (var i = 0; i < Math.min(buffer.data.length, MAX_NUM_ELEMENTS); i++)
  {
    var value = buffer.data[i];
    data_table_rows.push([
      "tr",
      [
        [
          "td",
          String(i),
          "style", // TODO make css class
          "text-align: right"
        ],
        [
          "td",
          String(value)
        ]
      ]
    ]);
  }

  // TODO temporary solution since Dragonfly will freeze when to many elements
  var more_data = [];
  if (buffer.data.length > MAX_NUM_ELEMENTS)
  {
    var diff = buffer.data.length - MAX_NUM_ELEMENTS;
    more_data = [
      "div",
      "There are " + String(diff) + " more elements."
    ];
  }

  var data_table_head = [
    "tr",
    [
      [
        "td",
        "Index"
      ],
      [
        "td",
        "value"
      ]
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

window.templates.webgl.trace_row = function(call, call_number, view_id)
{
  var func_text = [
    "span", call.function_name
  ]; // TODO click should jump to script tab...

  var content = [func_text];

  content.push("(");

  var argobj = window.webgl.api.function_arguments_to_objects(call.function_name, call.args);
  for (var i = 0; i < argobj.length; i++)
  {
    var arg = argobj[i];
    var html = ["span", arg.text];
    if (arg.action)
    {
      html.push(
          "handler", "webgl-trace-argument",
          "class", "link");
    }
    html.push(
        "data-call-number", call_number,
        "data-argument-number", i);

    if (i > 0) content.push(", ");
    content.push(html);
  }

  content.push(")");

  var row_class = "";
  if (call.have_error)
  {
    content.push(" » ", ["span", "error: " + String(call.error_code)]);
    row_class = "trace-error";
  }
  else if (call.redundant)
  {
    row_class = "trace-redundant";
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
    "class", "sortable-table trace-table", // TODO css
  ];
};


window.templates.webgl.texture = function(obj)
{
  var image_source = [];
  if (obj.source)
  {
    image_source = [
      "tr",
      ["th", "Image source"],
      ["td", obj.source]
    ];
  }

  var info_table = [
    "table",
    ["tr",
      ["th", "Source"],
      ["td", obj.element_type]
    ],
    image_source,
    ["tr",
      ["th", "TEXTURE_WRAP_S"],
      ["td", window.webgl.api.constant_value_to_string(obj.texture_wrap_s)]
    ],
    ["tr",
      ["th", "TEXTURE_WRAP_T"] ,
      ["td", window.webgl.api.constant_value_to_string(obj.texture_wrap_t)]
    ],
    ["tr",
      ["th", "TEXTURE_MIN_FILTER"],
      ["td", window.webgl.api.constant_value_to_string(obj.texture_min_filter)]
    ],
    ["tr",
      ["th", "TEXTURE_MAG_FILTER"],
      ["td", window.webgl.api.constant_value_to_string(obj.texture_mag_filter)]
    ],
    "class", "table-info"
  ];

  return [
    ["h2", "Texture " + String(obj.index)],
    ["img", "src", obj.img],
    info_table
  ];
};

window.templates.webgl.drawcall = function(fbo)
{
  var img = ["img", "width", fbo.width, "height", fbo.height, "src", fbo.img];

  if (fbo.flipped)
  {
    img.push("class");
    img.push("flipped");
  }
    return ([img]);
};
