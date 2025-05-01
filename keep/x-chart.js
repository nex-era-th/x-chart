#!/usr/bin/env node

/*{
  program   : make-chart-from.js,
  for       : make chart from json data,
  how       : $ ./make-chart-from.js data.json "chart title" bar|bar-h|line|pie [visit-data]
  by        : @devster,
  license   : none/cc0,
  directory : $home/node-x,
  version   : 0.7,
  releasedDate: not yet,
}*/

if (process.argv[2] === 'help') {
  console.log('syntax:\n./make-chart-from.js data.json "chart title" bar*|bar-h|line|pie [visit-data]');
  process.exit(0);
}

const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const { prepData } = require('./prep-data.js');
const chartjsPluginDatalabels = require('chartjs-plugin-datalabels');

const width = 800;
const height = 600;

const chartCallback = (ChartJS) => {
  ChartJS.register(chartjsPluginDatalabels);
};

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback,
  backgroundColour: 'white'
});

async function main() {
  const inputFile = process.argv[2];
  const chartTitle = process.argv[3] || 'Generated Chart';
  const chartTypeArg = process.argv[4] || 'bar';
  const dataFormat = process.argv[5];

  const supportedChartTypes = ['bar', 'bar-h', 'line', 'pie'];
  if (!supportedChartTypes.includes(chartTypeArg)) {
    console.log(`! invalid chart type, use one of: ${supportedChartTypes.join(', ')}`);
    process.exit(1);
  }

  if (!inputFile) {
    console.error("! usage: ./make-chart-from.js <data.json> \"title\" chartType [visit-data]");
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputFile, 'utf-8');
  let data = JSON.parse(rawData);

  // preprocess
  if (dataFormat === 'visit-data') {
    data = {
      x: data.map(v => v.page),
      y: data.map(v => v.count)
    };
  } else {
    data = prepData(data);
  }

  const isMultiDataset = Array.isArray(data.datasets);
  const isHorizontal = chartTypeArg === 'bar-h';
  const chartType = isHorizontal ? 'bar' : chartTypeArg;

  let datasets;

  if (isMultiDataset) {
    datasets = data.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: randomColor(),
      borderColor: chartType === 'line' ? randomColor() : undefined,
      borderWidth: 1,
      fill: chartType === 'line' ? false : true,
      tension: chartType === 'line' ? 0.3 : undefined
    }));
  } else {
    if (!data.x || !data.y || !Array.isArray(data.x) || !Array.isArray(data.y)) {
      console.error("JSON must contain 'x' and 'y' arrays.");
      process.exit(1);
    }
    datasets = [{
      label: chartTitle,
      data: data.y,
      backgroundColor: chartType === 'pie' ? data.x.map(_ => randomColor()) : 'rgba(54, 162, 235, 0.6)',
      borderColor: chartType === 'pie' ? data.x.map(_ => '#fff') : 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
      fill: chartType === 'line' ? false : true,
      tension: chartType === 'line' ? 0.3 : undefined
    }];
  }

  const configuration = {
    type: chartType,
    data: {
      labels: data.x,
      datasets: datasets
    },
    options: {
      indexAxis: isHorizontal ? 'y' : 'x',
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: chartTitle,
          font: { size: 18 }
        },
        datalabels: {
          color: '#000',
          anchor: 'end',
          align: 'top',
          font: { weight: 'bold' },
          formatter: Math.round
        }
      },
      scales: (chartType === 'bar' || chartType === 'line' || isHorizontal) ? {
        x: { beginAtZero: true },
        y: { ticks: { autoSkip: false } }
      } : undefined
    },
    plugins: [chartjsPluginDatalabels]
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const outputFile = path.basename(inputFile, '.json') + '.png';
  fs.writeFileSync(outputFile, imageBuffer);
  console.log(`Chart saved as ${outputFile}`);
}

function randomColor() {
  const r = Math.floor(Math.random() * 156 + 100);
  const g = Math.floor(Math.random() * 156 + 100);
  const b = Math.floor(Math.random() * 156 + 100);
  return `rgb(${r}, ${g}, ${b})`;
}

main();
