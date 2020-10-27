import * as utils from './utils.js';
import * as classes from './classes.js';
import { getPlayer, getProjectiles } from './main.js';

let player;
let projectiles;
let mainCtx, visualCtx, canvasWidth, canvasHeight;
let frequencyData, waveformData;
let angleOffset = 0;
let barrierGradient, gradient;
let circleMaxRadius = 200;  // Radius for inner circles visualizer
let numOfRings = 2; // Number of rings for inner circles visualizer
let img = document.querySelector("#Emil");

const setupCanvas = (mainCanvas, visualizerCanvas) => {
    // create drawing context
    mainCtx = mainCanvas.getContext("2d");
    visualCtx = visualizerCanvas.getContext("2d");
	canvasWidth = mainCanvas.width;
	canvasHeight = mainCanvas.height;
	// create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(visualCtx,0,0,0,canvasHeight,[{percent:1,color:"blue"},{percent:0,color:"magenta"}]);
    projectiles = getProjectiles();
    player = getPlayer();

    // Create barrier gradient
    barrierGradient = visualCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    let repeatNum = 200;

    for(let i = 0; i < repeatNum; i++)
    {
        let colorString = i % 2 == 0? "rgb(252, 143, 94)" : "rgb(233, 97, 60)";
        barrierGradient.addColorStop(i / repeatNum, colorString);
        barrierGradient.addColorStop(((i + 1) / repeatNum) - 0.0001, colorString);
    }
}

const draw = (params={}, mode={}, audioDataRef, waveformDataRef, deltaTime) => {
    // Audio data ref
    frequencyData = audioDataRef;
    waveformData = waveformDataRef;

    // Clear screen
    mainCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background and background gradient
    background(params);

    // Draw visualizer
    visualizer(params, mode, deltaTime);

    // Draw player and projectiles
    if(params.showGame) objects(params);

    // Draw effects on visualizer and main canvases
    effects(params, visualCtx);
    effects(params, mainCtx);
}

const background = (params={}) => {
	// Draw gradient and barrier 
    if(params.showGradient)
    {
        // Gradient background
        visualCtx.save();
        visualCtx.fillStyle = barrierGradient;
        visualCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        visualCtx.restore();
        
        // Barrier
        drawBarrier("rgb(98, 93, 84)");
    }
    else if(!params.emilMode)
    {
        // Background
        visualCtx.save();
        visualCtx.fillStyle = "rgb(191, 186, 157)";
        visualCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        visualCtx.restore();
            
        // Barrier
        drawBarrier(barrierGradient);
    }
    else
    {
        // Background
        visualCtx.save();
        visualCtx.fillStyle = "rgb(164, 157, 116)";
        visualCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        visualCtx.restore();
            
        // Barrier
        drawBarrier(barrierGradient);
    }
}

const visualizer = (params={}, mode={}, deltaTime) => {
    // Getting data based on mode
    let dataRef;

    if(mode.frequency)
    {
        dataRef = frequencyData;
    }
    else
    {
        dataRef = waveformData;
    }
    
    // Circular
    let numOfBar = dataRef.length;   
    let barSpacing = 4;
    let radiusOffset = 75; // The higher, the closer the inner radius is to the center
    let minimumHeight = 200; 
    let maximumHeight = 270;
    let innerRadius = canvasHeight / 2 - radiusOffset;
    let outerRadius = innerRadius + maximumHeight;
    let circumference = 2 * innerRadius * Math.PI;
    let lengthForBars = circumference - numOfBar * barSpacing;
    let barWidth = lengthForBars / numOfBar;
    let angleDelta = Math.PI / 36;
    let angleBetweenBars = 2 * Math.PI / numOfBar;

    visualCtx.save();
    // Translate to the center and rotate bars and outer ring visualizer
    visualCtx.translate(canvasWidth / 2, canvasHeight / 2);
    visualCtx.rotate(angleOffset);

    // Draw bars
    if(params.showBars)
    {
        visualCtx.save();

        visualCtx.fillStyle = 'rgb(107, 108, 96)';
        visualCtx.strokeStyle = 'rgb(111, 110, 100)';
        visualCtx.lineWidth = 2;

        for(let i = 0; i < numOfBar; i++)
        {
            visualCtx.save();

            // Rotate to right position
            visualCtx.rotate(angleBetweenBars * i);

            // Calculate position and height 
            let x = -barWidth / 2;
            let y = -outerRadius;
            let height = (maximumHeight - minimumHeight) * Math.pow(dataRef[i] / 255, 4) + minimumHeight;

            visualCtx.fillRect(x, y, barWidth, height);
            visualCtx.strokeRect(x, y, barWidth, height);
            visualCtx.restore();
        }
        visualCtx.restore();
    }
    // Draw outer ring
    if(params.showOuterRing)
    {
        visualCtx.save();

        visualCtx.lineWidth = 3;
        visualCtx.strokeStyle =  "rgb(233, 97, 60)";

        if(params.showGradient)
        {
            visualCtx.strokeStyle = "rgb(61, 57, 46)";
        }

        let height;
        let radius = innerRadius + maximumHeight - minimumHeight;
        let multiplier = 50;

        visualCtx.beginPath();
        visualCtx.moveTo(0, - radius + multiplier * dataRef[0] / 128);  // Move to first position

        for(let i = 0; i < numOfBar; i++)
        {
            let index = i == numOfBar - 1? -1 : i;  // Connect end and start of ring

            height = multiplier * dataRef[index + 1] / 128;
            let x = (radius - height) * Math.cos((angleBetweenBars * index) - Math.PI / 2);
            let y = (radius - height) * Math.sin((angleBetweenBars * index) - Math.PI / 2);

            visualCtx.lineTo(x, y);
        }

        visualCtx.closePath();
        visualCtx.stroke();

        visualCtx.restore();
    }

    // Spin the visualizer
    angleOffset += angleDelta * deltaTime;

    // Reset to 0 when angle is 360
    if(angleOffset == Math.PI * 2) angleOffset = 0;

    visualCtx.restore();
    

	// 5 - draw circles
    if(params.showCircles)
    {
        visualCtx.save();

        // Multiplier to get right info
        let loopMultiplier = dataRef.length / numOfRings;

        for(let i = 0; i < numOfRings; i++)
        {
            // Radius based on audio data
            let percent = dataRef[Math.round(i * loopMultiplier)] / 255;
            let circleRadius = percent * circleMaxRadius;
                
            // Ring outer glow
            visualCtx.save();
            visualCtx.beginPath();
            visualCtx.lineWidth = 4;
            visualCtx.strokeStyle = "rgb(154, 99, 76)";
            visualCtx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            visualCtx.stroke();
            visualCtx.closePath();
            visualCtx.restore();

            // Ring inner glow
            visualCtx.save();
            visualCtx.beginPath();
            visualCtx.lineWidth = 2;
            visualCtx.strokeStyle = "rgb(233, 155, 120)";
            visualCtx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            visualCtx.stroke();
            visualCtx.closePath();
            visualCtx.restore();

            // Ring
            visualCtx.beginPath();
            visualCtx.strokeStyle = "rgb(255, 237, 211)";
            visualCtx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            visualCtx.stroke();
            visualCtx.closePath();
            
        }

        visualCtx.restore();
    }	
}

const objects = (params={}) => {
    for(let p of projectiles)
    {
        p.draw(mainCtx, canvasWidth, canvasHeight, params, img);
    }

    player.draw(mainCtx, canvasWidth, canvasHeight);
}

const effects = (params={}, ctx) => {
    let imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;
    let length = data.length;
    let width = imageData.width;
    let height = imageData.height;

	// B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
    for(let i = 0; i < length; i += 4) {

		// C) randomly change every 20th pixel to red
        if(params.showNoise && Math.random() < 0.05) {
			// data[i] is the red channel
			// data[i+1] is the green channel
			// data[i+2] is the blue channel
			// data[i+3] is the alpha channel
			data[i] = data[i + 1] = data[i + 2] = 0// zero out the red and green and blue channels
			// make the red channel 100% red
        } 
        
        if(params.showInvert) {
            let red = data[i], green = data[i + 1], blue = data[i + 2];
            data[i] = 255 - red;
            data[i + 1] = 255 - green;
            data[i + 2] = 255 - blue;
        } 
    } 
    
    if(params.showStatic)
    {
        // Range for randoms
        let groupNumRange = 70;
        let groupDisplaceRange = 2;

        // Calculate random number of lines for a group
        let lineNum = Math.round(Math.random() * groupNumRange + 10);

        // Get current and last line
        let curretLine = 0;
        let lastLine = curretLine + lineNum;

        // Store data of last displacement and get random displace in a group;
        let lastDisplace = 0;
        let groupDisplace = Math.round(Math.random() * groupDisplaceRange);

        for(let i = 0; i < height; i++)
        {
            let lineStart = i * 4 * width;
            let randomDisplace;

            // Starting a new group of static
            if(lastLine < i)
            {
                randomDisplace = Math.round(Math.random() * 5) * 4;
                lastDisplace = randomDisplace;
                lineNum = Math.random() * groupNumRange + 10;
                curretLine = i;
                lastLine = curretLine + lineNum;
                groupDisplace = Math.round(Math.random() * groupDisplaceRange);

                if(lastLine >= height) lastLine -= lastLine - height + 1;
            }
            // Caulculate random displace for a group
            else
            {
                randomDisplace = lastDisplace + groupDisplace * 4;
            }
            
            // Changing data for a line
            for(let j = lineStart; j < lineStart + width * 4; j += 4)
            {
                let newPosition = j + randomDisplace;

                if(newPosition < 0) newPosition = width * 4 - newPosition;
                if(newPosition > width * 4) newPosition -= width * 4;

                // Store data for swapping
                let alt = [data[newPosition], data[newPosition + 1], data[newPosition + 2], data[newPosition + 3]];

                // Swapping
                for(let k = 0; k < 4; k++)
                {
                    data[newPosition + k] = data[j + k];

                    data[j + k] = alt[k];
                }
            }

        }
    }

    if(params.showEmboss)
    {
        for(let i = 0; i < length; i++) {
            if(i % 4 == 3) continue;

            data[i] = 127 + 2 * data[i] - data[i + 4] - data[i + width * 4];
        }
    }

    // D) copy image data back to canvas
    ctx.putImageData(imageData, 0, 0);
}

const drawBarrier = (value) => {
    visualCtx.save();
    visualCtx.strokeStyle = value;
    visualCtx.lineWidth = 4;
    visualCtx.beginPath();
    visualCtx.arc(canvasWidth / 2, canvasHeight / 2, player.radiusLimit + player.radius, 0, Math.PI * 2);
    visualCtx.closePath();
    visualCtx.stroke();
    visualCtx.restore();
}

const getHeight = () => {return canvasHeight;}
const getWidth = () => {return canvasWidth;}
const getAngleOffset = () => {return angleOffset;}
const setMaxRadius = (radius) => {circleMaxRadius = radius;}
const setNumOfRing = (num) => {numOfRings = num;}

export {setupCanvas,draw, getHeight, getWidth, getAngleOffset, setMaxRadius, setNumOfRing};