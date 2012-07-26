varying highp vec2 uv;

uniform sampler2D uTexture;

void main(void) {
  gl_FragColor = texture2D(uTexture, uv);
}
