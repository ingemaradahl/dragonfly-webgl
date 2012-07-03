"use strict";

window.templates = window.templates || {};
window.templates.webgl = window.templates.webgl || {};

window.templates.webgl.buffer_base = function(buffer)
{
  var MAX_NUM_ELEMENTS = 1000;
  var data_table_rows = [];
  for (var i = 0; i < Math.min(buffer.values.length, MAX_NUM_ELEMENTS); i++) {
    var value = buffer.values[i];
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
  if (buffer.values.length > MAX_NUM_ELEMENTS)
  {
    var diff = buffer.values.length - MAX_NUM_ELEMENTS;
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
    ]
  ];

  var buffer_info = [
    {name: "Target", value: buffer.target_string()},
    {name: "Usage", value: buffer.usage_string()},
    {name: "Size", value: String(buffer.size)},
    {name: "Length", value: String(buffer.values.length)}
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
            "buffer-info"
          ]
        ]
      ],
      [
        "table",
        [
          [
            "thead",
            data_table_head
          ],
          [
            "tbody",
            data_table_rows
          ]
        ]
      ],
      more_data
    ]
  ];
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

  if (call.have_error)
  {
    content.push(" » ", ["span", "error: " + String(call.error_code)]);
  }

  return [
    "tr", [
      ["td", String(call_number + 1)],
      ["td", content]
      //["td", call.is_drawcall()]
    ],
    "class", call.have_error ? "trace-error" : "", // TODO css, add is drawcall
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
  return ([["table",
            ["tr",  
              ["td", ["h2" , obj.element_type]]
            ],
            ["tr",  
              ["td", "Texture id:"],
              ["td", String(obj.id)]
            ],
            ["tr",
              ["td", "Source:"],
              ["td", obj.source]
            ],
            ["tr",
              ["td", "texture_wrap_s:"],
              ["td", window.webgl.api.constant_value_to_string(obj.texture_wrap_s)]
            ],
            ["tr",
              ["td", "texture_wrap_t:"] ,
              ["td", window.webgl.api.constant_value_to_string(obj.texture_wrap_t)]
            ],
            ["tr",
              ["td", "texture_min_filter:"],
              ["td", window.webgl.api.constant_value_to_string(obj.texture_min_filter)]
            ],
            ["tr",
              ["td", "texture_mag_filter:"],
              ["td", window.webgl.api.constant_value_to_string(obj.texture_mag_filter)]
            ],
          ], ["img", "src", obj.img]]
        );
};
