"use strict";

window.cls || (window.cls = {});
cls.WebGL || (cls.WebGL = {});

/**
 * @constructor
 * @extends cls.WebGLCallView
 */

cls.WebGLProgramCallView = function(id, name, container_class)
{
  this._program;
  this._call_index;

  this.set_tabs([
    new cls.WebGLProgramSummaryTab("summary", "Summary", ""),
    new cls.WebGLProgramTab("program", "Shaders", ""),
    new cls.WebGLStateTab("state", "State", "")
  ]);

  this.init(id, name, container_class);
};

cls.WebGLProgramCallView.prototype = cls.WebGLCallView;

cls.WebGLProgramSummaryTab = function(id, name, container_class)
{
  this.set_call = function(snapshot, call_index, object)
  {
    this._program = call_index === -1 ? object :
      snapshot.trace[call_index].linked_object.program;
    cls.WebGLSummaryTab.set_call.apply(this, arguments);
  };

  this.getAttributeView = function()
  {
    var attribute_content = window.templates.webgl.attribute_table(this._call_index, this._program);
    return {title: "Attributes", content: attribute_content};
  };

  this.getUniformView = function()
  {
    var uniform_content = window.templates.webgl.uniform_table(this._call_index, this._program);
    return {title: "Uniforms", content: uniform_content};
  };

  this.getSecondaryViews = function()
  {
    return [this.getAttributeView(), this.getUniformView()];
  };

  this._on_tooltip = function(evt, target)
  {
    var uniform = this._program.uniforms[target.id];
    var value = uniform.values[0].value;
    var last_index = 0;
    var values = uniform.values;

    // We want the values related to this._call_index
    for (var i=1; i<values.length && values[i].call_index <= this._call_index; i++)
    {
      last_index = i;
      value = values[i].value;
    }

    var html = window.templates.webgl.uniform_tooltip(value);
    this.tooltip.show(html, false);
  };

  this.tooltip = Tooltips.register("webgl-uniform-tooltip");
  this.tooltip.ontooltip = this._on_tooltip.bind(this);

  this.init(id, name, container_class);
};
cls.WebGLProgramSummaryTab.prototype = cls.WebGLSummaryTab;

// ----------------------------------------------------------------------------

cls.WebGLProgramTab = function(id, name, container_class)
{
  // Can be used to hilight attributes as well
  var hilight_uniform = function(uniform)
  {
    var regex = new RegExp("(\\s|^)(" + uniform.name + ")(\\s|$)");
    var programs = document.getElementsByClassName("sh_glsl");

    for (var i=0; i<programs.length; i++)
    {
      var program = programs[i];
      for (var j=0; j<program.childNodes.length; j++)
      {
        var child_node = program.childNodes[j];
        if (regex.test(child_node.data))
        {
          // Some processing is needed to not wrap whitespace characters in the
          // hilight
          var span = document.createElement("span");
          var em = document.createElement("em");
          em.className = "search-highlight-selected";
          var non_ws = child_node.data.replace(/^\s+|\s+$/g, '');
          em.appendChild(document.createTextNode(non_ws));

          // Add whitespace before the uniform symbol
          var start_ws = child_node.data.match(/^\s+/);
          if (start_ws)
            span.appendChild(document.createTextNode(start_ws[0]));

          span.appendChild(em);

          // ..and add whitespace after the uniform symbol
          var end_ws = child_node.data.match(/\s+$/);
          if (end_ws)
            span.appendChild(document.createTextNode(end_ws));

          var par = child_node.parentNode;
          par.replaceChild(span, child_node);
        }
      }

    }
  };

  this.set_call = function(snapshot, call_index, object)
  {
    if (call_index !== -1)
      object = snapshot.trace[call_index].linked_object.program;
    this._program = object;
    this._call_index = call_index;
    this._snapshot = snapshot;
    cls.WebGLTab.set_call.apply(this, arguments);
  };

  this.render = function()
  {
    var call_index = this._call_index;
    var template = window.templates.webgl.program(this._call_index, this._program);
    this._container.clearAndRender(template);
    sh_highlightDocument();

    // If render has been called from a trace call hilight eventual uniform/attribute
    if (call_index !== -1 && call_index !== null)
    {
      var call = this._snapshot.trace[call_index];
      var uniattrib = call.linked_object.uniform || call.linked_object.attribute;
      if (uniattrib) hilight_uniform(uniattrib);
    }
  };

  this.init(id, name, container_class);
};

cls.WebGLProgramTab.prototype = cls.WebGLTab;

// ----------------------------------------------------------------------------

/**
 * @constructor
 * @extends cls.WebGLSideView
 */

cls.WebGLProgramSideView = function(id, name, container_class)
{
  this._content = null;

  var clear = function()
  {
    this._content = null;
  };

  this.createView = function(container)
  {
    this._container = container;
    if (!this._table)
    {
      this._table = new SortableTable(this.tabledef, null,
        ["name", "index"], null, null, false, "program_table"); // TODO complete
    }
    this.render();
  };

  this._render = function()
  {
    if (!this._container)
      return;
    if (this._content)
    {
      this._table.set_data(this._content);
      this._container.clearAndRender(this._table.render());
    }
    else
    {
      this._container.clearAndRender(
        ['div',
          ['p', "Yes indeed, time for a snapshot"], //TODO hmmm..
          'class', 'info-box'
        ]
      );
    }
   };

  this._on_snapshot_change = function(snapshot)
  {
    var i=1;
    this._content = snapshot.programs.map(function(program) {
      return {
        name: String(program),
        index: program.index,
      };
    });
  };

  this._on_table_click = function(evt, target)
  {
    var item_id = Number(target.get_attr("parent-node-chain", "data-object-id"));
    var snapshot =
      window['cst-selects']['snapshot-select'].get_selected_snapshot();
    var program = snapshot.programs[item_id];

    window.views.webgl_program_call.display_call(snapshot, -1, program);
  };

  this.tabledef = {
    handler: "webgl-program-table",
    column_order: ["program"],
    idgetter: function(res) { return String(res.index); },
    columns: {
      id: {
        label: "Program"
      },
      name: {
        label: "Name"
      }
    }
  };

  var eh = window.eventHandlers;
  eh.click["webgl-program-table"] = this._on_table_click.bind(this);

  messages.addListener('webgl-clear', clear.bind(this));

  this.init(id, name, container_class);
  this.init_events();
};

cls.WebGLProgramSideView.prototype = cls.WebGLSideView;

cls.WebGLProgramSideView.create_ui_widgets = function()
{
  cls.WebGLSideView.create_ui_widgets("program-side-panel");
};

