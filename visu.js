var MINI = require('minified');
var _=MINI._, $=MINI.$, $$=MINI.$$, EE=MINI.EE, HTML=MINI.HTML;


function showData(e) {
    var data = []; var dataSeries = { dataPoints: [], type: "line" };
    for(var p = 0; p < e.what.length; p++) {
        dataSeries.dataPoints.push( { x:p, y:e.what[p] } );
    }
    data.push(dataSeries);               

    var chart = new CanvasJS.Chart(e.where,
    {
      zoomEnabled: true,
      title:{
        text: e.title
      },
      axisX:{
        minimum: 0,
        maximum: dataSeries.dataPoints.length      
      },
      legend: {
        horizontalAlign: "right",
        verticalAlign: "center"        
      },
      data: data,
      
   });

    chart.render();    
}
