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
    paddelYMargin: 20,
    paddelSize: [100.0, 10.0],
    paddelCol: [1, 1, 1],
    ball: [0, 0],
    ballSpeed: [6, 6],
    ballSpeedInit: [6, 6],
    ballSize: [10.0, 10.0],
    ballCol: [1, 0, 0],
    brickHeight: 20,
    brickMinWidth: 80,
    brickMaxWidth: 150,
    brickLayers: 5,
    brickCols: [[0.83, 0.83, 0.83], [0, 1, 0], [1, 0, 0], [0, 0, 1]],
    brickSpeed: 0, // set to > 0 to move the bricks
    brickDirection: 1, // -1 = left, 1 = right
    bricks: [],
    score: 0,
    level: 0,

};

function update() {
    let bufferWidthHalf = gl.drawingBufferWidth / 2;
    let bufferHeightHalf = gl.drawingBufferHeight / 2;
    let xPosBall = context.ball[0];
    let yPosBall = context.ball[1];
    let xMarginBall = context.ballSize[0] / 2;
    let yMarginBall = context.ballSize[1] / 2;
    let xPosPaddel = context.paddelX;
    let xPaddelSizeHalf = context.paddelSize[0] / 2;

    // move paddel left
    if (isDown(key.LEFT) && xPosPaddel > ((bufferWidthHalf - xPaddelSizeHalf) * -1)) {
        context.paddelX -= 10.0
    }

    // move paddel right
    if (isDown(key.RIGHT) && xPosPaddel < (bufferWidthHalf - xPaddelSizeHalf)) {
        context.paddelX += 10.0
    }

    // restart game
    if (isDown(key.SPACE)) {
        setInitialParams();
    }

    // bounce top
    if (yPosBall > (bufferHeightHalf - yMarginBall)) {
        context.ballSpeed[1] = context.ballSpeed[1] * -1;
    }

    // ball touched bottom -> game over
    if (yPosBall < -1 * (bufferHeightHalf - yMarginBall)) {
        context.ballSpeed = [0, 0]
    }

    // bounce left
    if (xPosBall < -1 * (bufferWidthHalf - xMarginBall)) {
        context.ballSpeed[0] = context.ballSpeed[0] * -1;
    }

    // bounce right
    if (xPosBall > (bufferWidthHalf - xMarginBall)) {
        context.ballSpeed[0] = context.ballSpeed[0] * -1;
    }

    // collision detection: paddel
    let yPosPaddel = (bufferHeightHalf - (context.paddelYMargin + yMarginBall)) * -1;
    if (!context.init
        && yPosBall > (yPosPaddel - yMarginBall) && yPosBall < (yPosPaddel + yMarginBall)
        && xPosBall > (xPosPaddel - xPaddelSizeHalf) && xPosBall < (xPosPaddel + xPaddelSizeHalf)) {

        relativePos = ((xPosBall+250)/5 - (xPosPaddel+250)/5) / 10;
        console.log(relativePos);


        /*
        if(relativePos > 0){
            context.ballSpeed[1] = context.ballSpeed[1] * - (1+relativePos) ;
            context.ballSpeed[0] = context.ballSpeed[0] * (1-relativePos);
        }
        */

        //y
        context.ballSpeed[1] = context.ballSpeed[1] * -1;
    }

    // collision detection: bricks
    let idxToRemove = -1;


    for(let idxBrick = 0; idxBrick < context.bricks.length; idxBrick++) {
        let brick = context.bricks[idxBrick];
        let brickWidth = brick[1];
        let xBrickLeft = brick[0] - (brickWidth / 2);
        let xBrickRight = brick[0] + (brickWidth / 2);
        let yBrickUpper = brick[2];
        let yBrickLower = yBrickUpper + context.brickHeight;

        // collision top
        if (yPosBall < (yBrickUpper + yMarginBall) && yPosBall > (yBrickUpper - yMarginBall)
            && xPosBall > xBrickLeft && xPosBall < xBrickRight) {
            context.ballSpeed[1] = context.ballSpeed[1] * -1;
            idxToRemove = idxBrick;
            break;
        }

        // collision bottom
        if (yPosBall < (yBrickLower + yMarginBall) && yPosBall > (yBrickLower - yMarginBall)
            && xPosBall > xBrickLeft && xPosBall < xBrickRight) {
            context.ballSpeed[1] = context.ballSpeed[1] * -1;
            idxToRemove = idxBrick;
            break;
        }

        // collision left
        if (xPosBall > (xBrickLeft - xMarginBall) && xPosBall < (xBrickLeft + xMarginBall)
            && yPosBall > yBrickLower && yPosBall < yBrickUpper) {
            context.ballSpeed[0] = context.ballSpeed[0] * -1;
            idxToRemove = idxBrick;
            break;
        }

        // collision right
        if (xPosBall < (xBrickRight + xMarginBall) && xPosBall > (xBrickRight - xMarginBall)
            && yPosBall > yBrickLower && yPosBall < yBrickUpper) {
            context.ballSpeed[0] = context.ballSpeed[0] * -1;
            idxToRemove = idxBrick;
            break;
        }


    }


    if(idxToRemove !== -1) {
        context.score += 1;
        context.bricks.splice(idxToRemove, 1);
        document.getElementById("score").textContent = "Score: " + context.score;
    }

    // initial update done
    context.init = false;

    // move ball
    context.ball[0] += context.ballSpeed[0];
    context.ball[1] += context.ballSpeed[1];
}

function nextLevel() {
    context.level += 1;
    // context.ballSpeed[0] += 2;
    //context.ballSpeed[1] += 2;

    document.getElementById("level").textContent = "Level: " + context.level;
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
        var ypos = ((gl.drawingBufferHeight / 2) - context.paddelYMargin) * -1;
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
        nextLevel();
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
    context.score = 0;
    context.level = 0;
    document.getElementById("score").textContent = "Score: 0";
    document.getElementById("level").textContent = "Level: 1";
    context.paddelX = 0;
    var direction = Math.random() < 0.5 ? -1 : 1;
    var posOnPaddel = direction * (Math.random() * (context.paddelSize[0] / 2 - context.ballSize[0])).toFixed(1);
    context.ball = [posOnPaddel, ((gl.drawingBufferHeight / 2) - (context.paddelYMargin + context.ballSize[1] / 2)) * -1];
    context.ballSpeed = [direction * context.ballSpeedInit[0], context.ballSpeedInit[1]];
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
