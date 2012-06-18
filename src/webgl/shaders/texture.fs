varying highp vec2 uv;

uniform sampler2D tex;

void main(void) {
  gl_FragColor = texture2D(tex, uv);
}
