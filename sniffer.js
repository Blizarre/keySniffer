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

var g_perfs = { nbOk: 0, nbTotal: 0 };
    
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
    } else { // todo: create function
        var result = g_trainInfo.test( g_trainInfo.convertToBrainFormat( {"?": [ dataFFT ] } ) );
        var char;
        $("#keyTestResult").fill();
        var max = {key:"", val:-1000.0};
        for(char in result) {
            if(result.hasOwnProperty(char)) {
                if(result[char] > max.val) { 
                    max.val = result[char], max.key = char;
                }
                var cssProperty =  {$: char==code?"+label":""};
                $("#keyTestResult").add(EE('li', cssProperty,  String.fromCharCode(char) + ": " + result[char] ));
            }
        }
        if(max.key === char) {
            g_perfs.nbOk ++;
        } 
        g_perfs.nbTotal ++;
        $$("#perf").textContent = "Perf: " + (100.0 * g_perfs.nbOk / g_perfs.nbTotal).toFixed(2) + "% over " + g_perfs.nbTotal + " tests"; 
    }
    
    // Test some display
    

    var ROILen=10; // Length of the ROI to keep
    var TimeROI = getROIOverall(dataTime, ROILen); //getROIAroundMax(dataTime, ROILen);
    
    var fft = new FFT(TimeROI.ROIData.length, 44100);
    fft.forward(TimeROI.ROIData);
    var spectrum = fft.spectrum;
    
    
    var isValidTouch=isDataValid(dataTime, TimeROI);

    var frequency = g_audioRecorder.context.sampleRate;
    
    if( $("#updateGraphs").get("checked")) {
        if (isValidTouch)
        {
            showData({what: TimeROI.ROIData , where: "areaAroundPeak" , title: "Small area around the peak value", type:"time", binWidth : 1000 / frequency} );
            showData({what: spectrum , where: "chartContainerFFTZoom" , title: "FFT of small area around the peak value", type:"time", binWidth : 1} );
        }
        else
        {
            $$( "#areaAroundPeak" ).textContent= "INVALID SIGNAL" ;
            $$( "#chartContainerFFTZoom" ).textContent= "INVALID SIGNAL" ;
        }
        showData({what: dataFFT , where: "chartContainerFFT" , title: "fft visualization", type:"fft", binWidth : 1});
        showData({what: dataTime, where: "chartContainerTime", title: "time visualization", type:"time", binWidth : 1000 / frequency});
    }
        
}

function getROIAroundMax(dataTime, ROILen)
{
    // find maximum along the signal
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
    
    var frequency = g_audioRecorder.context.sampleRate;
    var nbSamplesAround=ROILen*frequency/1000;
    
    nbSamplesAround=Math.pow( 2, Math.ceil( Math.log( nbSamplesAround ) / Math.log( 2 ) ) ); // Get the upper power of 2
    
    // Find the area with the most power
    var scores = new Float32Array(nbSamplesAround);
    var startPos, stopPos;
    
    // test the sliding at all the possibles possitions (can be more efficient but OK we have a fucking cluster around :p)
    // No use of Hilbert transform... not the time
    // Why using the maximum, why not searching on the whole signal cut
    for (var i=0; i<nbSamplesAround; i++)
    {
        startPos=idxMax-nbSamplesAround+i;
        stopPos=idxMax+i;
        
        if ((startPos<0)||(stopPos>=dataTime.length)) 
        {
            scores[i]=-1;
        }
        else
        {
            scores[i]=dataTime.slice(startPos, stopPos).reduce(function(lastVal, currVal, idx, arr){return lastVal + Math.abs(currVal);});
        }
    }
    
    // get the maximum score
    var max=-1, maxPos=-1;
    for (var i=0; i<scores.length; i++)
    {
        if (scores[i]>max)
        {
            max=scores[i];
            maxPos=i;
        }
    }
    
    if (maxPos==-1) return null;
    
    var cutSignal=dataTime.slice( idxMax-nbSamplesAround+maxPos, idxMax+maxPos);
    
    return {ROIStart: idxMax-nbSamplesAround+maxPos,
             ROIStop: idxMax+maxPos,
             ROIData: cutSignal,
              ROIAvg: cutSignal.reduce(function(lastVal, currVal, idx, arr){return lastVal + Math.abs(currVal);})/cutSignal.length};
}


function getROIOverall(dataTime, ROILen)
{
    var frequency = g_audioRecorder.context.sampleRate;
    var nbSamplesAround=ROILen*frequency/1000;
    nbSamplesAround=Math.pow( 2, Math.ceil( Math.log( nbSamplesAround ) / Math.log( 2 ) ) ); // Get the upper power of 2
    
    // Find the area with the most power
    var scores = new Float32Array(dataTime.length-nbSamplesAround);
    var startPos, stopPos;
    
    // test the sliding at all the possibles possitions (can be more efficient but OK we have a fucking cluster around :p)
    // No use of Hilbert transform... not the time
    // Why using the maximum, why not searching on the whole signal cut
    for (var i=0; i<dataTime.length-nbSamplesAround; i++)
    {
        startPos=i;
        stopPos=nbSamplesAround+i;

        scores[i]=dataTime.slice(startPos, stopPos).reduce(function(lastVal, currVal, idx, arr){return lastVal + Math.abs(currVal);});
    }
    
    // get the maximum score
    var max=-1, maxPos=-1;
    for (var i=0; i<scores.length; i++)
    {
        if (scores[i]>max)
        {
            max=scores[i];
            maxPos=i;
        }
    }
    
    if (maxPos==-1) return null;
    
    var cutSignal=dataTime.slice( maxPos, nbSamplesAround+maxPos);
    
    return {ROIStart: maxPos,
             ROIStop: nbSamplesAround+maxPos,
             ROIData: cutSignal,
              ROIAvg: cutSignal.reduce(function(lastVal, currVal, idx, arr){return lastVal + Math.abs(currVal);})/cutSignal.length};
}


function isDataValid(dataTime, TimeROI)
{
    // Get average of 
    var avgLen=0;
    var avg=0.0;
    
    for (var i=0; i<dataTime.length; i++)
    {
        if ((i>=TimeROI.ROIStart)&&(i<TimeROI.ROIStop)) continue;
        avgLen++;
        avg+= Math.abs(dataTime[i]);
    }
    avg/=avgLen;
    
    
    // return if the ratio between the maximum area and the rest is kinda high
    return (TimeROI.ROIAvg/avg)>3;
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
    $$("#errorRate").textContent = (100.0 * done.error).toFixed(2);
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
    
    // Remove loopback, sorry Remy, you know it works now right ?
    //g_analyser.connect(context.destination);
    
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
