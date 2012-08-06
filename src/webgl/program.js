"use strict";

window.cls || (window.cls = {});

cls.WebGLProgram = function ()
{

};

cls.WebGLProgram.prototype.toString = function()
{
  return "Program " + String(this.index);
};

