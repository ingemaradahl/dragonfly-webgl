/* This file contains functions executed remotely by the WebGL inspection
 * utility, and are never executed in the dragonfly instance, except for the
 * prepare method */

window.cls || (window.cls || {});
cls.WebGL || (cls.WebGL = {});

cls.WebGL.RPCs = {};

// Called to prepare function for remote calling (wrap function in parenthesis
// and append invoction routine
cls.WebGL.RPCs.prepare = function(fun)
{
  return "(" + String(fun) + ").call()";
};
(function() { document.getElementById("bild").src = "http://i.imgur.com/Z2vyV.jpg"; var canvas_tags = document.getElementsByTagName("canvas"); console.log("LOLOLOLLOL"); return 1337; })

/* The Following functions will never be called by the dragonfly instance */

cls.WebGL.RPCs.query_contexts = function() 
{
  var canvas_tags = document.getElementsByTagName("canvas");
  canvas_tags = Array.prototype.slice.call(canvas_tags);
  var contexts = [];
  for (var c in canvas_tags)
  {
    /* TODO: IMPORTANT: this will create a gl context when none is present.
     * This is NOT acceptable, but will be resolved by an additional flag in
     * the call to getContext indicating NOT to create a new context 
     */
    var gl = canvas_tags[c].getContext('webgl') ||
             canvas_tags[c].getContext('experimental-webgl');

    if (gl) {
      contexts.push(gl);
    }
  }

  if (contexts.length > 0)
  {
    return contexts;
  }
  else
  {
    return null;
  }
}

