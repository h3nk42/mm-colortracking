let cam

// CONFIG
const THRESHOLD = 15;

//GLOBAL
let IS_FIRST_LOOP = true;
let IGNORED_COLOR =  {r: 0, g: 0, b: 0};
let CURRENT_SQUARE_COLORS = [undefined, undefined, undefined];//{r:number, g: number, b: number}[3]
const CURRENT_SQUARECOLOR_COORDS = [undefined, undefined, undefined];//{x:number, y:number}[3]

const DRAWINGPLANE_X_BEGIN = 641;

// TIMESTAMPS
let TIMESTAMP_0 = 0;

function setup() {
    createCanvas(640*2, 400);
    leftBuffer = createGraphics(640, 400);
    rightBuffer = createGraphics(640, 400);

    cam = createCapture(VIDEO);

    cam.hide();
}

function draw() {

    // Draw on your buffers however you like
    drawLeftBuffer();
    drawRightBuffer();
    // Paint the off-screen buffers onto the main canvas
    image(leftBuffer, 0, 0);
    image(rightBuffer, 640, 0);
}

function drawRightBuffer() {
    noFill();
    rect (DRAWINGPLANE_X_BEGIN, 1, 205, 100);
    // DRAW TRACKED COLORS
    noStroke();
    CURRENT_SQUARECOLOR_COORDS.map((coords,i) => {
        colorToDraw = CURRENT_SQUARE_COLORS[i];
        if(coords !== undefined && colorToDraw !== undefined) {
            pinsel_1(coords, colorToDraw);
        }
    })

}



function drawLeftBuffer() {
    drawCamAndRects();
    //setIgnoredColor();
    cam.loadPixels();

    timeout_0(1250, () => {
        console.log(' ');
        console.log('--     --      -- ');
        console.log(' ');

        if(IS_FIRST_LOOP) {
            const colorsInSquares = getColorsFromAllSquares();
            setIgnoredColor(colorsInSquares);
            IS_FIRST_LOOP = false;
        } else {
            const currentColors = getColorsFromAllSquares();
            for(let i =0; i<3; i++) {
                if (checkIsColor(currentColors[i], IGNORED_COLOR, THRESHOLD + 15)) {
                    console.log('square ' + i + ' is ignored');
                }
                else {
                    console.log('square ' + i + ' is ');
                    CURRENT_SQUARE_COLORS[i] = currentColors[i];
                    console.log( CURRENT_SQUARE_COLORS[i]);
                }
            }
        }
    });

    CURRENT_SQUARE_COLORS.map((squareColor,i) => {
        if (squareColor !== undefined) {
            const coords = calcAverageCoordsForSquareColor(squareColor);
            CURRENT_SQUARECOLOR_COORDS[i] = coords;
        }
    })

}

// @colorsInSquares: {r:number, g: number, b:number}[3]
function setIgnoredColor(colorsInSquares) {
    const rToIgnore = (colorsInSquares[0].r + colorsInSquares[1].r + colorsInSquares[2].r)/3;
    const gToIgnore = (colorsInSquares[0].g + colorsInSquares[1].g + colorsInSquares[2].g)/3;
    const bToIgnore = (colorsInSquares[0].b + colorsInSquares[1].b + colorsInSquares[2].b)/3;
    IGNORED_COLOR.r = rToIgnore
    IGNORED_COLOR.g = gToIgnore
    IGNORED_COLOR.b = bToIgnore
}

// @timeoutInMs: number
// @functionToExecute: () => any
function timeout_0(timeoutInMS, functionToExecute) {
    if( millis() - TIMESTAMP_0 > timeoutInMS) {
        functionToExecute();
        TIMESTAMP_0 = millis();
    }
}

// @returns: {r:number, g: number, b:number}[3]
function getColorsFromAllSquares(){
    const squares = [];
    for(let squareIndex = 0; squareIndex<3; squareIndex++) {
        squares.push(getAverageColorFromSquare(squareIndex, THRESHOLD));
    }
    return squares;
}

// @squareIndex: number
// @threshhold: number
// returns: {r:number, g:number, b:number}
function getAverageColorFromSquare(squareIndex, threshhold) {

    const squareMatrix = {};
    let average = {r: 0, g:0, b: 0};
    let averageCounter = 0;

    // square 1 (10,10) - (65,65)
    // square 2 (75, 10) - (130, 65)
    // square 3 (140, 10) - (195, 65)


    let i = 0;
    for(y = 10 ; y < 65; y ++) {
        for(x = 10 + (squareIndex * 65); x < 65 + (squareIndex * 65); x ++) {
            const currentColor = get(x,y);
            const currentColorAsObj = {r: currentColor[0], g: currentColor[1], b: currentColor[2] }
            //const colorIsIgnored = checkIsColor(currentColorAsObj, ignoredColor, threshhold);
            //currentColorAsObj.isIgnored = colorIsIgnored;
            if(squareMatrix[i] != undefined) {
                squareMatrix[i].push(currentColorAsObj);
            } else {
                squareMatrix[i] = [];
                squareMatrix[i].push(currentColorAsObj);
            }
            average.r += currentColorAsObj.r;
            average.g += currentColorAsObj.g;
            average.b += currentColorAsObj.b;
            averageCounter++;
        }
        i++;
    }

    average.r /= averageCounter;
    average.g /= averageCounter;
    average.b /= averageCounter;

    return average;
}

// @squareColor: {r:number, g: number, b:number}
// returns: {x: number, y: number};
function calcAverageCoordsForSquareColor(squareColor){
    let closestX = 0;
    let closestY = 0;
    let count = 0;
    let avgX = 0;
    let avgY = 0;

    for (let x = 0; x < cam.width; x += 3) {
        for (let y = 0; y < cam.height; y += 3) {
            if(x<205 && y < 100) { continue;}

            let index = (x + (y * cam.width)) * 4;
            let r = cam.pixels[index + 0];
            let g = cam.pixels[index + 1];
            let b = cam.pixels[index + 2];
            let distance = dist(r, g, b, squareColor.r, squareColor.g, squareColor.b);
            if (distance < THRESHOLD) {
                avgX += x;
                avgY += y;
                count += 1;
            }
        }
    }

    // Draw a circle at the tracked pixel
    //invert the x value because we mirrored the cam
    avgX = cam.width - avgX/count
    avgY = avgY/count

    fill(squareColor.r, squareColor.g, squareColor.b);
    ellipse(avgX, avgY, 16, 16);

    return count > 0 ? {x: avgX, y: avgY} : undefined
}

function drawCamAndRects(){
    stroke(0);

    // mirror and draw cam
    push();
    scale(-1,1);
    image(cam,-width/2,0);
    pop();

    // draw squares to track colors from
    noFill();
    rect(10,10,55,55);
    rect(10 + 55 + 10 ,10,55,55);
    rect(10 + ( 55 + 10) *2 , 10,55,55);
    // pixels in this rect are getting ignored for drawing
    rect (1, 1, 205, 100);

    CURRENT_SQUARE_COLORS.map((squareColor, i) => {
        if(squareColor !== undefined) {
            fill(squareColor.r, squareColor.g, squareColor.b);
            rect(10 + (55 + 10) *i ,65  ,55,20);
        }
    })
    fill(IGNORED_COLOR.r, IGNORED_COLOR.g, IGNORED_COLOR.b);
    rect(1,85 ,205,15);
    noFill();
}

function checkIsColor(colorToBeChecked, colorWanted, threshhold) {
    const checkR = colorToBeChecked.r >= colorWanted.r - threshhold && colorToBeChecked.r <= colorWanted.r + threshhold;
    const checkG = colorToBeChecked.g >= colorWanted.g - threshhold && colorToBeChecked.g <= colorWanted.g + threshhold;
    const checkB = colorToBeChecked.b >= colorWanted.b - threshhold && colorToBeChecked.b <= colorWanted.b + threshhold;
    return (checkR && checkG && checkB);
}


// @coords: {x: num, y: num}
// @color: {r:num, g:num, b: num}
function pinsel_1(coords, color) {
    fill(color.r, color.g, color.b, 100);
    ellipse(coords.x + DRAWINGPLANE_X_BEGIN , coords.y, 50, 50);
}
