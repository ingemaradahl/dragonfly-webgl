precision mediump float;

varying vec3 dist;

const vec4 WIRE_COL = vec4(1.0,1.0,1.0,1);
const vec4 FILL_COL = vec4(0.0,0.0,0.0,1);

void main(void) {
  float d = min(dist[0],min(dist[1],dist[2]));
  float I = exp2(-2.0*d*d);
  if (gl_FrontFacing) {
 	gl_FragColor = I*WIRE_COL + (1.0 - I)*FILL_COL;
  }
  else
  {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
}
