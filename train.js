// to make the js linter happy !
var brain = brain || {}

var g_normalizedData = [];

var g_net = new brain.NeuralNetwork();
var g_min = [];
var g_max = [];
var g_selectedFeatures = [];

// features = training data features[<charCode>][<data>]
// selectedFeatures = features to select selectedFeatures[ ... ]
function computeNormalizationParams(features, selectedFeatures) {
    var data, featIndex, sample = {};
    g_selectedFeatures = selectedFeatures;    
    // put data in a brain-compliant data structure
    for (var char in features) {
        if(features.hasOwnProperty(char)) {
            for (var sampleIndex = 0; sampleIndex < features[char].length; sampleIndex ++) {
                var featSubset = new Float32Array(selectedFeatures.length);
                for(var f = 0; f < selectedFeatures.length; f++) {
                    featSubset[f] = features[char][sampleIndex][ selectedFeatures[f] ];    
                }
                sample = { input : featSubset, output: {} };
                sample.output[char] = 1
                g_normalizedData.push( sample );
            }
        }
    }
    
    // find min and max of each feature
    
    //Initialize
    g_min = new Float32Array(g_normalizedData[0].input); 
    g_max = new Float32Array(g_normalizedData[0].input); 

    for(data in g_normalizedData) {
        if(g_normalizedData.hasOwnProperty(data))  {
            for(featIndex = 0; featIndex < selectedFeatures.length; featIndex ++) {
                g_min[featIndex] = Math.min(g_min[featIndex], g_normalizedData[data].input[featIndex]);
                g_max[featIndex] = Math.max(g_max[featIndex], g_normalizedData[data].input[featIndex]);
            }
        }
    }
    
    // normalize features
    for(data in g_normalizedData) {
        if(g_normalizedData.hasOwnProperty(data))  {
            for(featIndex = 0; featIndex < selectedFeatures.length; featIndex ++) {
                g_normalizedData[data].input[featIndex] = (g_normalizedData[data].input[featIndex] - g_min[featIndex]) / (g_max[featIndex] - g_min[featIndex]);
            }
        }
    }
}

// return {error: errorRate, iterations:nbIterations }
function trainLearner() {
    console.log("start training");
    var result = g_net.train(g_normalizedData);
    console.log("done training");
    return result;
}


// return { char: proba }
function testKeyPressed(data) {
    // put data in a brain-compliant data structure
    var testData = new Float32Array(g_selectedFeatures.length);
    var tmp;
    for(var f = 0; f < g_selectedFeatures.length; f++) {
        tmp = data[ g_selectedFeatures[f] ];
        tmp = (tmp - g_min[f]) / (g_max[f] - g_min[f]);

        testData[f] = tmp;
    }
    return g_net.run(testData);
}