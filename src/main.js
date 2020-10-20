/*
	main.js is primarily responsible for hooking up the UI to the rest of the application 
	and setting up the main event loop
*/

// We will write the functions in this file in the traditional ES5 way
// In this instance, we feel the code is more readable if written this way
// If you want to re-write these as ES6 arrow functions, to be consistent with the other files, go ahead!
import * as audio from './audio.js';
import * as utils from './utils.js';
import * as canvas from './canvas.js';
import * as classes from './classes.js';

const drawParams =
{
    showGradient : true,
    showBars : true,
    showCircles : true,
    showNoise : true,
    showInvert : false,
    showEmboss: false
};

let player;
let margin, barWidth, barSpacing;
let audioData, analyserNode;
let projectiles = [];
let deltaTime, now, lastUpdate = Date.now();
let canvasWidth, canvasHeight;
let timer = 0;
const SPAWN_TIME = 2;

let SPAWN_START_POSITION;

// 1 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
	sound1  :  "media/NieR Automata - Simone.mp3"
});

const init = () => {
    audio.setupWebAudio(DEFAULTS.sound1);

	console.log("init called");
	console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);
	let canvasElement = document.querySelector("canvas"); // hookup <canvas> element
    setupUI(canvasElement);
    canvas.setupCanvas(canvasElement);
    canvasHeight = canvas.getHeight();
    canvasWidth = canvas.getWidth();
    analyserNode = audio.analyserNode;
    audioData = new Uint8Array(analyserNode.fftSize / 2);

    SPAWN_START_POSITION = {
        0: {x: -canvasWidth / 2, y: -canvasHeight / 2},
        1: {x: canvasWidth / 2, y: -canvasHeight / 2},
        2: {x: canvasWidth / 2, y: canvasHeight / 2},
        3: {x: -canvasWidth / 2, y: canvasHeight / 2}
    }

    loop();
}

const setupUI = (canvasElement) => {
  // A - hookup fullscreen button
    const fsButton = document.querySelector("#fsButton");
    const playButton = document.querySelector("#playButton");
    const clearProjButton = document.querySelector("#clearProj");
    const volumeSlider = document.querySelector("#volumeSlider");
    const volumeLabel = document.querySelector("#volumeLabel");
    const trackSelect = document.querySelector("#trackSelect");
    const gradientCB = document.querySelector("#gradientCB");
    gradientCB.checked = drawParams.showGradient;
    const barsCB = document.querySelector("#barsCB");
    barsCB.checked = drawParams.showBars;
    const circlesCB = document.querySelector("#circlesCB");
    circlesCB.checked = drawParams.showCircles;
    const noiseCB = document.querySelector("#noiseCB");
    noiseCB.checked = drawParams.showNoise;
    const invertCB = document.querySelector("#invertCB");
    invertCB.checked = drawParams.showInvert;
    const embossCB = document.querySelector("#embossCB");
    embossCB.checked = drawParams.showEmboss;

    volumeLabel.innerHTML = volumeSlider.value / 2 * 100;

  // add .onclick event to button
    fsButton.onclick = e => {
        console.log("init called");
        utils.goFullscreen(canvasElement);
    };
    
    playButton.onclick = e => {
        console.log('audioCtx.state before = ${audio.audioCtx.state}');

        if(audio.audioCtx.state == "suspended")
        {
            audio.audioCtx.resume();
        }

        console.log('audioCtx.state after = ${audio.audioCtx.state}');

        if(e.target.dataset.playing == "no")
        {
            audio.playCurrentSound();
            e.target.dataset.playing = "yes";
        }
        else
        {
            audio.pauseCurrentSound();
            e.target.dataset.playing = "no";
        }
    }

    clearProjButton.onclick = e => {
        clearProjectiles();
    }

    volumeSlider.oninput = e => {
        // set gain
        audio.setVolume(e.target.value);

        // update label
        volumeLabel.innerHTML = Math.round(e.target.value / 2 * 100);
    }

    trackSelect.onchange = e => {
        audio.loadSoundFile(e.target.value);

        // pause current track if playing
        if(playButton.dataset.playing = "yes")
        {
            playButton.dispatchEvent(new MouseEvent("click"));
        }
    }

    gradientCB.onchange = e => {
        drawParams.showGradient = gradientCB.checked;
    }

    barsCB.onchange = e => {
        drawParams.showBars = barsCB.checked;
    }

    circlesCB.onchange = e => {
        drawParams.showCircles = circlesCB.checked;
    }

    noiseCB.onchange = e => {
        drawParams.showNoise = noiseCB.checked;
    }

    invertCB.onchange = e => {
        drawParams.showInvert = invertCB.checked;
    }
    
    embossCB.onchange = e => {
        drawParams.showEmboss = embossCB.checked;
    }
} // end setupUI

const loop = () => {
    /* NOTE: This is temporary testing code that we will delete in Part II */
    requestAnimationFrame(loop);

    // Calculate deltaTime
    now = Date.now();
    deltaTime = (now - lastUpdate) / 1000;
    lastUpdate = Date.now();

    analyserNode.getByteFrequencyData(audioData);

    canvas.draw(drawParams, projectiles, audioData);

    timer += deltaTime;

    if(timer >= SPAWN_TIME) 
    {
        spawnProjectiles();
        timer = 0;
    }

    gameLoop();
}

const spawnProjectiles = () => {
    let size = audioData.length;
    let numOfSpawnPos = size / 4;

    // For calculating spawning location
    let barSpacing = 4;
    let margin = 50;
    let screenWidthForBars = canvasWidth - (numOfSpawnPos * barSpacing) - margin * 2;
    let barWidth = screenWidthForBars / numOfSpawnPos;

    for(let j = 0; j < 4; j++)
    {
        for(let i = 0; i < numOfSpawnPos; i += 8)
        {
            if(audioData[j * numOfSpawnPos + i] >= 50)
            {
                let x = SPAWN_START_POSITION[j].x + (margin + barWidth / 2 + i * (barWidth + barSpacing)) * (1 - (j % 2));
                let y = SPAWN_START_POSITION[j].y + (margin + barWidth / 2 + i * (barWidth + barSpacing)) * (j % 2);

                projectiles.push(new classes.Projectile(x, y, 0 ,0, audioData[j * numOfSpawnPos + i] / 255, audioData[j * numOfSpawnPos + i] / 255));
            }
        }
    }
}

const gameLoop = () => {
    for(let p of projectiles)
    {
        p.move(deltaTime);
        p.collision();

        if(p.destroy)
        {
            projectiles.splice(projectiles.indexOf(p), 1);
        }
    }
}

const clearProjectiles = () => {
    projectiles.splice(0, projectiles.length);
}

const getProjectiles = () => {return projectiles;}

export {init, getProjectiles};