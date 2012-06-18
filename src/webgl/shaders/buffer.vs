attribute vec3 aVertexPosition;
attribute vec2 aTexturePosition;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec2 uv;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    uv = aTexturePosition;

    //vec3 transformedNormal = uNMatrix * aVertexNormal;
    //float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);
    //vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;
}
