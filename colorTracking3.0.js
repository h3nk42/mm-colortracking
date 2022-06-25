// CONFIG
const THRESHOLD = 15;

//GLOBAL VARIABLES
let IS_FIRST_LOOP = true;
let IGNORED_COLOR = { r: 0, g: 0, b: 0 };
let CURRENT_SQUARE_COLORS = [undefined, undefined, undefined]; //{r:number, g: number, b: number}[3]
const CURRENT_SQUARECOLOR_COORDS = [undefined, undefined, undefined]; //{x:number, y:number, pixelAmount: number}[3]
let PINSEL_STATE = 0;
let CAM;

// TIMESTAMPS
let TIMESTAMP_0 = 0;

//CONSTANTS
const DRAWINGPLANE_X_BEGIN = 641;


function setup() {
  createCanvas(640 * 2, 400);
  
  leftBuffer = createGraphics(640, 400);
  rightBuffer = createGraphics(640, 400);

  CAM = createCapture(VIDEO);
  CAM.hide();
}

function draw() {
  drawLeftBuffer();
  drawRightBuffer();
  
  image(leftBuffer, 0, 0);
  image(rightBuffer, 640, 0);
}

function drawRightBuffer() {
  noFill();
  rect(DRAWINGPLANE_X_BEGIN, 1, 205, 100);
  // DRAW TRACKED COLORS
  noStroke();
  CURRENT_SQUARECOLOR_COORDS.map((coords, i) => {
    colorToDraw = CURRENT_SQUARE_COLORS[i];
    if (coords !== undefined && colorToDraw !== undefined) {
      switch (PINSEL_STATE) {
        case 0:
          pinsel_1(coords, colorToDraw, coords.pixelAmount);
          break;
        case 1:
          pinsel_2(coords, colorToDraw, coords.pixelAmount);
          break;
        case 2:
          pinsel_3(coords, colorToDraw, coords.pixelAmount);
          break;
      }
    }
  });
}

function drawLeftBuffer() {
  drawCamAndRects();
  //setIgnoredColor();
  CAM.loadPixels();

  timeout_0(1250, () => {
    if (IS_FIRST_LOOP) {
      const colorsInSquares = getColorsFromAllSquares();
      setIgnoredColor(colorsInSquares);
      IS_FIRST_LOOP = false;
    } else {
      const currentColors = getColorsFromAllSquares();
      for (let i = 0; i < 3; i++) {
        if (checkIsColor(currentColors[i], IGNORED_COLOR, THRESHOLD + 30)) {
        } else {
          CURRENT_SQUARE_COLORS[i] = currentColors[i];
          console.log(CURRENT_SQUARE_COLORS[i]);
        }
      }
    }
  });

  CURRENT_SQUARE_COLORS.map((squareColor, i) => {
    if (squareColor !== undefined) {
      const coords = calcAverageCoordsForSquareColor(squareColor);
      CURRENT_SQUARECOLOR_COORDS[i] = coords;
    }
  });
}

// @colorsInSquares: {r:number, g: number, b:number}[3]
function setIgnoredColor(colorsInSquares) {
  const rToIgnore =
    (colorsInSquares[0].r + colorsInSquares[1].r + colorsInSquares[2].r) / 3;
  const gToIgnore =
    (colorsInSquares[0].g + colorsInSquares[1].g + colorsInSquares[2].g) / 3;
  const bToIgnore =
    (colorsInSquares[0].b + colorsInSquares[1].b + colorsInSquares[2].b) / 3;
  IGNORED_COLOR.r = rToIgnore;
  IGNORED_COLOR.g = gToIgnore;
  IGNORED_COLOR.b = bToIgnore;
}

// @timeoutInMs: number
// @functionToExecute: () => any
function timeout_0(timeoutInMS, functionToExecute) {
  if (millis() - TIMESTAMP_0 > timeoutInMS) {
    functionToExecute();
    TIMESTAMP_0 = millis();
  }
}

// @returns: {r:number, g: number, b:number}[3]
function getColorsFromAllSquares() {
  const squares = [];
  for (let squareIndex = 0; squareIndex < 3; squareIndex++) {
    squares.push(getAverageColorFromSquare(squareIndex, THRESHOLD));
  }
  return squares;
}

// @squareIndex: number
// @threshhold: number
// returns: {r:number, g:number, b:number}
function getAverageColorFromSquare(squareIndex, threshhold) {
  const squareMatrix = {};
  let average = { r: 0, g: 0, b: 0 };
  let averageCounter = 0;

  // square 1 (10,10) - (65,65)
  // square 2 (75, 10) - (130, 65)
  // square 3 (140, 10) - (195, 65)

  let i = 0;
  for (y = 10; y < 65; y++) {
    for (x = 10 + squareIndex * 65; x < 65 + squareIndex * 65; x++) {
      const currentColor = get(x, y);
      const currentColorAsObj = {
        r: currentColor[0],
        g: currentColor[1],
        b: currentColor[2],
      };
      if (squareMatrix[i] != undefined) {
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
function calcAverageCoordsForSquareColor(squareColor) {
  let closestX = 0;
  let closestY = 0;
  let count = 0;
  let avgX = 0;
  let avgY = 0;

  for (let x = 0; x < CAM.width; x += 3) {
    for (let y = 0; y < CAM.height; y += 3) {
      if (CAM.width - x < 205 && y < 100) {
        continue;
      }

      let index = (x + y * CAM.width) * 4;
      let r = CAM.pixels[index + 0];
      let g = CAM.pixels[index + 1];
      let b = CAM.pixels[index + 2];
      let distance = dist(r, g, b, squareColor.r, squareColor.g, squareColor.b);
      if (distance < THRESHOLD + 30) {
        avgX += x;
        avgY += y;
        count += 1;
      }
    }
  }

  // Draw a circle at the tracked pixel
  //invert the x value because we mirrored the cam
  avgX = CAM.width - avgX / count;
  avgY = avgY / count;

  fill(squareColor.r, squareColor.g, squareColor.b);
  ellipse(avgX, avgY, 16, 16);
  textSize(25);
  text(count, avgX - 40, avgY);

  return count > 0 ? { x: avgX, y: avgY, pixelAmount: count } : undefined;
}

function drawCamAndRects() {
  stroke(0);

  // mirror and draw cam
  push();
  scale(-1, 1);
  image(CAM, -width / 2, 0);
  pop();

  // draw squares to track colors from
  noFill();
  rect(10, 10, 55, 55);
  rect(10 + 55 + 10, 10, 55, 55);
  rect(10 + (55 + 10) * 2, 10, 55, 55);
  // pixels in this rect are getting ignored for drawing
  rect(1, 1, 205, 100);

  CURRENT_SQUARE_COLORS.map((squareColor, i) => {
    if (squareColor !== undefined) {
      fill(squareColor.r, squareColor.g, squareColor.b);
      rect(10 + (55 + 10) * i, 65, 55, 20);
    }
  });
  fill(IGNORED_COLOR.r, IGNORED_COLOR.g, IGNORED_COLOR.b);
  rect(1, 85, 205, 15);
  noFill();
  textSize(10);
  fill(255, 255, 255);
  text("pinsel: " + PINSEL_STATE, 210, 10);
}

function checkIsColor(colorToBeChecked, colorWanted, threshhold) {
  const checkR =
    colorToBeChecked.r >= colorWanted.r - threshhold &&
    colorToBeChecked.r <= colorWanted.r + threshhold;
  const checkG =
    colorToBeChecked.g >= colorWanted.g - threshhold &&
    colorToBeChecked.g <= colorWanted.g + threshhold;
  const checkB =
    colorToBeChecked.b >= colorWanted.b - threshhold &&
    colorToBeChecked.b <= colorWanted.b + threshhold;
  return checkR && checkG && checkB;
}

// @coords: {x: num, y: num}
// @color: {r:num, g:num, b: num}
function pinsel_1(coords, color, size) {
  fill(color.r, color.g, color.b, 100);
  ellipse(coords.x + DRAWINGPLANE_X_BEGIN, coords.y, size / 3, size / 3);
}

// @coords: {x: num, y: num}
// @color: {r:num, g:num, b: num}
function pinsel_2(coords, color, size) {
  fill(color.r, color.g, color.b, 100);
  rect(coords.x + DRAWINGPLANE_X_BEGIN, coords.y, size / 3, size / 3);
}

// @coords: {x: num, y: num}
// @color: {r:num, g:num, b: num}
function pinsel_3(coords, color, size) {
  const actualSize = size / 3;
  fill(color.r, color.g, color.b, 100);
  ellipse(
    coords.x + DRAWINGPLANE_X_BEGIN,
    coords.y,
    actualSize / 6,
    actualSize / 6
  );

  fill(color.r, color.g, color.b, 50);
  ellipse(
    coords.x + DRAWINGPLANE_X_BEGIN,
    coords.y,
    actualSize / 4,
    actualSize / 4
  );

  fill(color.r, color.g, color.b, 20);
  ellipse(
    coords.x + DRAWINGPLANE_X_BEGIN,
    coords.y,
    actualSize / 2,
    actualSize / 2
  );
  fill(color.r, color.g, color.b, 10);
  ellipse(coords.x + DRAWINGPLANE_X_BEGIN, coords.y, actualSize, actualSize);
}


// KEY/MOUSE handlers
function keyPressed() {
  if (key === " ") {
    switch (PINSEL_STATE) {
      case 0:
        PINSEL_STATE++;
        break;
      case 1:
        PINSEL_STATE++;
        break;
      case 2:
        PINSEL_STATE = 0;
        break;
    }
  }
}

function mousePressed() {
  let fs = fullscreen();
  fullscreen(!fs);
}
