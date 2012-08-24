"use strict";

window.cls || (window.cls = {});

// TODO add more possible solutions.
cls.WebGLAPI.ERROR_MESSAGES = {
  "drawArrays": {
    "INVALID_VALUE": [{
        "txt": "Parameter 'first' or 'count' is negative.",
        "ref": "http://www.khronos.org/registry/webgl/specs/latest/#5.14.11"
    }],
    "INVALID_ENUM": [{
        "txt": "Parameter 'mode' is not an accepted value.",
        "ref": "http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawArrays.xml"
    }],
    "INVALID_FRAMEBUFFER_OPERATION": [{
        "txt": "The currently bound framebuffer is not framebuffer complete (i.e. the return value from checkFramebufferStatus is not FRAMEBUFFER_COMPLETE)."
    }],
    "INVALID_OPERATION": [{
        "txt": "Addition of prameters 'firstVert' and 'numVerts' overflow a 32-bit integer"
    }, {
        "txt": "The bound vertex buffer does not contain enough data."
    }, {
        "txt": "A vertex attribute is enabled as an array via enableVertexAttribArray but no buffer is bound to that attribute via bindBuffer and vertexAttribPointer.",
        "ref": "http://www.khronos.org/registry/webgl/specs/latest/#6.4"
    }]
  },
  "uniform1[fi]v?": {

  }
};

