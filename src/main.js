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
    showEmboss: false,
    showOuterRing: true,
    showStatic:false,
    emilMode: false,
    showGame: true
};

const distortionParams ={
    _static: false,
    _buzz: false,
    _boosted: false,
    _normal: true,

    set static(value)
    {
        this._static = value;
        audio.toggleDistortion(this);
    },

    get static(){
        return this._static;
    },

    set normal(value)
    {
        this._normal = value;
        audio.toggleDistortion(this);
    },

    get normal()
    {
        return this._normal;
    },

    set buzz(value)
    {
        this._buzz = value;
        audio.toggleDistortion(this);
    },

    get buzz(){
        return this._buzz;
    },

    set boosted(value)
    {
        this._boosted = value;
        audio.toggleDistortion(this);
    },

    get boosted(){
        return this._boosted;
    },

    reset(){
        this.static = false;
        this.buzz = false;
        this.boosted = false;
        this.normal = false;
    }
};

const mode = 
{
    frequency: true,
    waveform: false
}

let audioData, waveformData, analyserNode;
let prevAudioData = [];
let projectiles = [];
let deltaTime, now, lastUpdate = Date.now();
let canvasWidth, canvasHeight;
let timer = 0;
const SPAWN_TIME = 0.7;
let angleOffset = 0;
let player = new classes.Player(0, 0);
let canvasGroup, mainCanvas, visualizerCanvas;
let audioDuration = 0, audioStart, audioPaused = 0, audioCurrent = 0, audioElapsed = 0;
let progressBar = document.querySelector("#audio-progress");
let scoreRef = 
{
    score: 0
}

// Controller for dat.GUI
const controllerObject = {
    _volume: 0.5,
    _maxRadius: 150,
    _numOfRings: 5,
    _mode: "frequency",
    _playing: false,
    _pausing: true,
    _track: "media/NieR - The Wretched Automatons.mp3",
    _distortionAmount : 20,

    set distortionAmount(value){
        this._distortionAmount = value;
        audio.setDistortionAmount(this._distortionAmount);
        if(!this._normal) audio.toggleDistortion(distortionParams);
    },

    get distortionAmount(){
        return this._distortionAmount;
    },

    set volume(value){
        this._volume = value * 2 / 100;
        audio.setVolume(this._volume);
    },

    get volume(){
        return Math.round(this._volume * 100 / 2);
    },

    play(){
        if(audio.audioCtx.state == "suspended")
        {
            audio.audioCtx.resume();
        }

        // Play new audio
        if(!this._playing)
        {
            audio.playCurrentSound();
            audioDuration = audio.element.duration;
            this._playing = true;
            this._pausing = false;
            audioStart = audio.audioCtx.currentTime;
        }
        // Resume audio
        else if(this._pausing)
        {
            audio.playCurrentSound();
            this._pausing = false;
        }
        // Pause audio
        else
        {
            audio.pauseCurrentSound();
            this._pausing = true;
        }
    },

    set track(value){
        audio.loadSoundFile(value);

        // pause current track if playing
        if(this._playing)
        {
            audio.pauseCurrentSound();
            this._playing = false;
            this._pausing = true;
        }

        clearProjectiles();
        audioPaused = 0;
        scoreRef.score = 0;
    },

    get track(){
        return this._track;
    },

    clearProj(){
        clearProjectiles();
    },

    fullscreen(){
        console.log("init called");
        document.documentElement.style.setProperty('--canvas-width', '50%');
        document.documentElement.style.setProperty('--left', '25%');
        document.documentElement.style.setProperty('--top', '5%');
        document.documentElement.style.setProperty('--group-radius', '0');
        utils.goFullscreen(canvasGroup);
    },

    set mode(value){
        this._mode = value;
        mode.frequency = value == "frequency";
        mode.waveform = value == "waveform";
    },

    get mode(){
        let value = mode.frequency? "frequency" : "waveform";
        return value;
    },

    set maxRadius(value){
        this._maxRadius = value;
        canvas.setMaxRadius(this._maxRadius);
    },

    get maxRadius(){
        return this._maxRadius;
    },

    set numOfRings(value){
        this._numOfRings = value;
        canvas.setNumOfRing(this._numOfRings);
    },

    get numOfRings(){
        return this._numOfRings;
    }
}

const init = () => {
    audio.setupWebAudio(controllerObject._track);

    // Canvases refs
    canvasGroup = document.querySelector("#canvas-group")
    mainCanvas = document.querySelector("#main-canvas"); 
    visualizerCanvas = document.querySelector("#visualizer");

    // Setting up UI and canvas
    setupUI();
    canvas.setupCanvas(mainCanvas, visualizerCanvas);

    // Canvas size
    canvasHeight = canvas.getHeight();
    canvasWidth = canvas.getWidth();

    // Audio data refs
    analyserNode = audio.analyserNode;
    audioData = new Uint8Array(analyserNode.fftSize / 4);
    waveformData = new Uint8Array(analyserNode.fftSize / 4);

    // Initialize audio(frequency) and waveform data
    for(let i = 0; i < audioData.length; i++)
    {
        prevAudioData[i] = audioData[i];
    }

    // Movement event listeners
    document.addEventListener('keydown', function(e){
        player.addForce(e);
    });
    document.addEventListener('keyup', function(e){player.addForce(e)});

    // Fullscreen configurations for canvases
    document.onfullscreenchange = e => {
        if(document.fullscreenElement == null)
        {
            document.documentElement.style.setProperty('--canvas-width', '600px');
            document.documentElement.style.setProperty('--left', '0');
            document.documentElement.style.setProperty('--top', '0');
            document.documentElement.style.setProperty('--group-radius', '300px');
        }
    }

    loop();
}

const setupUI = () => {
    // Controls
    const gui = new dat.GUI({width: 600});

    gui.close();

    gui.add(controllerObject, 'play').name("Play audio");
    gui.add(controllerObject, 'track', {
        "The Wretched Automatons": "media/NieR - The Wretched Automatons.mp3",
        "Song of the Ancients - Fate": "media/NieR - Song of the Ancients - Fate.mp3",
        "Shadowlord": "media/NieR - Shadowlord.mp3",
        "Simone": "media/NieR Automata - Simone.mp3",
        "Dependent Weakling - 8 bit version": "media/NieR Automata - Dependent Weakling[8bit].mp3",
        "Weight of the World - 8 bit version": "media/NieR Automata - Weight of the World[8bit].mp3"
    }).name("Track");
    gui.add(controllerObject, 'volume').min(0).max(100).step(1).name("Volume");
        
    const canvas = gui.addFolder('Canvas Effects');
    canvas.add(drawParams, 'showGradient').name("Show Gradient");
    canvas.add(drawParams, 'showBars').name("Show Bars");
    canvas.add(drawParams, 'showCircles').name("Show Circles");
    canvas.add(controllerObject, 'maxRadius').min(100).max(300).step(1).name("Max Radius for Circles");
    canvas.add(controllerObject, 'numOfRings').min(1).max(25).step(1).name("Number of Rings for Cirlces");
    canvas.add(drawParams, 'showOuterRing').name("Show Outer Ring");
    canvas.add(drawParams, 'emilMode').name("Emil Mode");
    canvas.add(drawParams, 'showGame').name("Show Game");
    // Effects
    canvas.add(drawParams, 'showNoise').name("Show Noise");
    canvas.add(drawParams, 'showInvert').name("Show Invert");
    canvas.add(drawParams, 'showEmboss').name("Show Emboss");
    canvas.add(drawParams, 'showStatic').name("Show Static");

    const audio = gui.addFolder('Distortion effects');
    audio.add(controllerObject, 'distortionAmount').min(0).max(100).step(1).name("Distortion Amount");
    audio.add(distortionParams, 'normal').name("Disable distortion").listen().onChange(function(){setChecked("normal")});
    audio.add(distortionParams, 'static').name("Static distortion").listen().onChange(function(){setChecked("static")});
    audio.add(distortionParams, 'buzz').name("Buzz distortion").listen().onChange(function(){setChecked("buzz")});
    audio.add(distortionParams, 'boosted').name("Boosted distortion").listen().onChange(function(){setChecked("boosted")});

    gui.add(controllerObject, 'mode', {Frequency: "frequency", Waveform: "waveform"}).name("Mode");
    gui.add(controllerObject, 'clearProj').name("Clear Projectiles");
    gui.add(controllerObject, 'fullscreen').name("Fullscreen");

    const scoreLabel = document.querySelector("#scoreLabel");
    const instructionTab = document.querySelector('.drop-down-tab');
    const instructionContent = document.querySelector('#drop-down-content');

    instructionTab.onclick = (e) => {
        if(instructionContent.classList.contains('close'))
        {
            instructionContent.classList.remove('close');
            instructionTab.innerHTML = "Close Tab";
        }
        else
        {
            instructionContent.classList.add('close');
            instructionTab.innerHTML = "Instruction";
        }
    }
} 

const loop = () => {
    requestAnimationFrame(loop);

    // Update elasped time for progress bar
    if(!audio.element.paused)
    {
        audioCurrent = audio.audioCtx.currentTime;
        audioElapsed = audioCurrent - audioStart - audioPaused;
        progressBar.value = audioElapsed / audioDuration;
    }
    // Calculate cumulative pause time
    else if(controllerObject._playing)
    {
        audioPaused += audio.audioCtx.currentTime - audioCurrent;
        audioCurrent = audio.audioCtx.currentTime;
    }

    // Calculate deltaTime
    now = Date.now();
    deltaTime = (now - lastUpdate) / 1000;
    lastUpdate = Date.now();

    // Get audio data
    analyserNode.getByteFrequencyData(audioData);
    analyserNode.getByteTimeDomainData(waveformData); // waveform data

    canvas.draw(drawParams, mode, audioData, waveformData, deltaTime);

    timer += deltaTime;
    if(timer >= SPAWN_TIME) 
    {
        spawnProjectiles();
        timer = 0;
    }

    gameLoop();
}

const spawnProjectiles = () => {
    let numMultiplier = 8; // the higher the less spawn points there are
    let numOfSpawnPt = audioData.length / numMultiplier;   // number of spawning points
    let radiusOffset = 75; // The higher, the closer the inner radius is to the center
    let minimumHeight = 200; 
    let maximumHeight = 270;
    let innerRadius = canvasHeight / 2 - radiusOffset;
    let outerRadius = innerRadius + maximumHeight;
    let angleBetweenSpawnPt = 2 * Math.PI / numOfSpawnPt;

    for(let i = 0; i < numOfSpawnPt; i++)
    {
        let dataIndex = i * numMultiplier;
        let data = audioData[dataIndex];

        if(Math.abs(data - prevAudioData[dataIndex]) > 20 || data > 230)
        {
            let height = (maximumHeight - minimumHeight) * data / 255 + minimumHeight;  // calculate "height" of bar
            let radius = outerRadius - height; // convert to radius from center of canvas
            angleOffset = canvas.getAngleOffset(); 

            // Calculate spawn points position
            let x = Math.cos(-Math.PI / 2 + i * angleBetweenSpawnPt + angleOffset) * radius;
            let y = Math.sin(-Math.PI / 2 + i * angleBetweenSpawnPt + angleOffset) * radius;

            // Change color
            let colorString = i % 2 == 0? "rgb(251, 109, 22)" : "rgb(62, 10, 94)";

            // Normalize frequency data and spawn projectiles based on data
            let dataMultiplier = data / 255;
            projectiles.push(new classes.Projectile(x, y, 0 ,0, dataMultiplier, dataMultiplier, dataMultiplier, player, colorString));

            // Store data for next call
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

// Delete all projectiles 
const clearProjectiles = () => {
    projectiles.splice(0, projectiles.length);
}

const setChecked = ( prop ) => {
    for (let param in distortionParams){
        distortionParams[param] = false;
    }

    distortionParams[prop] = true;
}

const getProjectiles = () => {return projectiles;}
const getPlayer = () => {return player;}

export {init, getProjectiles, getPlayer};