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
    var canvas = document.getElementById("bbcanvas");
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
    setInitialParams();
    gl.clearColor(0.1, 0.1, 0.1, 1);
}

/**
 * Setup all the attribute and uniform variables
 */
function setUpAttributesAndUniforms() {
    "use strict";
    ctx.aVertexPositionId = gl.getAttribLocation(ctx.shaderProgram, "aVertexPosition");
    ctx.uColorId = gl.getUniformLocation(ctx.shaderProgram, "uColor");
    ctx.uProjectionMatId = gl.getUniformLocation(ctx.shaderProgram, "uProjectionMat");
    ctx.uModelMatId = gl.getUniformLocation(ctx.shaderProgram, "uModelMat");
}

/**
 * Setup the buffers to use. If more objects are needed this should be split in a file per object.
 */
function setUpBuffers() {
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
    mat3.fromScaling(projectionMat, [2.0 / gl.drawingBufferWidth, 2.0 / gl.drawingBufferHeight]);
    gl.uniformMatrix3fv(ctx.uProjectionMatId, false, projectionMat);
}

function drawAnimated(timeStamp) {
    update();
    draw();
    window.requestAnimationFrame(drawAnimated);
}

/**
 * Draw the scene.
 */
function draw() {
    "use strict";
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangleObject.buffer);
    gl.vertexAttribPointer(ctx.aVertexPositionId, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(ctx.aVertexPositionId);
    drawBricks();
    drawPaddel();
    drawBall();
}

var context = {
    init: true,
    paddelX: 0,
    paddelSize: [100.0, 10.0],
    paddelCol: [1, 1, 1],
    ball: [0, 0],
    ballSpeed: [6, 6],
    ballSize: [10.0, 10.0],
    ballCol: [1, 0, 0],
    brickHeight: 20,
    brickMinWidth: 80,
    brickMaxWidth: 150,
    brickLayers: 5,
    brickCols: [[0.83, 0.83, 0.83], [0, 1, 0], [1, 0, 0], [0, 0, 1]],
    brickSpeed: 0,
    brickDirection: 1, // -1 = left, 1 = right
    bricks: []
};

function update() {
    // move paddel left
    if (isDown(key.LEFT) && context.paddelX > (((gl.drawingBufferWidth / 2) - 50) * -1)) {
        context.paddelX -= 10.0
    }

    // move paddel right
    if (isDown(key.RIGHT) && context.paddelX < ((gl.drawingBufferWidth / 2) - 50)) {
        context.paddelX += 10.0
    }

    // restart game
    if (isDown(key.SPACE)) {
        setInitialParams();
    }

    // bounce top
    if (context.ball[1] > ((gl.drawingBufferHeight / 2) - 5)) {
        context.ballSpeed[1] = context.ballSpeed[1] * -1;
    }

    // ball touched bottom -> game over
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

    var ypos = ((gl.drawingBufferHeight / 2) - 25) * -1;
    if (!context.init && context.ball[1] > ypos - 5 && context.ball[1] < ypos + 5
        && context.ball[0] > context.paddelX - 50 && context.ball[0] < context.paddelX + 50) {
        context.ballSpeed[1] = context.ballSpeed[1] * -1;
    }

    context.init = false;

    // move ball
    context.ball[0] += context.ballSpeed[0];
    context.ball[1] += context.ballSpeed[1];
}

function drawRectangle(modelMatCallback, rgb) {
    var modelMat = modelMatCallback(mat3.create());
    gl.uniformMatrix3fv(ctx.uModelMatId, false, modelMat);
    gl.uniform4f(ctx.uColorId, rgb[0], rgb[1], rgb[2], 1);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function drawPaddel() {
    let vm = this;
    drawRectangle(function (modelMat) {
        var ypos = ((gl.drawingBufferHeight / 2) - 20) * -1;
        mat3.translate(modelMat, modelMat, [vm.context.paddelX, ypos]);
        return mat3.scale(modelMat, modelMat, vm.context.paddelSize);
    }, context.paddelCol);
}

function drawBall() {
    let vm = this;
    drawRectangle(function (modelMat) {
        mat3.translate(modelMat, modelMat, vm.context.ball);
        return mat3.scale(modelMat, modelMat, vm.context.ballSize);
    }, context.ballCol);
}

function drawBricks() {
    if(context.bricks.length === 0) {
        generateRandomBrickLayers();
    }
    let brickSpeed = Math.abs(context.brickSpeed);
    let brickDirection = context.brickDirection;
    if(brickSpeed > 0 && checkBricksOutsideViewport() === true) {
        console.log("All bricks out of viewport");
        for(let idxBrick = 0; idxBrick < context.bricks.length; idxBrick++) {
            let brick = context.bricks[idxBrick];
            let brickX = brick[0];
            brick.splice(0, 1, (brickX + (-2 * brickDirection * gl.drawingBufferWidth + (brickDirection * 15))));
            drawRectangle(function (modelMat) {
                mat3.translate(modelMat, modelMat, [brick[0], brick[2]]);
                return mat3.scale(modelMat, modelMat, [brick[1], context.brickHeight]);
            }, brick[3]);
        }
    } else {
        for(let idxBrick = 0; idxBrick < context.bricks.length; idxBrick++) {
            let brick = context.bricks[idxBrick];
            let brickX = brick[0];
            brick.splice(0, 1, (brickX + (brickSpeed * brickDirection)));
            drawRectangle(function (modelMat) {
                mat3.translate(modelMat, modelMat, [brick[0], brick[2]]);
                return mat3.scale(modelMat, modelMat, [brick[1], context.brickHeight]);
            }, brick[3]);
        }
    }
}

function setInitialParams() {
    context.init = true;
    context.paddelX = 0;
    var direction = Math.random() < 0.5 ? -1 : 1;
    var posOnPaddel = direction * (Math.random() * (context.paddelSize[0] / 2 - context.ballSize[0])).toFixed(1);
    context.ball = [posOnPaddel, ((gl.drawingBufferHeight / 2) - 25) * -1];
    context.ballSpeed = [direction * 6, 6];
    context.bricks = [];
}

function generateRandomBrickLayers() {
    var xSpacing = 10;
    var ySpacing = 5;
    var xEnd = (gl.drawingBufferWidth / 2) - 5;
    var yPos = (gl.drawingBufferHeight / 2) - ((context.brickLayers * context.brickHeight) + (context.brickLayers * ySpacing) + 2);
    for(var i = 0; i < context.brickLayers; i++) {
        var xStart = ((gl.drawingBufferWidth / 2) * -1) + 5;
        while(xStart < xEnd) {
            var brickWidth = (Math.random() * context.brickMaxWidth) + context.brickMinWidth;
            if((xStart + brickWidth) > xEnd) {
                brickWidth = xEnd - xStart;
                if(brickWidth < (context.brickMinWidth / 2)) {
                    break;
                }
            }
            var x0 = xStart + (brickWidth / 2);
            var x1 = xStart + brickWidth;
            var randColor = Math.random();
            var color = context.brickCols[0]; // most bricks are normal (grey: [0.83, 0.83, 0.83])
            if(randColor > 0.8) {
                color = context.brickCols[Math.floor(Math.random() * 3) + 1]; // few bricks are either red, green or blue
            }
            var brick = [x0, brickWidth, yPos, color];
            context.bricks.push(brick);
            xStart = x1 + xSpacing;
        }
        yPos += context.brickHeight + ySpacing;
    }
}

function checkBricksOutsideViewport() {
    let boundary = gl.drawingBufferWidth / 2;
    for(let idx = 0; idx < context.bricks.length; idx++) {
        let brick = context.bricks[idx];
        let brickX = brick[0];
        let brickWidth = brick[1];
        let brickLeftBound = brickX - (brickWidth / 2);
        let brickRightBound = brickX + (brickWidth / 2);
        if(((boundary * -1) < brickLeftBound && brickLeftBound < boundary)
                || ((boundary * -1) < brickRightBound && brickRightBound < boundary)) {
            return false;
        }
    }
    return true;
}

// Key Handling
var key = {
    _pressed: {},
    SPACE: 32,
    LEFT: 37,
    RIGHT: 39
};

function isDown(keyCode) {
    return key._pressed[keyCode];
}

function onKeydown(event) {
    key._pressed[event.keyCode] = true;
}

function onKeyup(event) {
    delete key._pressed[event.keyCode];
}
