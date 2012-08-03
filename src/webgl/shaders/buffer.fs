precision mediump float;

varying vec3 dist;
varying vec3 normal;

uniform bool uFrontFaceNormal = false;
uniform bool uBackFaceNormal = true;

const vec4 WIRE_COL = vec4(1.0,1.0,1.0,1);
const vec4 FILL_COL = vec4(0.0,0.0,0.0,1);

void main(void) {
  float d = min(dist[0],min(dist[1],dist[2]));
  float I = exp2(-2.0*d*d);
  if (gl_FrontFacing) {
    vec4 fill = uFrontFaceNormal ? vec4(abs(normal), 1.0) : FILL_COL;
    gl_FragColor = I*WIRE_COL + (1.0 - I) * fill;
  }
  else
  {
    vec4 fill = uBackFaceNormal ? vec4(abs(normal), 1.0) : FILL_COL;
    gl_FragColor = I*WIRE_COL + (1.0 - I) * fill;
  }
}
