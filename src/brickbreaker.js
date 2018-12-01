
// Register function to call after document has loaded
window.onload = startup;

// the gl object is saved globally
var gl;

// we keep all local parameters for the program in a single object
var ctx = {
    shaderProgram: -1,
    aVertexPositionId: -1,
    uColorId: -1,
    uProjectionMatId: -1,
    uModelMatId: -1
};

// we keep all the parameters for drawing a specific object together
var rectangleObject = {
    buffer: -1
};

/**
 * Startup function to be called when the body is loaded
 */
function startup() {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    gl = createGLContext(canvas);
    initGL();
    window.addEventListener('keyup', onKeyup, false);
    window.addEventListener('keydown', onKeydown, false);
    drawAnimated();
}

/**
 * InitGL should contain the functionality that needs to be executed only once
 */
function initGL() {
    "use strict";
    ctx.shaderProgram = loadAndCompileShaders(gl, 'VertexShader.glsl', 'FragmentShader.glsl');
    setUpAttributesAndUniforms();
    setUpBuffers();
    
    gl.clearColor(0.1, 0.1, 0.1, 1);
}

/**
 * Setup all the attribute and uniform variables
 */
function setUpAttributesAndUniforms(){
    "use strict";
    ctx.aVertexPositionId = gl.getAttribLocation(ctx.shaderProgram, "aVertexPosition");
    ctx.uColorId = gl.getUniformLocation(ctx.shaderProgram, "uColor");
    ctx.uProjectionMatId = gl.getUniformLocation(ctx.shaderProgram, "uProjectionMat");
    ctx.uModelMatId = gl.getUniformLocation(ctx.shaderProgram, "uModelMat");
}

/**
 * Setup the buffers to use. If more objects are needed this should be split in a file per object.
 */
function setUpBuffers(){
    "use strict";
    rectangleObject.buffer = gl.createBuffer();
    var vertices = [
        -0.5, -0.5,
        0.5, -0.5,
        0.5, 0.5,
        -0.5, 0.5];

    gl.bindBuffer(gl.ARRAY_BUFFER, rectangleObject.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var projectionMat = mat3.create();
    mat3.fromScaling(projectionMat, [2.0 / gl.drawingBufferWidth , 2.0 / gl.drawingBufferHeight]) ;
    gl.uniformMatrix3fv(ctx.uProjectionMatId, false, projectionMat);
}

function drawAnimated(timeStamp) {
    // calculate time since last call
    // move or change objects

    update();

    draw();
    
    // request the next frame
    window.requestAnimationFrame(drawAnimated) ;
}

/**
 * Draw the scene.
 */
function draw() {
    "use strict";
    console.log("Drawing");
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, rectangleObject.buffer);
    gl.vertexAttribPointer(ctx.aVertexPositionId, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(ctx.aVertexPositionId);

    drawPaddel();
    drawBall();
}
var context = {
    paddelX: 0,
    ball: [0, 0],
    ballSpeed: [6, 6]
};

function update() {
    // move paddle 2 up
    if (isDown(key.LEFT) && context.paddelX > (((gl.drawingBufferWidth / 2) - 20)* -1)) {
        context.paddelX -= 10.0
    }

    // move paddle 2 up
    if (isDown() && context.paddelX > (((gl.drawingBufferWidth / 2) - 20)* -1)) {
        context.paddelX -= 10.0
    }

    // move paddle 2 down
    if (isDown(key.RIGHT) && context.paddelX < ((gl.drawingBufferWidth / 2) - 20)) {
        context.paddelX += 10.0
    }

    if (isDown(key.SPACE)) {
        context.ball = [0, 0]
        context.ballSpeed = [6, 6]
    }

    // bounce top
    if (context.ball[1] > ((gl.drawingBufferHeight / 2) - 5)) {
        context.ballSpeed[1] = context.ballSpeed[1] * -1;
    }
    
    // bounce bottom
    if (context.ball[1] < -1 * ((gl.drawingBufferHeight / 2) - 5)) {
        context.ballSpeed = [0, 0]
    }

    // right out of field
    if (context.ball[0] < -1 * ((gl.drawingBufferWidth / 2) - 5)) {
        context.ballSpeed[0] = context.ballSpeed[0] * -1;
    }

    // left out of field
    if (context.ball[0] > ((gl.drawingBufferWidth / 2) - 5)) {
        context.ballSpeed[0] = context.ballSpeed[0] * -1;
    }
    
    var ypos = ((gl.drawingBufferHeight /2) - 20) * -1;
    if (context.ball[1] > ypos - 5 && context.ball[1] < ypos + 5
        && context.ball[0] > context.paddelX - 50 && context.ball[0] < context.paddelX + 50) {
        context.ballSpeed[1] = context.ballSpeed[1] * -1;
    }

    // move ball
    context.ball[0] += context.ballSpeed[0];
    context.ball[1] += context.ballSpeed[1];
}

function drawRectangle(modelMatCallback) {
    var modelMat = modelMatCallback(mat3.create());
    gl.uniformMatrix3fv(ctx.uModelMatId, false, modelMat);
    gl.uniform4f(ctx.uColorId, 1, 1, 1, 1);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function drawPaddel() {
    let vm = this;
    drawRectangle(function (modelMat) {
        var ypos = ((gl.drawingBufferHeight /2) - 20) * -1;
        mat3.translate(modelMat, modelMat, [vm.context.paddelX, ypos]);
        return mat3.scale(modelMat, modelMat, [100.0, 10.0]);
    });
}

function drawBall() {
    let vm = this;
    drawRectangle(function (modelMat) {
        mat3.translate(modelMat, modelMat, vm.context.ball);
        return mat3.scale(modelMat, modelMat, [10.0, 10.0]);
    });
}

// Key Handling
var key = {
    _pressed: {},
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
};

function isDown (keyCode) {
    return key._pressed[keyCode];
}

function onKeydown(event) {
    key._pressed[event.keyCode] = true;
}

function onKeyup(event) {
    delete key._pressed[event.keyCode];
}
