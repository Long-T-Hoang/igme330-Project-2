// 1 - our WebAudio context, **we will export and make this public at the bottom of the file**
let audioCtx;

// **These are "private" properties - these will NOT be visible outside of this module (i.e. file)**
// 2 - WebAudio nodes that are part of our WebAudio audio routing graph
let element, sourceNode, analyserNode, gainNode;
let distortionAmount = 20;
let distortionFilter;

// 3 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
    gain: .5,
    numSamples: 256
});

// 4 - create a new array of 8-bit integers (0-255)
// this is a typed array to hold the audio frequency data
let audioData = new Uint8Array(DEFAULTS.numSamples / 2);

// **Next are "public" methods - we are going to export all of these at the bottom of this file**
const setupWebAudio = (filePath) => {
    
    // 1 - The || is because WebAudio has not been standardized across browsers yet
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();


    // 2 - this creates an <audio> element
    element = new Audio();

    // 3 - have it point at a sound file
    loadSoundFile(filePath);

    // 4 - create an a source node that points at the <audio> element
    sourceNode = audioCtx.createMediaElementSource(element);

    // 5 - create an analyser node
    // note the UK spelling of "Analyser"
    analyserNode = audioCtx.createAnalyser();

    distortionFilter = audioCtx.createWaveShaper();

    // fft stands for Fast Fourier Transform
    analyserNode.fftSize = DEFAULTS.numSamples;

    // 7 - create a gain (volume) node
    gainNode = audioCtx.createGain();
    gainNode.gain.value = DEFAULTS.gain;

    // 8 - connect the nodes - we now have an audio graph
    sourceNode.connect(analyserNode);
    analyserNode.connect(distortionFilter);
    distortionFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
}

const toggleDistortion = (params={}) => {
    if(!params.normal){
        distortionFilter.curve = null; // being paranoid and trying to trigger garbage collection
        distortionFilter.curve = makeDistortionCurve(distortionAmount, params);
    }
    else
    {
        distortionFilter.curve = null;
    }
}
  
  // from: https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
const makeDistortionCurve = (amount=20, params={}) => {
    let n_samples = 256, curve = new Float32Array(n_samples);

    for (let i =0 ; i < n_samples; ++i ) {
        let x = i * 2 / n_samples - 1;

        if(params["static"]) curve[i] = x * (Math.random() * amount / 100 + 1);  // Slight static distortion

        if(params["buzz"]) curve[i] = x + Math.sin(Math.pow(x, 2)) * amount / 50; // Kind of buzzing distortion
        
        if(params["boosted"]) curve[i] = x * Math.PI * 3 / (Math.PI + 20 * Math.abs(x)) * amount / 100;
    }

    return curve;
}

const loadSoundFile = (filePath) => { element.src = filePath; }

const playCurrentSound = () => { element.play(); }

const pauseCurrentSound = () => { element.pause(); }

const setVolume = (value) => {
    value = Number(value);
    gainNode.gain.value = value;
}

const setDistortionAmount = (distortion) => {distortionAmount = distortion;}

export{audioCtx, setupWebAudio, playCurrentSound, 
    pauseCurrentSound, loadSoundFile, setVolume, 
    analyserNode, element, toggleDistortion, setDistortionAmount};