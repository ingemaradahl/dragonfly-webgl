﻿// Autogenerated by hob
window.cls || (window.cls = {});
cls.DocumentManager || (cls.DocumentManager = {});
cls.DocumentManager["1.0"] || (cls.DocumentManager["1.0"] = {});

cls.DocumentManager["1.0"].AboutToLoadDocument = function(arr)
{
  this.windowID = arr[0];
  this.frameID = arr[1];
  /**
    * The resource that is about to get loaded.
    */
  this.resourceID = arr[2];
  this.time = arr[3];
  /**
    * The parent document, present only if the frame is not the
    * top level frame.
    */
  this.parentDocumentID = arr[4];
  /**
    * The parent frame, present only if the frame is not the
    * top level frame.
    */
  this.parentFrameID = arr[5];
};

