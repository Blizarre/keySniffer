var MINI = require('minified');
var _=MINI._, $=MINI.$, $$=MINI.$$, EE=MINI.EE, HTML=MINI.HTML;

var CanvasJS = CanvasJS || {}

function showData(points) {
    var data = []; var dataSeries = { dataPoints: [], type: "line" };
    for(var p = 0; p < points.length; p++) {
        dataSeries.dataPoints.push( { x:p, y:points[p] } );
    }
    data.push(dataSeries);               

    var chart = new CanvasJS.Chart("chartContainer",
    {
      zoomEnabled: true,
      title:{
        text: "fft visualization" 
      },
      axisX:{
        minimum: 0,
        maximum: dataSeries.dataPoints.length      
      },
      legend: {
        horizontalAlign: "right",
        verticalAlign: "center"        
      },
      data: data,  // random generator below
      
   });

    chart.render();    
}
