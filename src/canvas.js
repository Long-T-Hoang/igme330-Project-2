/*
	The purpose of this file is to take in the analyser node and a <canvas> element: 
	  - the module will create a drawing context that points at the <canvas> 
	  - it will store the reference to the analyser node
	  - in draw(), it will loop through the data in the analyser node
	  - and then draw something representative on the canvas
	  - maybe a better name for this file/module would be *visualizer.js* ?
*/

import * as utils from './utils.js';
import * as classes from './classes.js';
import { getPlayer, getProjectiles } from './main.js';

let player;
let projectiles;
let mainCtx, visualCtx,canvasWidth,canvasHeight,gradient, audioData;
let angleOffset = 0;
let barrierGradient;

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

const draw = (params={}, audioDataRef, deltaTime) => {
  // 1 - populate the audioData array with the frequency data from the analyserNode
	// notice these arrays are passed "by reference" 
	// OR
	
    audioData = audioDataRef;

    mainCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    background(params);

    visualizer(params, deltaTime);

    objects();

    effects(params, visualCtx);
    effects(params, mainCtx);
}

const background = (params={}) => {
	// 3 - draw gradient
    if(params.showGradient)
    {
        visualCtx.save();
        visualCtx.fillStyle = barrierGradient;
        visualCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        visualCtx.restore();
        
        // Barrier
        visualCtx.save();
        visualCtx.strokeStyle = "rgb(98, 93, 84)";
        visualCtx.lineWidth = 4;
        visualCtx.beginPath();
        visualCtx.arc(canvasWidth / 2, canvasHeight / 2, player.radiusLimit + player.radius, 0, Math.PI * 2);
        visualCtx.closePath();
        visualCtx.stroke();
        visualCtx.restore();
    }
    else
    {
        visualCtx.save();
        visualCtx.fillStyle = "rgb(191, 186, 157)";
        visualCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        visualCtx.restore();
            
        // Barrier
        visualCtx.save();
        visualCtx.strokeStyle = barrierGradient;
        visualCtx.lineWidth = 4;
        visualCtx.beginPath();
        visualCtx.arc(canvasWidth / 2, canvasHeight / 2, player.radiusLimit + player.radius, 0, Math.PI * 2);
        visualCtx.closePath();
        visualCtx.stroke();
        visualCtx.restore();
    }
}

const visualizer = (params={}, deltaTime) => {
    // 4 - draw bars
    if(params.showBars)
    {
        // Circular
        let numOfBar = audioData.length;   
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

        visualCtx.fillStyle = 'rgb(107, 108, 96)';
        visualCtx.strokeStyle = 'rgb(111, 110, 100)';
        visualCtx.lineWidth = 2;
        visualCtx.translate(canvasWidth / 2, canvasHeight / 2);
        visualCtx.rotate(angleOffset);

        // Draw bars
        for(let i = 0; i < numOfBar; i++)
        {
            visualCtx.save();
            visualCtx.rotate(angleBetweenBars * i);

            let x = -barWidth / 2;
            let y = -outerRadius;
            let height = (maximumHeight - minimumHeight) * Math.pow(audioData[i] / 255, 2) + minimumHeight;

            visualCtx.fillRect(x, y, barWidth, height);
            visualCtx.strokeRect(x, y, barWidth, height);
            visualCtx.restore();
        }

        // Spin the visualizer
        angleOffset += angleDelta * deltaTime;

        if(angleOffset == Math.PI * 2) angleOffset = 0;

        visualCtx.restore();
    }

	// 5 - draw circles
    if(params.showCircles)
    {
        let maxRadius = canvasHeight / 4;
        visualCtx.save();
        visualCtx.globalAlpha = 0.5;

        for(let i = 0; i < audioData.length; i++)
        {
            //red-ish circles
            let percent = audioData[i] / 255;

            let circleRadius = percent * maxRadius;
            visualCtx.beginPath();
            visualCtx.fillStyle = utils.makeColor(255, 111, 111, .34 - percent / 3.0);
            visualCtx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            visualCtx.fill();
            visualCtx.closePath();

            //blue-ish circles, bigger, more transparent
            visualCtx.beginPath();
            visualCtx.fillStyle = utils.makeColor(0, 0, 255, .1 - percent / 10.0);
            visualCtx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            visualCtx.fill();
            visualCtx.closePath();

            //yellow-ish circles, smaller
            visualCtx.beginPath();
            visualCtx.fillStyle = utils.makeColor(200, 200, 0, .5 - percent / 5.0);
            visualCtx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * .5, 0, 2 * Math.PI, false);
            visualCtx.fill();
            visualCtx.closePath();
        }

        visualCtx.restore();
    }	
}

const objects = () => {
    for(let p of projectiles)
    {
        p.draw(mainCtx, canvasWidth, canvasHeight);
    }

    player.draw(mainCtx, canvasWidth, canvasHeight);
}

const effects = (params={}, ctx) => {
    let imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;
    let length = data.length;
    let width = imageData.width;

	// B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
    for(let i = 0; i < length; i += 4) {

		// C) randomly change every 20th pixel to red
        if(params.showNoise && Math.random() < .05) {
			// data[i] is the red channel
			// data[i+1] is the green channel
			// data[i+2] is the blue channel
			// data[i+3] is the alpha channel
			data[i] = data[i + 1] = data[i + 2] = 170// zero out the red and green and blue channels
			// make the red channel 100% red
        } // end if
        
        if(params.showInvert) {
            let red = data[i], green = data[i + 1], blue = data[i + 2];
            data[i] = 255 - red;
            data[i + 1] = 255 - green;
            data[i + 2] = 255 - blue;
        } // end if
	} // end for
    
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

const getHeight = () => {return canvasHeight;}

const getWidth = () => {return canvasWidth;}

const getCtx = () => {return ctx;}

const getAngleOffset = () => {return angleOffset;}

export {setupCanvas,draw, getHeight, getWidth, getCtx, getAngleOffset};