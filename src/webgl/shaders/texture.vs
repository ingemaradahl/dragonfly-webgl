attribute vec2 aVertexPosition;
attribute vec2 aTexturePosition;

varying highp vec2 uv;

void main(void) {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    uv = aTexturePosition;
}
