var MINI = require('minified');
var _=MINI._, $=MINI.$, $$=MINI.$$, EE=MINI.EE, HTML=MINI.HTML;

// single entry point for multiple browsers
navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);


// Analyser object that can be queried to retrieve microphone data.
var g_analyser = null;

// Global map contaning all the training data: g_features[key code] = [ <features from sample 1>, <features from sample 2>, ...]
var g_features = { };

// Return the <li> Node for the given code
function getCharItem(code) 
{
    return $$("#sniffList li.sniff" + code + " span.value")
}

// a new key has been pressed on the training input field 
function trainingKeyPressed(code, data) {
        if(!getCharItem(code)) {
            var node = EE('li', { '@class': 'sniff' + code}, [
                            EE('span', { '@class': 'char'  }, String.fromCharCode(code)),
                            EE('span', { '@class': 'value' }, "0")
                        ]);
            $("#sniffList").add(node);
            g_features[code] = [ ];
        }
        g_features[code].push(data);
        var item = getCharItem(code);
        item.textContent = g_features[code].length;
        showData(data);
}


// Return the current fft data captured from the microphone.
function getCurrentFFTData()
{
    if(g_analyser) {
        var bufferLength = g_analyser.frequencyBinCount;
        var dataArray = new Float32Array(bufferLength);
        // g_analyser.getByteTimeDomainData() // to get more features ?
        
        // Question: is the data captured after the call or from just before the call ?
        g_analyser.getFloatFrequencyData(dataArray);
        return dataArray;
    } else {
        console.log("Analyser module not initialized");
    }
}


// Called when DOM is ready
$(function() {

    // https://docs.webplatform.org/wiki/apis/webaudio/AudioContext/createMediaStreamSource
    // real sample here: https://github.com/mdn/voice-change-o-matic/blob/gh-pages/scripts/app.js
    navigator.getUserMedia({ audio: true }, function(stream){ 
        var context = new (window.AudioContext || window.webkitAudioContext)();
        g_analyser = context.createAnalyser();
        var micStreamSource = context.createMediaStreamSource(stream);
        micStreamSource.connect(g_analyser);
        g_analyser.fftSize = 256;
    }, function(){ console.log('Error getting Microphone stream'); });
    

    $('#keyTrain').on('keypress', function(evt) { 
        trainingKeyPressed(evt.charCode, getCurrentFFTData());
    });

});