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
import { getProjectiles } from './main.js';

let projectiles;
let ctx,canvasWidth,canvasHeight,gradient, audioData;

const setupCanvas = (canvasElement) => {
	// create drawing context
	ctx = canvasElement.getContext("2d");
	canvasWidth = canvasElement.width;
	canvasHeight = canvasElement.height;
	// create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(ctx,0,0,0,canvasHeight,[{percent:1,color:"blue"},{percent:0,color:"magenta"}]);
    projectiles = getProjectiles();
}

const draw = (params={}, projectiles, audioDataRef) => {
  // 1 - populate the audioData array with the frequency data from the analyserNode
	// notice these arrays are passed "by reference" 
	// OR
	//analyserNode.getByteTimeDomainData(audioData); // waveform data
    audioData = audioDataRef;

    background(params);

    visualizer(params);

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

const visualizer = (params={}) => {
    // 4 - draw bars
    if(params.showBars)
    {
        let barSpacing = 4;
        let margin = 50;
        let numOfBar = audioData.length / 4;    // Number of bar on each sides
        let screenWidthForBars = canvasWidth - (numOfBar * barSpacing) - margin * 2;
        let barWidth = screenWidthForBars / numOfBar;
        let barHeight = 75;
        let barMultiplierOffset = 1.1;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        //ctx.rotate(180);

        for(let j = 0; j < 4; j++)
        {
            ctx.save();
            ctx.rotate(Math.PI / 2 * j);
            for(let i = 0; i < numOfBar; i++)
            {
                let xPos = margin + i * (barWidth + barSpacing) - canvasWidth / 2;
                let yPos = barHeight * (audioData[i + j * numOfBar] / 255) - canvasHeight / 2 - barHeight;

                ctx.fillRect(xPos, yPos, barWidth, barHeight * barMultiplierOffset);
                ctx.strokeRect(xPos, yPos, barWidth, barHeight * barMultiplierOffset);
            }

            ctx.restore();
        }

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