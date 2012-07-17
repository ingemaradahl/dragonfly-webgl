"use strict";

window.cls || (window.cls = {});

/**
 * @constructor
 */
cls.WebGLMeshDrawer = function(gl)
{
  this.gl = gl;
  this.program = null;
  this.mode = gl.TRIANGLES;
  this.ready = false;

  this.mouse = {x:0, y:0};
  this.prev_mouse = {x:0, y:0};
  this.rot = {x:0, y:0};
  this.zoom = -10;

  var on_mousemove = function(event)
  {
    this.prev_mouse.x = this.mouse.x;
    this.prev_mouse.y = this.mouse.y;
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    this.render();
  }.bind(this);

  var on_mouseup = function(evt, target)
  {
    document.removeEventListener('mousemove', on_mousemove, false);
    document.removeEventListener('mouseup', on_mouseup, false);
  }.bind(this);

  var on_mousedown = function(evt, target)
  {
    this.mouse.x = evt.clientX;
    this.mouse.y = evt.clientY;
    document.addEventListener('mousemove', on_mousemove, false);
    document.addEventListener('mouseup', on_mouseup, false);
  };

  var on_mousewheel = function(evt, target)
  {
    this.prev_mouse.x = this.mouse.x;
    this.prev_mouse.y = this.mouse.y;
    this.zoom *= 1-evt.wheelDelta / 400; // TODO 400 :S
    this.render();
  };

  var eh = window.eventHandlers;
  eh.mousedown["webgl-canvas"] = on_mousedown.bind(this);
  eh.mousewheel["webgl-canvas"] = on_mousewheel.bind(this);
};

cls.WebGLMeshDrawer.prototype.set_program = function(program)
{
  this.program = program;
};

cls.WebGLMeshDrawer.prototype.init_buffer = function(buffer)
{
  if (!buffer.gl_buffer)
  {
    if (buffer.data_is_loaded())
    {
      // Make sure there's no funky stuff going on
      var constructor;
      switch (buffer.constructor)
      {
        case "Float32Array":
        case "Uint8Array":
        case "Uint16Array":
        case "Uint32Array":
        case "Int8Array":
        case "Int16Array":
        case "Int32Array":
          constructor = eval(buffer.constructor);
          break;
        default:
          throw "Invalid constructor: " + buffer.constructor + " in init_buffer";
      }

      var gl = this.gl;
      buffer.gl_buffer = gl.createBuffer();
      buffer.data = new constructor(buffer.data);
      gl.bindBuffer(buffer.target, buffer.gl_buffer);
      gl.bufferData(buffer.target, buffer.data, gl.STATIC_DRAW);

      if (buffer.target === gl.ELEMENT_ARRAY_BUFFER)
      {
        buffer.type = constructor === Uint8Array 
          ? gl.UNSIGNED_BYTE
          : gl.UNSIGNED_SHORT;
      }
    }
    else
    {
      buffer.get_buffer_data();
      return false;
    }
  }

  return true;
};

cls.WebGLMeshDrawer.prototype.buffers_ready = function()
{
  return this.element_buffer 
    ? this.element_buffer.gl_buffer && this.buffer.gl_buffer
    : Boolean(this.buffer.gl_buffer);
};

cls.WebGLMeshDrawer.prototype.get_triangles = function()
{
  var state = this.state;
  var element_buffer = this.element_buffer;
  var indices;
  var start, end;
  var gl = this.gl;

  if (state.indexed)
  {
    indices = element_buffer.data;
    start = state.offset / (element_buffer.type === gl.UNSIGNED_SHORT
      ? 2
      : 1);
  }
  else
  {
    start = state.first;
  }

  end = start + state.count;

  var triangles = [];
  switch (state.mode)
  {
    case gl.TRIANGLES:
      if (state.indexed)
      {
        for (var i=start; i<end; i+=3)
        {
          triangles.push([indices[i], indices[i+1], indices[i+2]]);
        }
      }
      else
      {
        for(var i=start; i<end; i+=3)
        {
          triangles.push([n, n+1, n+2]);
        }
      }
      break;
    case gl.TRIANGLE_STRIP:
    case gl.TRIANGLE_FAN:
    default:
      break;
  }

  return triangles;
};

cls.WebGLMeshDrawer.prototype.get_buffer_data = function()
{
  var gl = this.gl;
  var stride = this.layout.stride;
  var offset = this.layout.offset;
  var type = this.layout.type;

  if (!stride)
  {
    switch (type)
    {
      case gl.BYTE:
      case gl.UNSIGNED_BYTE:
        stride = this.layout.size;
        break;
      case gl.SHORT:
      case gl.UNSIGNED_SHORT:
        stride = 2 * this.layout.size;
        break;
      case gl.FLOAT:
        stride = 4 * this.layout.size;
        break;
    }
  }

  var advance, start;
  switch (this.buffer.data.constructor)
  {
    case Float32Array:
    case Uint32Array:
    case Int32Array:
      advance = stride / 4;
      start = offset / 4;
      break;
    case Uint16Array:
    case Int16Array:
      advance = stride / 2;
      start = offset / 2;
      break;
    case Uint8Array:
    case Int8Array:
      advance = stride;
      start = offset;
      break;
  }

  // Trust that the JIT compiler inlines the vertex getter function
  var get_vertex;
  switch (this.layout.size)
  {
    case 1:
      get_vertex = function(d, i) { return [d[i], 0, 0, 0]; };
      break;
    case 2:
      get_vertex = function(d, i) { return [d[i], d[i+1], 0, 0]; };
      break;
    case 3:
      get_vertex = function(d, i) { return [d[i], d[i+1], d[i+2], 0]; };
      break;
    case 3:
      get_vertex = function(d, i) { return [d[i], d[i+1], d[i+2], d[i+3]]; };
      break;
  }

  var result = [];
  var d = this.buffer.data;
  for (var i=start; i<d.length; i+=advance)
  {
    // Should be inlined by the JITC!
    result.push(get_vertex(d, i));
  }

  return result;
};

cls.WebGLMeshDrawer.prototype.prepare_buffer = function()
{
  var gl = this.gl;
  var triangles = this.get_triangles();
  var buffer_data = this.get_buffer_data();

  var start = new Date();
  // Storing position, normal and wireframe data interleaved
  var vertex_data = new Float32Array(triangles.length * 3 * 3 * 4);
  var i=0;
  for (var t=0; t<triangles.length; t++)
  {
    // Vertex positions
    var p0 = buffer_data[triangles[t][0]];
    var p1 = buffer_data[triangles[t][1]];
    var p2 = buffer_data[triangles[t][2]];

    // Edges
    var v0 = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
    var v1 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
    var v2 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];

    // Find vector normal
    var cross_product = vec3.create()
    var normal = vec3.create();
    vec3.cross(v2, v1, cross_product);
    vec3.normalize(cross_product, normal);

    var area = vec3.length(cross_product) / 2;

    // Supply each vertex with it's normal and the other two vertices
    vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2];
    vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2];
    vertex_data[i++] = p2[0]; vertex_data[i++] = p2[1]; vertex_data[i++] = p2[2];
    vertex_data[i++] = normal[0]; vertex_data[i++] = normal[1]; vertex_data[i++] = normal[2];

    vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2];
    vertex_data[i++] = p2[0]; vertex_data[i++] = p2[1]; vertex_data[i++] = p2[2];
    vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2];
    vertex_data[i++] = normal[0]; vertex_data[i++] = normal[1]; vertex_data[i++] = normal[2];

    vertex_data[i++] = p2[0]; vertex_data[i++] = p2[1]; vertex_data[i++] = p2[2];
    vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2];
    vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2];
    vertex_data[i++] = normal[0]; vertex_data[i++] = normal[1]; vertex_data[i++] = normal[2];
  }
  var vertex_buffer = gl.createBuffer();
  vertex_buffer.count = triangles.length * 3;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertex_data, gl.STATIC_DRAW);

  var end = new Date();
  console.log("Buffer mekkamoj took " + (end-start)/1000 + "s");

  this._vertex_buffer = vertex_buffer;
  this.ready = true;
  this.render();
};


cls.WebGLMeshDrawer.prototype.set_attribute = function(attribute, state, element_buffer)
{
  this.buffer = attribute.buffer;
  this.init_buffer(this.buffer);
  this.layout = attribute.pointer.layout;
  this.element_buffer = element_buffer;
  this.state = state;

  this.rot = {x:0, y:0};
  this.zoom = -5;

  var element_ok;
  if (this.element_buffer)
  {
    element_ok = this.init_buffer(element_buffer);
  }

  if (!this.buffers_ready())
  {
    this._listener = cls.WebGLMeshDrawer.prototype.on_buffer_data.bind(this);
    messages.addListener('webgl-buffer-data', this._listener);
  }
  else 
  {
    this.prepare_buffer();
  }
};

cls.WebGLMeshDrawer.prototype.on_buffer_data = function(buffer)
{
  if (this.buffer === buffer || this.element_buffer === buffer)
  {
    this.init_buffer(buffer);
  }

  if (this.buffers_ready())
  {
    messages.removeListener('webgl-buffer-data', this._listener);
    this.prepare_buffer();
  }
};

cls.WebGLMeshDrawer.prototype.model_view_matrix = function()
{
  var mvMatrix = mat4.create();
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, [0.0, 0.0, this.zoom]);
  mat4.rotate(mvMatrix, this.deg_to_rad(this.rot.y), [1, 0, 0]);
  mat4.rotate(mvMatrix, this.deg_to_rad(this.rot.x), [0, 1, 0]);

  return mvMatrix;
};

cls.WebGLMeshDrawer.prototype.set_rotation = function()
{
  this.rot.x += this.mouse.x-this.prev_mouse.x;
  this.rot.y += this.mouse.y-this.prev_mouse.y;
}

cls.WebGLMeshDrawer.prototype.deg_to_rad = function(degrees)
{
  return degrees * Math.PI / 180;
};

cls.WebGLMeshDrawer.prototype.render = function(program)
{
  program = program || this.program;

  var gl = this.gl;

  var width = gl.canvas.width;
  var height = gl.canvas.height;

  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!this.buffers_ready() || !program)
    return;

  this.set_rotation();

  var pMatrix = mat4.create();
  mat4.perspective(45, width / height, 0.1, 100.0, pMatrix);
  var mvMatrix = this.model_view_matrix();

  gl.useProgram(program);

  gl.uniformMatrix4fv(program.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, this._vertex_buffer);
  var stride = 3*4*4; // 
  gl.vertexAttribPointer(program.positionAttrib, 3, gl.FLOAT, false, stride, 0);
  gl.vertexAttribPointer(program.vertex2Attrib, 3, gl.FLOAT, false, stride, 12);
  gl.vertexAttribPointer(program.vertex3Attrib, 3, gl.FLOAT, false, stride, 24);
  gl.vertexAttribPointer(program.normalAttrib, 3, gl.FLOAT, false, stride, 36);
  //gl.vertexAttribPointer(program.positionAttrib, this.layout.size, this.layout.type,
  //  this.layout.normalized, this.layout.stride, this.layout.offset);

  gl.drawArrays(gl.TRIANGLES, 0, this._vertex_buffer.count);

  // TODO cleanup, fix length
  //if (this.element_buffer)
  //{
  //  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.element_buffer.gl_buffer);
  //  gl.drawElements(this.state.mode, this.element_buffer.data.length, this.element_buffer.type, 0);
  //}
  //else
  //{
  //  gl.drawArrays(this.state.mode, 0, this.buffer.data.length/this.layout.size);
  //}
};

