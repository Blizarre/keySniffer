var MINI = require('minified');
var _=MINI._, $=MINI.$, $$=MINI.$$, EE=MINI.EE, HTML=MINI.HTML;

var CanvasJS = CanvasJS || {}

var g_config = {};
    
g_config["time"] = {
    xlabel:"time in ms", 
    ylabel:"Power"
};

g_config["fft"] = {
    xlabel:"Frequency bin", 
    ylabel:"Power"
};


function showData(e) {
    var data = []; var dataSeries = { dataPoints: [], type: "line" };
    for(var p = 0; p < e.what.length; p++) {
        dataSeries.dataPoints.push( { x:p * e.binWidth, y:e.what[p] } );
    }
    data.push(dataSeries);               

    var chart = new CanvasJS.Chart(e.where,
    {
      zoomEnabled: true,
      title:{
        text: e.title
      },
      axisX:{
        title: g_config[e.type].xlabel,
      },
      axisY:{
        title: g_config[e.type].ylabel,
      },
      legend: {
        horizontalAlign: "right",
        verticalAlign: "center"        
      },
      data: data,
      
   });

    chart.render();    
}
