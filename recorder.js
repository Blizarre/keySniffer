  var Recorder = function(source, cfg){
    var config = cfg;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(config.bufferLen, 1, 1);
    } else {
       this.node = this.context.createScriptProcessor(config.bufferLen, 1, 1);
    }

    var buffers = [];
    this.node.onaudioprocess = function(e){
      var r1=e.inputBuffer.getChannelData(0);
      var len_before = buffers.length;
      for (var i = 0; i <r1.length; i ++) {
            buffers[len_before + i] = r1[i];
      }
      
      if (buffers.length>config.timeMaxLen)
      {
        buffers=buffers.slice(-config.timeMaxLen);
      }
    }

    this.getLastSamples = function(lastMs)
    {
      var nbSample = lastMs*this.context.sampleRate/1000;
      if (nbSample>config.timeMaxLen-1) nbSample=config.timeMaxLen-1;
      
      return buffers.slice(-nbSample);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };