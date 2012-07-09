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
    "class", "sortable-table trace-table", // TODO css
  ];
};


window.templates.webgl.texture = function(texture)
{
  var api = window.webgl.api;
  var image_source = [];
  if (texture.img && texture.img.source)
  {
    image_source = [
      "tr",
      ["th", "Image source"],
      ["td", texture.img.source]
    ];
  }

  var img = [];
  if (texture.img.data)
  {
    img = ["img", "src", texture.img.data ];
    if (texture.img.flipped)
    {
      img.push("class");
      img.push("flipped");
    }
  }
  else {
    img = ["div", 
      ["img", "src", "./ui-images/loading.png"],
      "class", "loading-image",
      "style", "width: " + String(texture.width ? texture.width : 128) + "px; height: " + String(texture.height ? texture.height : 128) + "px;"
    ];
  }

  var info_table = [
    "table",
    ["tr",
      ["th", "Source"],
      ["td", texture.element_type]
    ],
    image_source,
    ["tr",
      ["th", "Dimensions"],
      ["td", texture.height + "px * "+ texture.width +"px"]
    ],
    ["tr",
      ["th", "format"],
      ["td", api.constant_value_to_string(texture.format) ]
    ],
    ["tr",
      ["th", "internalFormat"],
      ["td", api.constant_value_to_string(texture.internalFormat) ]
    ],
    ["tr",
      ["th", "type"],
      ["td", api.constant_value_to_string(texture.type) ]
    ],
    texture.border ? ["tr", ["th", "border"], ["td", String(texture.border)]] : [],
    ["tr",
      ["th", "TEXTURE_WRAP_S"],
      ["td", window.webgl.api.constant_value_to_string(texture.texture_wrap_s)]
    ],
    ["tr",
      ["th", "TEXTURE_WRAP_T"] ,
      ["td", window.webgl.api.constant_value_to_string(texture.texture_wrap_t)]
    ],
    ["tr",
      ["th", "TEXTURE_MIN_FILTER"],
      ["td", window.webgl.api.constant_value_to_string(texture.texture_min_filter)]
    ],
    ["tr",
      ["th", "TEXTURE_MAG_FILTER"],
      ["td", window.webgl.api.constant_value_to_string(texture.texture_mag_filter)]
    ],
    "class", "table-info"
  ];

  return [ "div",
    ["h2", "Texture " + String(texture.index)],
    img,
    info_table
  ];
};

window.templates.webgl.drawcall = function(draw_call, trace_call)
{
  var fbo = draw_call.fbo;
  var img = ["img", "width", fbo.width, "height", fbo.height, "src", fbo.data];

  if (fbo.flipped)
  {
    img.push("class");
    img.push("flipped");
  }

  var buffer_link = [ "span",
    draw_call.buffer.link.text,
    "handler", "webgl-drawcall-buffer",
    "class", "link",
    "buffer", draw_call.buffer
  ];

  var state = [
    "table",
      [
        [ "tr",
          ["th", window.webgl.api.constant_value_to_string(draw_call.buffer_target)],
          ["td", buffer_link ]
        ],
        [ "tr",
          [ "th", "Program" ],
          [ "td", String(draw_call.program_index)]
        ],
      ],
      "class", "draw-call-info"
  ];

  var html =
  [
    "div",
      [ "div",
        ["h2", window.webgl.api.function_call_to_string(trace_call.function_name, trace_call.args)]
      ],
      state,
      img
  ];

  return html;
};

window.templates.webgl.program = function(program)
{
  var programs = [];

  for (var i = 0; i < program.shaders.length; i++)
  {
    var shader = program.shaders[i];
    var shader_source = [
        "pre",
        shader.src,
        'class', 'sh_glsl'
    ];

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
      ["h2", shader_type + " shader " + String(shader.index)],
      shader_source
    ]);
  }

  var html =
  [
    "div",
     programs
  ];


  return html;
};
