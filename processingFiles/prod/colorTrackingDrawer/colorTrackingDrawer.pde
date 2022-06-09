let cam

// CONFIG
const colorToIgnore =  {r: 186, g: 181, b: 173};
const threshold = 15;


//GLOBAL
const squareColors = {0:undefined, 1:undefined, 2:undefined};
const trackedColorCoordinates = {0:{count:0, avgX: 0, avgY: 0 }, 1:{count:0, avgX: 0, avgY: 0}, 2:{count:0, avgX: 0, avgY: 0}};
let timestamp = 0;
let coordinatesTracked = false;

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
  
    resetSquares();
  
}

function drawRightBuffer() {
  const xZero = 641;
  noFill();
  rect (xZero, 1, 205, 100);
    if(coordinatesTracked) {
    noStroke();
      for (let i = 0; i<3; i++ ) {
        fill(squareColors[i].r, squareColors[i].g, squareColors[i].b, 100);
        ellipse(trackedColorCoordinates[i].avgX + xZero ,trackedColorCoordinates[i].avgY, 50, 50);
      }
    }
  
  
  
  
}



function drawLeftBuffer() {
  drawCamAndRects();
  calculateTrackedColorsFromSquares(2500);
  cam.loadPixels();
  
  if(squareColors[0] != undefined) {
    calcTrackedColorCoordinates();
  }
  
}
function calcTrackedColorCoordinates(){
      //console.log(squareColors);
  let closestX = 0;
  let closestY = 0;
  for (let i = 0; i < 3; i++)   {
    for (let x = 0; x < cam.width; x += 3) {
      for (let y = 0; y < cam.height; y += 3) {
              if(x<205 && y < 100) { continue;}

              let index = (x + (y * cam.width)) * 4;
              let r = cam.pixels[index + 0];
              let g = cam.pixels[index + 1];
              let b = cam.pixels[index + 2];
              let distance = dist(r, g, b, squareColors[i].r, squareColors[i].g, squareColors[i].b);
                if (distance < threshold) {
                    trackedColorCoordinates[i].avgX += x;
                    trackedColorCoordinates[i].avgY += y;
                    trackedColorCoordinates[i].count += 1;
                }
            }
      }
      // Draw a circle at the tracked pixel
      trackedColorCoordinates[i].avgX = trackedColorCoordinates[i].avgX/trackedColorCoordinates[i].count
      trackedColorCoordinates[i].avgY = trackedColorCoordinates[i].avgY/trackedColorCoordinates[i].count


      fill(squareColors[i].r, squareColors[i].g, squareColors[i].b);
      ellipse(trackedColorCoordinates[i].avgX, trackedColorCoordinates[i].avgY, 16, 16);
      text("id:"+i, trackedColorCoordinates[i].avgX+10, trackedColorCoordinates[i].avgY+10)
  }
  coordinatesTracked = true;
}

function resetSquares() {
  //squareColors = {0:{}, 1:{}, 2:{}};
  trackedColorCoordinates[0] = {count:0, avgX: 0, avgY: 0 };
  trackedColorCoordinates[1] = {count:0, avgX: 0, avgY: 0 };
  trackedColorCoordinates[2] = {count:0, avgX: 0, avgY: 0 };

}
  





function drawCamAndRects(){
  stroke(0);
  image(cam,0,0);
  
  noFill();
  rect(10,10,55,55);
  rect(10 + 55 + 10 ,10,55,55);
  rect(10 + ( 55 + 10) *2 , 10,55,55);
  // pixels in this rect are getting ignored for drawing
  rect (1, 1, 205, 100);
  
  rect (1, 95, 5 , 5);
}

function calculateTrackedColorsFromSquares(timeout){
   if( millis() - timestamp > timeout) {
     ignoreColorPixel = get(5,95);
     colorToIgnore.r = ignoreColorPixel[0];
     colorToIgnore.g = ignoreColorPixel[1];
     colorToIgnore.b = ignoreColorPixel[2];
     
    for(let i = 0; i<3; i++) {
      squareColors[i] = getAverageColorFromSquare(i, colorToIgnore, threshold);
    }
    timestamp = millis();
  }
}


function getAverageColorFromSquare(squareIndex, colorToIgnore, threshhold) {
  
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
      const colorIsIgnored = checkIsColor(currentColorAsObj, colorToIgnore, threshhold);
      currentColorAsObj.isIgnored = colorIsIgnored;
      if(!colorIsIgnored) {
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
    }
    i++;
  }
  
   average.r /= averageCounter;
   average.g /= averageCounter;
   average.b /= averageCounter;

  return average;
}

function checkIsColor(colorToBeChecked, colorWanted, threshhold) {
  const checkR = colorToBeChecked.r >= colorWanted.r - threshhold && colorToBeChecked.r <= colorWanted.r + threshhold;
  
  
  const checkG = colorToBeChecked.g >= colorWanted.g - threshhold && colorToBeChecked.g <= colorWanted.g + threshhold;
  
    const checkB = colorToBeChecked.b >= colorWanted.b - threshhold && colorToBeChecked.b <= colorWanted.b + threshhold;
  
  return (checkR && checkG && checkB);
}
