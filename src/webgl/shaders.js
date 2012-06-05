"use strict";

window.cls || (window.cls = {});

cls.WebGLShaders = function() 
{
  // Prepare for debugging of buffers
  this._load_shaders = function()
  {
    var scripts = document.getElementsByTagName("script");

    for (var i=0; i<scripts.length; i++)
    {
      var type = scripts[i].type.match(/vertex|fragment/);
      if (!type)
      {
        continue;
      }

      var shader = scripts[i].id;
      var src = scripts[i].src;

      var request = new XMLHttpRequest();
      request.open("GET", src, true);
      request.overrideMimeType('text/plain');
      request.onreadystatechange = (function()
      {
        if (request.status == 404)
        {
          opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
              "failed downloading shaders, 404 " + src + " not found");
        }
        else if (request.status == 200 && request.readyState == 4)
        {
          this.shaders[shader] = {"src": request.responseText, "type": type };
        }
      }).bind(this);
      request.send();
    }
  };

  this._load_shaders();
};
