﻿/**
 * @fileoverview
 * Dictionaries of JavaScript keywords and builtins. Used by the JavaScript
 * formatter for syntax highlighting.
 */

var JSSyntax = function()
{
};

JSSyntax.is_valid_identifier = function(prop)
{
  // This doesn't cover every allowed character, but should be fine most of the time
  return (/^[a-z$_][a-z$_0-9]*$/i.test(prop) && !js_keywords.hasOwnProperty(prop));
}

// TODO: make these static on JSSyntax
var js_keywords=
{
  'abstract': 1,
  'boolean': 1,
  'break': 1,
  'byte': 1,
  'case': 1,
  'catch': 1,
  'char': 1,
  'class': 1,
  'const': 1,
  'continue': 1,
  'debugger': 1,
  'default': 1,
  'delete': 1,
  'do': 1,
  'double': 1,
  'else': 1,
  'enum': 1,
  'export': 1,
  'extends': 1,
  'false': 1,
  'final': 1,
  'finally': 1,
  'float': 1,
  'for': 1,
  'function': 1,
  'goto': 1,
  'if': 1,
  'implements': 1,
  'import': 1,
  'in': 1,
  'instanceof': 1,
  'int': 1,
  'interface': 1,
  'let': 1,
  'long': 1,
  'native': 1,
  'new': 1,
  'null': 1,
  'package': 1,
  'private': 1,
  'protected': 1,
  'public': 1,
  'return': 1,
  'short': 1,
  'static': 1,
  'super': 1,
  'switch': 1,
  'synchronized': 1,
  'this': 1,
  'throw': 1,
  'throws': 1,
  'transient': 1,
  'true': 1,
  'try': 1,
  'typeof': 1,
  'var': 1,
  'void': 1,
  'while': 1,
  'with': 1,
  'yield': 1
}

var js_builtins=
{
  'Anchor': 1,
  'anchors': 1,
  'Applet': 1,
  'applets': 1,
  'Area': 1,
  'Array': 1,
  'Button': 1,
  'Checkbox': 1,
  'Date': 1,
  'document': 1,
  'FileUpload': 1,
  'Form': 1,
  'forms': 1,
  'Frame': 1,
  'frames': 1,
  'Hidden': 1,
  'history': 1,
  'Image': 1,
  'images': 1,
  'Link': 1,
  'links': 1,
  'Area': 1,
  'location': 1,
  'Math': 1,
  'MimeType': 1,
  'mimeTypes': 1,
  'navigator': 1,
  'options': 1,
  'Password': 1,
  'Plugin': 1,
  'plugins': 1,
  'Radio': 1,
  'Reset': 1,
  'Select': 1,
  'String': 1,
  'Submit': 1,
  'Text': 1,
  'Textarea': 1,
  'window': 1
};


