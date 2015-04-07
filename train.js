"use strict";

// to make the js linter happy !
var brain = brain || {};

function Learner() {

    this.neuralNet = new brain.NeuralNetwork();

    // the index of the features selected for training / testing
    this.selectedFeatures = [];

    // Array of mainium and maximum values found on the training data for each selected feature
    this.featuresMinValue = [];
    this.featuresMaxValue = [];
}

// Convert from:
//    data = { label : [ [features], .. ] }
// to
//    data = [ { input:label, output: { label: 1 }, ... ]
//
// to reduce the number of memory allocation, the feature space reduction is done in the same step
// using index specified during the object creation
Learner.prototype.convertToBrainFormat = function(features) {
    // sample in brain format
    var sample, char, i;

    var convertedData = [];
    
    for (char in features) {
        if (features.hasOwnProperty(char)) {
            for (i = 0; i < features[char].length; i++) {
                sample = {
                    input: this.extractSubsetFeature(features[char][i]),
                    output: {}
                };
                sample.output[char] = 1;
                convertedData.push(sample);
            }
        }
    }
    
    return convertedData;
};

Learner.prototype.setSelectedFeatures = function(featuresIndex) {
    this.selectedFeatures = featuresIndex;
    
    // Normalization data invalidation
    this.featuresMinValue = [];
    this.featuresMaxValue = [];
};

Learner.prototype.extractSubsetFeature = function(originalArray) {
    var featSubset = new Float32Array(this.selectedFeatures.length);
    for (var f = 0; f < this.selectedFeatures.length; f++) {
        featSubset[f] = originalArray[this.selectedFeatures[f]];
    }
    return featSubset;
};


// find min and max of each feature
Learner.prototype.computeNormalizationParams = function(data) {
    var sample, i;

    //Initialize
    this.featuresMinValue = new Float32Array(data[0].input);
    this.featuresMaxValue = new Float32Array(data[0].input);

    for (sample in data) {
        if (data.hasOwnProperty(sample)) {
            for (i = 0; i < this.selectedFeatures.length; i++) {
                this.featuresMinValue[i] = Math.min(this.featuresMinValue[i], data[sample].input[i]);
                this.featuresMaxValue[i] = Math.max(this.featuresMaxValue[i], data[sample].input[i]);
            }
        }
    }
};


// Return a normalized version of the data.
Learner.prototype.normalize = function(data) {
    var sample, normSample, i;
    var normData = [];
    
    // normalize features
    for (sample in data) {
        if (data.hasOwnProperty(sample)) {
            normSample = {};
            normSample.input = new Float32Array(this.selectedFeatures.length);
            normSample.output = data[sample].output;
            for (i = 0; i < this.selectedFeatures.length; i++) {
                normSample.input[i] = (data[sample].input[i] - this.featuresMinValue[i]) / (this.featuresMaxValue[i] - this.featuresMinValue[i]);
            }
            normData.push(normSample);
        }
    }
    return normData;
};

// return {error: errorRate, iterations:nbIterations }
Learner.prototype.train = function(data) {
    console.log("start training");
    var result = this.neuralNet.train(this.normalize(data));
    console.log("done training");
    return result;
};

// Get data in brain format, and test on the first row of features.
// return { char: probability }
Learner.prototype.test = function(data) {
    return this.neuralNet.run(this.normalize(data)[0].input);
};