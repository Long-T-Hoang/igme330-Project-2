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
    showGradient : false,
    showBars : true,
    showCircles : false,
    showNoise : false,
    showInvert : false,
    showEmboss: false
};

let audioData, analyserNode;
let prevAudioData = [];
let projectiles = [];
let deltaTime, now, lastUpdate = Date.now();
let canvasWidth, canvasHeight;
let timer = 0;
const SPAWN_TIME = 0.7;
let angleOffset = 0;
let player = new classes.Player(0, 0);
let mainCanvas, visualizerCanvas;
let audioDuration = 0, audioStart, audioCurrent = 0, audioElapsed = 0;
let progressBar = document.querySelector("#audio-progress");
let scoreRef = 
{
    score: 0
}

// 1 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
	sound1  :  "media/NieR Automata - Simone.mp3"
});

const init = () => {
    audio.setupWebAudio(DEFAULTS.sound1);

	console.log("init called");
    console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);
    let canvasGroup = document.querySelector("#canvas-group")
    mainCanvas = document.querySelector("#main-canvas"); // hookup <canvas> element
    visualizerCanvas = document.querySelector("#visualizer");
    setupUI(canvasGroup);
    canvas.setupCanvas(mainCanvas, visualizerCanvas);
    canvasHeight = canvas.getHeight();
    canvasWidth = canvas.getWidth();
    analyserNode = audio.analyserNode;
    audioData = new Uint8Array(analyserNode.fftSize / 4);

    for(let i = 0; i < audioData.length; i++)
    {
        prevAudioData[i] = audioData[i];
    }

    document.addEventListener('keydown', function(e){
        player.addForce(e);
    });
    document.addEventListener('keyup', function(e){player.addForce(e)});

    document.onfullscreenchange = e => {
        if(document.fullscreenElement == null)
        {
            document.documentElement.style.setProperty('--canvas-height', '600px');
        }
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
    const scoreLabel = document.querySelector("#scoreLabel");
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

    fsButton.onclick = e => {
        console.log("init called");
        document.documentElement.style.setProperty('--canvas-height', '100%');
        utils.goFullscreen(canvasElement);
    };
    
    playButton.onclick = e => {
        if(audio.audioCtx.state == "suspended")
        {
            audio.audioCtx.resume();
        }

        // Play new audio
        if(e.target.dataset.playing == "no")
        {
            audio.playCurrentSound();
            audioDuration = audio.element.duration;
            e.target.dataset.playing = "yes";
            e.target.dataset.pausing = "no";
            audioStart = audio.audioCtx.currentTime;
        }
        // Resume audio
        else if(e.target.dataset.pausing == "yes")
        {
            audio.playCurrentSound();
            e.target.dataset.pausing = "no";
        }
        // Pause audio
        else
        {
            audio.pauseCurrentSound();
            e.target.dataset.pausing = "yes";
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
            audio.pauseCurrentSound();
            playButton.dataset.playing = "no";
            playButton.dataset.pausing = "yes";
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

    // Update elasped time
    if(!audio.element.paused)
    {
        audioCurrent = audio.audioCtx.currentTime;
        audioElapsed = audioCurrent - audioStart;
        console.log(`Progress ${audioElapsed / audioDuration}`);
        progressBar.value = audioElapsed / audioDuration;
    }

    // Calculate deltaTime
    now = Date.now();
    deltaTime = (now - lastUpdate) / 1000;
    lastUpdate = Date.now();

    analyserNode.getByteFrequencyData(audioData);
    //analyserNode.getByteTimeDomainData(audioData); // waveform data

    canvas.draw(drawParams, audioData, deltaTime);

    timer += deltaTime;
    if(timer >= SPAWN_TIME) 
    {
        spawnProjectiles();
        timer = 0;
    }

    gameLoop();
}

const spawnProjectiles = () => {
    
    let numMultiplier = 4;
    let numOfBar = audioData.length / numMultiplier;   
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

    for(let i = 0; i < numOfBar; i++)
    {
        let dataIndex = i * numMultiplier;
        let data = audioData[dataIndex];

        if(Math.abs(data - prevAudioData[dataIndex]) > 20 || data > 230)
        {
            let height = (maximumHeight - minimumHeight) * data / 255 + minimumHeight;
            let radius = outerRadius - height;
            angleOffset = canvas.getAngleOffset();

            let x = Math.cos(-Math.PI / 2 + i * angleBetweenBars + angleOffset) * radius;
            let y = Math.sin(-Math.PI / 2 + i * angleBetweenBars + angleOffset) * radius;

            let colorString = i % 2 == 0? "rgb(251, 109, 22)" : "rgb(62, 10, 94)";
            let dataMultiplier = data / 255;
            projectiles.push(new classes.Projectile(x, y, 0 ,0, dataMultiplier, dataMultiplier, dataMultiplier, player, colorString));

            prevAudioData[dataIndex] = data;
        }
    }
}

const gameLoop = () => {
    for(let p of projectiles)
    {
        p.move(deltaTime);
        p.collision(scoreRef);
        scoreLabel.innerHTML = `Score: ${scoreRef.score}`;

        if(p.destroy)
        {
            projectiles.splice(projectiles.indexOf(p), 1);
        }
    }

    player.move(deltaTime);
}

const clearProjectiles = () => {
    projectiles.splice(0, projectiles.length);
}

const getProjectiles = () => {return projectiles;}
const getPlayer = () => {return player;}

export {init, getProjectiles, getPlayer};