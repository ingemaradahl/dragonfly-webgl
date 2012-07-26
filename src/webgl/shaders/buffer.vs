attribute vec4 aVertex0Position;
attribute vec3 aVertex1Position;
attribute vec3 aVertex2Position;
attribute vec3 aVertexNormal;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform vec2 uWindowScale;

varying vec3 dist;
varying vec3 normal;

void main(void) {
  // Distance index stored with vertex position
  int idx = int(aVertex0Position.w);

  mat4 mvpMatrix = uPMatrix * uMVMatrix;
  
  vec4 p_p0 = mvpMatrix * vec4(aVertex0Position.xyz, 1.0);
  vec4 p_p1 = mvpMatrix * vec4(aVertex1Position, 1.0);
  vec4 p_p2 = mvpMatrix * vec4(aVertex2Position, 1.0);

  vec2 p0 = uWindowScale * p_p0.xy/p_p0.w;
  vec2 p1 = uWindowScale * p_p1.xy/p_p1.w;
  vec2 p2 = uWindowScale * p_p2.xy/p_p2.w;

  vec2 v0 = p2 - p1;
  vec2 v1 = p2 - p0;
  vec2 v2 = p1 - p0;

  float area = abs(v1.x*v2.y - v1.y * v2.x);

  gl_Position = p_p0;

  dist = vec3(0.0, 0.0, 0.0);
  dist[idx] = area/length(v0);

  normal = aVertexNormal;
}
