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
let ctx,canvasWidth,canvasHeight,gradient, audioData;
let angleOffset = 0;

const setupCanvas = (canvasElement) => {
	// create drawing context
	ctx = canvasElement.getContext("2d");
	canvasWidth = canvasElement.width;
	canvasHeight = canvasElement.height;
	// create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(ctx,0,0,0,canvasHeight,[{percent:1,color:"blue"},{percent:0,color:"magenta"}]);
    projectiles = getProjectiles();
    player = getPlayer();
}

const draw = (params={}, audioDataRef, deltaTime) => {
  // 1 - populate the audioData array with the frequency data from the analyserNode
	// notice these arrays are passed "by reference" 
	// OR
	//analyserNode.getByteTimeDomainData(audioData); // waveform data
    audioData = audioDataRef;

    background(params);

    visualizer(params, deltaTime);

    objects();

    effects(params);
}

const background = (params={}) => {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.globalAlpha = .1;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
		
	// 3 - draw gradient
    if(params.showGradient)
    {
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = .3;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
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

        ctx.save();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(angleOffset);

        // Draw bars
        for(let i = 0; i < numOfBar; i++)
        {
            ctx.save();
            ctx.rotate(angleBetweenBars * i);

            let x = -barWidth / 2;
            let y = -outerRadius;
            let height = (maximumHeight - minimumHeight) * audioData[i] / 255 + minimumHeight;

            ctx.fillRect(x, y, barWidth, height);
            ctx.strokeRect(x, y, barWidth, height);
            ctx.restore();
        }

        // Spin the visualizer
        angleOffset += angleDelta * deltaTime;

        if(angleOffset == Math.PI * 2) angleOffset = 0;

        ctx.restore();
    }

	// 5 - draw circles
    if(params.showCircles)
    {
        let maxRadius = canvasHeight / 4;
        ctx.save();
        ctx.globalAlpha = 0.5;

        for(let i = 0; i < audioData.length; i++)
        {
            //red-ish circles
            let percent = audioData[i] / 255;

            let circleRadius = percent * maxRadius;
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(255, 111, 111, .34 - percent / 3.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            //blue-ish circles, bigger, more transparent
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(0, 0, 255, .1 - percent / 10.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            //yellow-ish circles, smaller
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(200, 200, 0, .5 - percent / 5.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * .5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
        }

        ctx.restore();
    }	
}

const objects = () => {
    for(let p of projectiles)
    {
        p.draw(ctx, canvasWidth, canvasHeight);
    }

    player.draw(ctx, canvasWidth, canvasHeight);
}

const effects = (params={}) => {
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

export {setupCanvas,draw, getHeight, getWidth, getCtx};