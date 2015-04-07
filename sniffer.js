var MINI = require('minified');
var _=MINI._, $=MINI.$, $$=MINI.$$, EE=MINI.EE, HTML=MINI.HTML;

var Learner = Learner || Learner;
var showData = showData || function(){};
var Recorder = Recorder || {};


// single entry point for multiple browsers
navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

// Object containing the training and testing routines for machine learning
var g_trainInfo = new Learner([]);


// Analyser object that can be queried to retrieve the fft of the microphone data.
var g_analyser = null;
// Recorder object that can be queried to retrieve the signal of the microphone data.
var g_audioRecorder = null;

// Global map containing all the training data: g_features[key code] = [ <features from sample 1>, <features from sample 2>, ...]
var g_features = { };

var g_wasKeyUpped= { 'training': true, 'testing': true };

// Pretty self-explanatory
var g_isDOMReady=false;



// Return the <li> Node of the training view for the given code
function getCharItem(code) 
{
    return $$("#trainSampleList li.sniff" + code + " span.value");
}


// a new key has been pressed on the training input field 
function inputKeyPressed(type, code, dataFFT, dataTime) {
    if(type == "training") {
        if(!getCharItem(code)) {
            var node = EE('li', { '@class': 'sniff' + code}, [
                            EE('span', { '@class': 'char'  }, String.fromCharCode(code)),
                            EE('span', { '@class': 'value' }, "0")
                        ]);
            $("#trainSampleList").add(node);
            g_features[code] = [ ];
        }
        g_features[code].push(dataFFT);
        var item = getCharItem(code);
        item.textContent = g_features[code].length;
    } else {
        var result = g_trainInfo.test( g_trainInfo.convertToBrainFormat( {"?": [ dataFFT ] } ) );
        var char;
        $("#keyTestResult").fill();
    
        for(char in result) {
            if(result.hasOwnProperty(char)) {
                var cssProperty =  {$: char==code?"label":"noise"};
                $("#keyTestResult").add(EE('li', cssProperty,  String.fromCharCode(char) + ": " + result[char] ));
            }
        }
    }
    
    // Test some display
    
    // find maximum
    var maxValue=-1;
    var idxMax=-1;
    for (var i=0; i<dataTime.length; i++)
    {
        if (Math.abs(dataTime[i])>maxValue)
        {
           maxValue=Math.abs(dataTime[i]);
           idxMax=i;
        }
    }
    
    // What are we looking for ? Ideally an area with very strong high frequencies....
    // Lots of false positives with the current system right now.
    //
    // An idea: Look for the *first* disruption in the sound data ?
    var timeBefore=3; //ms
    var timeAfter=3; //ms
    var minIdxSignal=idxMax-timeBefore*g_audioRecorder.context.sampleRate/1000;
    var maxIdxSignal=idxMax+timeAfter*g_audioRecorder.context.sampleRate/1000;

    minIdxSignal=(minIdxSignal<0)?0:minIdxSignal;
    maxIdxSignal=(maxIdxSignal<dataTime.length)?maxIdxSignal:dataTime.length-1;
    
    
    var slicedSignal=dataTime.slice(minIdxSignal, maxIdxSignal);
    showData({what: slicedSignal , where: "areaAroundPeak" , title: "Small area around the peak value" });
    
    showData({what: dataFFT , where: "chartContainerFFT" , title: "fft visualization" });
    showData({what: dataTime, where: "chartContainerTime", title: "time visualization"});
}


// Return the current fft data captured from the microphone.
function getCurrentFFTData()
{
    if(g_analyser) {
        var bufferLength = g_analyser.frequencyBinCount;
        var dataArray = new Float32Array(bufferLength);

        g_analyser.getFloatFrequencyData(dataArray);
        return dataArray;
    } else {
        console.log("Analyser module not initialized");
    }
}

function getFeaturesToKeep() {
    return $$('#featureToKeep').value.split(" ").map(Number);
}




function inputKeyDownPressed(type, evt) {
    if (!g_isDOMReady) return;
    
    if (g_wasKeyUpped[type]===true) {
        g_wasKeyUpped[type]=false; 
        
        setTimeout(function(){
            inputKeyPressed(type, evt.which, getCurrentFFTData(), g_audioRecorder.getLastSamples(150));
        },100);
        
        $('#computeNormParams').set('disabled', null);
        $('#featureToKeep').set('disabled', null);
    }
}

function computeNormParams() {
    g_trainInfo.setSelectedFeatures(getFeaturesToKeep());
    var data = g_trainInfo.convertToBrainFormat(g_features);
    g_trainInfo.computeNormalizationParams(data);
    $('#trainFromData').set('disabled', null);
}

function trainFromData() {
    var done = g_trainInfo.train( g_trainInfo.convertToBrainFormat(g_features) );
    $$("#nbIter").textContent = done.iterations.toString();
    $$("#errorRate").textContent = done.error.toString();
    $('#keyTest').set('disabled', null);
};
    
function inputKeyUpPressed(type, evt) {
    g_wasKeyUpped[type]=true;
}


// https://docs.webplatform.org/wiki/apis/webaudio/AudioContext/createMediaStreamSource
// real sample here: https://github.com/mdn/voice-change-o-matic/blob/gh-pages/scripts/app.js
//
// W3C draft: http://webaudio.github.io/web-audio-api/#widl-AnalyserNode-fftSize
navigator.getUserMedia({
        "audio": {
            "mandatory": {
                "googEchoCancellation": "false",
                "googAutoGainControl": "false",
                "googNoiseSuppression": "false",
                "googHighpassFilter": "false"
            },
            "optional": []
        },
    }, setMediaStream, function(){ console.log('Error getting Microphone stream'); });

    
// Function called after a successful call to getUserMedia.
function setMediaStream(stream){ 
    var context = new (window.AudioContext || window.webkitAudioContext)();
    g_analyser = context.createAnalyser();
    var micStreamSource = context.createMediaStreamSource(stream);

    micStreamSource.connect(g_analyser);
    g_analyser.fftSize = 2048;
    g_analyser.smoothingTimeConstant = 0;
    
    g_analyser.connect(context.destination);
    
    // get time data
    var inputPoint = context.createGain();
    g_analyser.connect(inputPoint);

    var analyserNode = context.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    g_audioRecorder = new Recorder( inputPoint, { bufferLen: analyserNode.fftSize, timeMaxLen: 20000} );
}


// Called when DOM is ready
$(function() {
    g_isDOMReady=true;
});
