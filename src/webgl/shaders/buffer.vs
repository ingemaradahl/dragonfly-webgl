attribute vec3 aVertexPosition;
attribute vec3 aVertex2Position;
attribute vec3 aVertex3Position;
attribute vec3 aVertexNormal;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec3 dist;

void main(void) {
  
  vec3 v = aVertex3Position - aVertex2Position;
  //vec3 v0 = aVertex3Position - aVertex2Position; // p2-p1;
  vec3 v1 = aVertex3Position - aVertexPosition; // p2-p0;
  vec3 v2 = aVertex2Position - aVertexPosition; // p1-p0;

  dist = abs(cross(v1, v2))/length(v);

  //dist = vec3(area/length(v0),0,0);
  //gl_Position = gl_PositionIn[0];
  //EmitVertex();
  //  
  //dist = vec3(0,area/length(v1),0);
  //gl_Position = gl_PositionIn[1];
  //EmitVertex();

  //dist = vec3(0,0,area/length(v2));
  //gl_Position = gl_PositionIn[2];
  //EmitVertex();

  //EndPrimitive();
  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
