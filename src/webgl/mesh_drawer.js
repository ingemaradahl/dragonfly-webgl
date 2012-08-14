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

  this.mouse = {x:0, y:0};
  this.prev_mouse = {x:0, y:0};
  this.rot = {x:0, y:0};
  this.distance = 0;

  var container = new Container(document.createElement("container"));
  container.setup("webgl-mesh-drawer");
  var info_container = container.cell;

  this.add_canvas = function ()
  {
    var canvas_holder = document.getElementById("webgl-canvas-holder");
    canvas_holder.appendChild(window.webgl.gl.canvas);
    canvas_holder.appendChild(info_container);
  };

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
    evt.preventDefault();
    this.mouse.x = evt.clientX;
    this.mouse.y = evt.clientY;
    document.addEventListener('mousemove', on_mousemove, false);
    document.addEventListener('mouseup', on_mouseup, false);
  };

  var on_mousewheel = function(evt, target)
  {
    evt.preventDefault();
    this.prev_mouse.x = this.mouse.x;
    this.prev_mouse.y = this.mouse.y;
    this.distance *= 1-evt.wheelDelta / 400; // TODO 400 :S
    this.render();
  };

  var on_force_buffer = function()
  {
    this.init_buffer(true)
  };

  this.onresize = function()
  {
    var canvas = this.gl.canvas;
    var parent = canvas.parentElement;
    canvas.width  = parent.clientWidth;
    canvas.height = parent.clientHeight;

    this.prev_mouse.x = this.mouse.x;
    this.prev_mouse.y = this.mouse.y;

    this.gl.viewport(0, 0, canvas.width, canvas.height);
    this.render();
  };

  this.on_buffer_download = function()
  {
    info_container.clearAndRender(["div", "Downloading buffer data"]);
    info_container.style.visibility = "visible";
  };

  this.on_buffer_prepare = function()
  {
    info_container.clearAndRender(["div", "Preparing buffer data"]);
    info_container.style.visibility = "visible";
  };

  this.on_size_limit = function()
  {
    var buffer_size = Number(this.buffer.size / 1024).toFixed(2);
    var setting_size = window.settings['webgl-preview'].map['max_preview_size'];
    info_container.clearAndRender(window.templates.webgl.preview_disabled(buffer_size, setting_size));
    info_container.style.visibility = "visible";
  };

  this.disable_info_box = function()
  {
    info_container.style.visibility = "hidden";

  };

  var eh = window.eventHandlers;
  eh.mousedown["webgl-canvas"] = on_mousedown.bind(this);
  eh.mousewheel["webgl-canvas"] = on_mousewheel.bind(this);
  eh.click["webgl-force-buffer"] = on_force_buffer.bind(this);

  this.cache = new (function()
  {
    var MAX_SIZE = 5;
    var cache_arr = [];

    var equals = function (obj_a, obj_b)
    {
      for (var key in obj_a)
      {
        if (obj_a.hasOwnProperty(key) && obj_a[key] !== obj_b[key])
        {
          return false;
        }
      }
      return true;
    };

    this.post = function(gl_buffer, buffer, attribute, state, element_buffer)
    {
      cache_arr.push({
        buffer : buffer,
        attrib : attribute,
        state  : state,
        element_buffer : element_buffer,
        gl_buffer : gl_buffer
      });

      cache_arr.splice(0, cache_arr.length-MAX_SIZE)
    };

    this.lookup = function(buffer, attribute, state, element_buffer)
    {
      for (var i=0; i<cache_arr.length; i++)
      {
        var c = cache_arr[i];
        if (equals(c.attrib, attribute)
            && equals(c.state, state)
            && c.element_buffer === element_buffer
            && c.buffer === buffer)
        {
          if (i !== MAX_SIZE)
          {
            // Bubble up the accessed entry
            cache_arr.splice(i, 1);
            cache_arr.push(c);
          }
          return c.gl_buffer;
        }
      }

      return null;
    };
  })();

};

/* Checks whether the buffer data for the vertex buffer and, if it exists, the
 * index buffer, has been loaded from the host and constructed to an
 * ArrayBufferView */
cls.WebGLMeshDrawer.prototype.buffers_ready = function()
{
  return this.element_buffer
    ? !(this.element_buffer.data instanceof Array || this.element_buffer.data.downloading) && !(this.buffer.data instanceof Array || this.buffer.data.downloading)
    : !(this.buffer.data instanceof Array || this.buffer.data.downloading);
};

cls.WebGLMeshDrawer.prototype.buffers_loaded = function()
{
  return this.element_buffer
    ? this.buffer.data_is_loaded() && this.element_buffer.data_is_loaded()
    : this.buffer.data_is_loaded();
}

/**
 * Initiates the buffer to be drawn by reconstructing it using the original
 * constructor. Also makes sure that the buffer is being downloaded if it is not
 * present.
 * @param force {Boolean} optional If the buffer should be loaded even though it
 *  is larger than the maximum allowed preview size.
 */
cls.WebGLMeshDrawer.prototype.init_buffer = function(force)
{
  var build_buffer = function (buffer)
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

    if (buffer.data instanceof constructor)
    {
      return;
    }

    buffer.data = new constructor(buffer.data);

    if (buffer.target === this.gl.ELEMENT_ARRAY_BUFFER)
    {
      buffer.type = constructor === Uint8Array
        ? this.gl.UNSIGNED_BYTE
        : this.gl.UNSIGNED_SHORT;
    }
  }.bind(this);

  var prepare = function ()
  {
    build_buffer(this.buffer);
    if (this.element_buffer)
      build_buffer(this.element_buffer);

    this.prepare_buffer();
  }.bind(this);

  // max_size in bytes, settings value in kB
  var max_size = window.settings['webgl-preview'].map['max_preview_size'] * 1024;

  if (this.buffers_loaded())
  {
    prepare();
  }
  else if(this.buffer.size < max_size || force)
  {
    var listener = function(buffer)
    {
      if (this.buffers_loaded())
      {
        messages.removeListener('webgl-buffer-data', listener);
        prepare();
      }
    }.bind(this);

    messages.addListener('webgl-buffer-data', listener);
    this.on_buffer_download();

    if (!this.buffer.data_is_loaded())
    {
      this.buffer.request_data();
    }
    if (this.element_buffer && !this.element_buffer.data_is_loaded())
    {
      this.element_buffer.request_data();
    }
  }
  else
  {
    this.on_size_limit();

  }
};

cls.WebGLMeshDrawer.prototype.build_triangles = function()
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
          triangles.push([i, i+1, i+2]);
        }
      }
      break;
    case gl.TRIANGLE_STRIP:
      if (state.indexed)
      {
        for (var i=start; i<end; i++)
        {
          if (indices[i] === indices[i+1])
          {
            // Degenerate triangle
            continue;
          }

          if (i%2 === 0)
          {
            triangles.push([indices[i], indices[i+1], indices[i+2]]);
          }
          else
          {
            triangles.push([indices[i+2], indices[i+1], indices[i]]);
          }
        }
      }
      else
      {
        for (var i=start; i<end-2; i++)
        {
          if (i%2 === 0)
          {
            triangles.push([i, i+1, i+2]);
          }
          else
          {
            triangles.push([i+2, i+1, i]);
          }
        }
      }
      break;
    case gl.TRIANGLE_FAN:
      if (state.indexed)
      {
        triangles.push([indices[start], indices[start + 1], indices[start + 2]]);
        for (var i = start+2; i<end; i++)
        {
          triangles.push([indices[start], indices[i], indices[i+1]]);
        }
      }
      else
      {
        triangles.push([start, start+1, start+2]);
        for (var i=start+2; i<end; i++)
        {
          triangles.push([start, i, i+1]);
        }
      }
      break;
    default:
      break;
  }

  return triangles;
};

cls.WebGLMeshDrawer.prototype.build_lines = function()
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

  var lines = [];
  switch (state.mode)
  {
    case gl.LINES:
      if (state.indexed)
      {
        for (var i=start; i<end; i+=2)
        {
          lines.push([indices[i], indices[i+1]]);
        }
      }
      else
      {
        for(var i=start; i<end; i+=2)
        {
          lines.push([i, i+1]);
        }
      }
      break;
    case gl.LINE_STRIP:
      if (state.indexed)
      {
        for (var i=start; i<end-1; i++)
        {
          lines.push([indices[i], indices[i+1]]);
        }
      }
      else
      {
        for (var i=start; i<end-1; i++)
        {
          lines.push([i, i+1]);
        }
      }
      break;
    case gl.LINE_LOOP:
      if (state.indexed)
      {
        for (var i=start; i<end; i++)
        {
          if (i === end-1)
          {
            lines.push([indices[i], indices[start]]);
            break;
          }

          lines.push([indices[i], indices[i+1]]);
        }
      }
      else
      {
        for (var i=start; i<end; i++)
        {
          if (i === end-1)
          {
            lines.push([i, start]);
            break;
          }

          lines.push([i, i+1]);
        }
      }
      break;
    default:
      break;
  }

  return lines;
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
    case 4:
      get_vertex = function(d, i) { return [d[i], d[i+1], d[i+2], d[i+3]]; };
      break;
  }

  var result = [];
  var d = this.buffer.data;
  for (var i=start; i<d.length; i+=advance)
  {
    // get_vertex should be inlined by the JITC!
    result.push(get_vertex(d, i));
  }

  return result;
};

cls.WebGLMeshDrawer.prototype.prepare_buffer = function()
{
  var preview = this.cache.lookup(this.buffer, this.layout, this.state, this.element_buffer);
  if (!preview)
  {
    // Notify that data mangling starts
    this.on_buffer_prepare();

    var gl = this.gl;

    // Find the max extents of the model, defining an AABB
    var extent = {
      min_x: Infinity,
      max_x:-Infinity,
      min_y: Infinity,
      max_y:-Infinity,
      min_z: Infinity,
      max_z:-Infinity
    };

    var mode = this.state.mode;
    if (mode === gl.TRIANGLES || mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN)
    {
      var triangles = this.build_triangles();
      var buffer_data = this.get_buffer_data();

      // Storing position, normal and wireframe data interleaved
      var vertex_data = new Float32Array(triangles.length * 3 * 13*4);
      var i=0;

      /* A bit of explanation: Even though the draw call on the host succeeded
       * without errors, there's still the possibility that the buffer has
       * insufficient data w.r.t. to the 'count' argument used with drawArrays.
       * This can happen when two attributes are set, one with sufficient data
       * and one without. If we want to draw the attribute without all the data,
       * the number of triangles produced by build_triangles will be to great.
       * This is an unusual case, wich should explain the use of the try-catch
       * pattern
       */
      try {
        for (var t=0; t<triangles.length; t++)
        {
          // Vertex positions
          var p0 = buffer_data[triangles[t][0]];
          var p1 = buffer_data[triangles[t][1]];
          var p2 = buffer_data[triangles[t][2]];

          // Edges
          //var v0 = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
          var v1 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
          var v2 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];

          // Find vector normal
          var normal = vec3.create();
          vec3.cross(v2, v1, normal);
          vec3.normalize(normal);

          // Find bounding box
          extent.min_x = Math.min(extent.min_x, p0[0]);
          extent.max_x = Math.max(extent.max_x, p0[0]);
          extent.min_y = Math.min(extent.min_y, p0[1]);
          extent.max_y = Math.max(extent.max_y, p0[1]);
          extent.min_z = Math.min(extent.min_z, p0[2]);
          extent.max_z = Math.max(extent.max_z, p0[2]);

          // Supply each vertex with it's normal and the two other vertices
          // Also, append the index which to use on the distance vector in the shader
          vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2]; vertex_data[i++] = 0.0;
          vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2];
          vertex_data[i++] = p2[0]; vertex_data[i++] = p2[1]; vertex_data[i++] = p2[2];
          vertex_data[i++] = normal[0]; vertex_data[i++] = normal[1]; vertex_data[i++] = normal[2];

          vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2]; vertex_data[i++] = 1.0;
          vertex_data[i++] = p2[0]; vertex_data[i++] = p2[1]; vertex_data[i++] = p2[2];
          vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2];
          vertex_data[i++] = normal[0]; vertex_data[i++] = normal[1]; vertex_data[i++] = normal[2];

          vertex_data[i++] = p2[0]; vertex_data[i++] = p2[1]; vertex_data[i++] = p2[2]; vertex_data[i++] = 2.0;
          vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2];
          vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2];
          vertex_data[i++] = normal[0]; vertex_data[i++] = normal[1]; vertex_data[i++] = normal[2];
        }
      }
      catch (e)
      {
        // Make sure we don't issue incomplete triangles by truncating the
        // vertex_data array. Each vertex contains 13 indices in vertex_data,
        // and each triangle contains 3 vertices -> 3 * 13 == 39
        i--;
        if (i % 39) {
          i = i - i%39;
          vertex_data = vertex_data.subarray(0, i);
        }
      }

      var vertex_buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertex_data, gl.STATIC_DRAW);

      preview = {
        buffer : vertex_buffer,
        count : i / 13,
        mode : gl.TRIANGLES
      };
    }
    else // LINES || LINE_STRIP || LINE_LOOP
    {
      var lines = this.build_lines();
      var buffer_data = this.get_buffer_data();

      // Storing position in three dimensions with two vertices for each line
      var vertex_data = new Float32Array(lines.length * 3 * 2);
      var i=0;

      /* See corresponding notes for triangles above explaining the use of
       * try-catch here.
       */
      try
      {
        for (var t=0; t<lines.length; t++)
        {
          // Vertex positions
          var p0 = buffer_data[lines[t][0]];
          var p1 = buffer_data[lines[t][1]];

          // Find bounding box
          extent.min_x = Math.min(extent.min_x, p0[0]);
          extent.max_x = Math.max(extent.max_x, p0[0]);
          extent.min_y = Math.min(extent.min_y, p0[1]);
          extent.max_y = Math.max(extent.max_y, p0[1]);
          extent.min_z = Math.min(extent.min_z, p0[2]);
          extent.max_z = Math.max(extent.max_z, p0[2]);

          vertex_data[i++] = p0[0]; vertex_data[i++] = p0[1]; vertex_data[i++] = p0[2];
          vertex_data[i++] = p1[0]; vertex_data[i++] = p1[1]; vertex_data[i++] = p1[2];
        }
      }
      catch (e)
      {
        i--;
        if (i % 6) {
          i = i - i%6;
          vertex_data = vertex_data.subarray(0, i);
        }
      }

      var vertex_buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertex_data, gl.STATIC_DRAW);

      preview = {
        buffer : vertex_buffer,
        count : i/3,
        mode: gl.LINES
      };
    }

    // Figure out max distance from origo to bounding box corners
    var exts = [extent.min_x, extent.max_x, extent.min_y, extent.max_y, extent.min_z, extent.max_z];
    var max_extent = exts.reduce(function(p, c) { return Math.max(p, Math.abs(c)) }, 0);

    var center;
    if (((extent.min_x <= 0 && extent.max_x >= 0) || (extent.min_x === extent.max_x)) &&
        ((extent.min_y <= 0 && extent.max_y >= 0) || (extent.min_y === extent.max_y)) &&
        ((extent.min_z <= 0 && extent.max_z >= 0) || (extent.min_z === extent.min_z)))
    {
      // If origo is inside the bounding box, assume that the model is arranged
      // around it
      center = [0.0, 0.0, 0.0];
    }
    else
    {
      // Otherwise center the model around the middle of the binding box
      center = [
        extent.min_x + (extent.max_x-extent.min_x)/2,
        extent.min_y + (extent.max_y-extent.min_y)/2,
        extent.min_z + (extent.max_z-extent.min_z)/2,
      ];
    }

    preview.max_extent = max_extent;
    preview.center = center;

    this.cache.post(preview, this.buffer, this.layout, this.state, this.element_buffer);
  }

  this.preview = preview;

  this.distance = preview.max_extent * 2;
  this.zfar = Math.max(this.distance * 8, 500.0);

  this.disable_info_box();

  this.render();
};

cls.WebGLMeshDrawer.prototype.set_attribute = function(pointer, state, element_buffer, clear_rot)
{
  clear_rot = clear_rot === undefined ? true : clear_rot;
  this.element_buffer = element_buffer;
  this.buffer = pointer.buffer;
  this.layout = pointer.layout;
  this.state = state;

  this.init_buffer();

  if (clear_rot)
    this.rot = {x:0, y:0};

  // Refit the viewport to the canvas
  this.onresize();
};

cls.WebGLMeshDrawer.prototype.model_view_matrix = function()
{
  var mvMatrix = mat4.create();
  var c = this.preview.center;
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, [0.0, 0.0, -this.distance]);
  mat4.rotate(mvMatrix, this.deg_to_rad(this.rot.y), [1, 0, 0]);
  mat4.rotate(mvMatrix, this.deg_to_rad(this.rot.x), [0, 1, 0]);
  mat4.translate(mvMatrix, [-c[0], -c[1], -c[2]]);

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
  var gl = this.gl;

  var width = gl.canvas.width;
  var height = gl.canvas.height;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!this.preview)
    return;

  this.set_rotation();

  var pMatrix = mat4.create();
  mat4.perspective(45, width / height, 0.01, this.zfar, pMatrix);
  var mvMatrix = this.model_view_matrix();

  var program;
  switch(this.preview.mode)
  {
    case gl.TRIANGLES:
      program = gl.programs.buffer;
      break;
    case gl.LINES:
      program = gl.programs.lines;
      break;
  }
  if (this.program !== program)
  {
    gl.useProgram(program);
    this.program = program;
  }

  gl.uniformMatrix4fv(program.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.preview.buffer);

  if (this.preview.mode === gl.TRIANGLES)
  {
    gl.uniform2f(program.windowScaleUniform, width, height);
    gl.uniform1i(program.frontFaceUniform, window.settings["webgl-preview"].map["front-face-normal"]);
    gl.uniform1i(program.backFaceUniform, window.settings["webgl-preview"].map["back-face-normal"]);

    var stride = 52; // 4 Byte * (3*3 Float + 4 Float)
    gl.vertexAttribPointer(program.position0Attrib, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(program.position1Attrib, 3, gl.FLOAT, false, stride, 16);
    gl.vertexAttribPointer(program.position2Attrib, 3, gl.FLOAT, false, stride, 28);
    gl.vertexAttribPointer(program.normalAttrib, 3, gl.FLOAT, false, stride, 40);
  }
  else
  {
    gl.vertexAttribPointer(program.positionAttrib, 3, gl.FLOAT, false, 0, 0);
  }

  gl.drawArrays(this.preview.mode, 0, this.preview.count);

  /* TODO: Somehow, drawing lines with the lines program doesn't seem to
   * work. The code below is taken from a working example, where the
   * shader program is identical to the one used for drawing lines here.
   *
   * Try to get some help when Erik get's back..
   */
  //var shaderProgram = gl.programs.lines;
  //gl.useProgram(shaderProgram);
  //this.program = shaderProgram;

  //var lineVertexPositionBuffer = gl.createBuffer();
  //gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexPositionBuffer);
  //var vertices = [
  //  -1.0, 0.0, 0.0,
  //  1.0, 0.0, 0.0
  //];
  //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  //lineVertexPositionBuffer.itemSize = 3;
  //lineVertexPositionBuffer.numItems = 2;


  //mat4.identity(mvMatrix);

  //mat4.translate(mvMatrix, [0.0, 0.0, 7.0]);
  //gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexPositionBuffer);
  //gl.vertexAttribPointer(shaderProgram.positionAttrib, lineVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  //gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  //gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  //gl.drawArrays(gl.LINES, 0, lineVertexPositionBuffer.numItems);

};

