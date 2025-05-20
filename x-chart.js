#!/usr/bin/env node

/*{
  program   : make-chart-from.js,
  for       : make chart from json data,
  how       : $ ./x-chart.js data.json "title" bar|bar-h|line|pie [visit-data|std] [hide-datalabel]
  by        : @devster,
  license   : none/cc0,
  directory : $home/node-x,
  version   : 1.0,
  releasedDate: not yet,
}*/

// help
if (process.argv[2] === 'help') {
  console.log('! syntax:\n./make-chart-from.js data.json "chart title" bar*|bar-h|line|pie [visit-data|std] [hide-datalabel]')
  process.exit(0)
}

const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const { prepData } = require('./prep-data.js');
const ChartDataLabels = require('chartjs-plugin-datalabels'); // added

const width = 800;
const height = 600;

const chartCallback = (ChartJS) => {
  ChartJS.register(ChartDataLabels); // register datalabels
};

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback, backgroundColour: 'white' });

// Custom plugin to stamp 'x-chart' at top-right corner of the whole image
const cornerStampPlugin = {
  id: 'cornerStampPlugin',
  afterRender: (chart) => {
    const ctx = chart.ctx;
    const text = 'x-chart';
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(text, chart.width - 6, 6);
    ctx.restore();
  }
};

async function main() {
  const inputFile = process.argv[2];
  const chartTitle = process.argv[3] || 'Generated Chart';
  const chartTypeArg = process.argv[4] || 'bar';
  const dataFormat = process.argv[5];
  const showDataLabel = process.argv[6] !== 'hide-datalabel'

  const supportedChartTypes = ['bar', 'bar-h', 'line', 'pie'];
  if (!supportedChartTypes.includes(chartTypeArg)) {
    console.log(`! invalid chart type, use one of: ${supportedChartTypes.join(', ')}`);
    process.exit(1);
  }

  if (!inputFile) {
    console.error("! usage: ./x-chart.js <data.json> \"title\" chartType [visit-data]");
    process.exit(1);
  }

  let rawData;
  try {
    rawData = fs.readFileSync(inputFile, 'utf-8');
  } catch (err) {
    console.error(`! fail, reading file = ${inputFile}`);
    process.exit(1);
  }

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
    datasets = data.datasets.map(ds => {
      const color = randomColor();
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 6, //old is 1
        fill: chartType === 'line' ? false : true,
        tension: chartType === 'line' ? 0.3 : undefined
      };
    });
  } else {
    if (!data.x || !data.y || !Array.isArray(data.x) || !Array.isArray(data.y)) {
      console.error("JSON must contain 'x' and 'y' arrays.");
      process.exit(1);
    }
    datasets = [{
      label: chartTitle,
      data: data.y,
      backgroundColor: chartType === 'pie' ? data.x.map(_ => randomColor()) : randomColor(),
      borderColor: chartType === 'pie' ? data.x.map(_ => '#fff') : randomColor(),
      borderWidth: 6, //old is 1
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
      layout: {
        padding: 10
      },
      indexAxis: isHorizontal ? 'y' : 'x',
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: chartTitle,
          font: { size: 18 }
        },
        datalabels: showDataLabel ? {
          color: '#333',
          font: { size: 10 },
          anchor: 'end',
          align: 'top',
          offset: -6,
          formatter: Math.round
        } : false
      },
      scales: (chartType === 'bar' || chartType === 'line' || isHorizontal) ? {
        x: { beginAtZero: true },
        y: { ticks: { autoSkip: false } }
      } : undefined
    },
    plugins: [cornerStampPlugin]
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const outputFile = path.basename(inputFile, '.json') + '.png';
  fs.writeFileSync(outputFile, imageBuffer);
  console.log(`! output file = ${outputFile}`);
}

function randomColor() {
  const r = Math.floor(Math.random() * 156 + 100);
  const g = Math.floor(Math.random() * 156 + 100);
  const b = Math.floor(Math.random() * 156 + 100);
  return `rgb(${r}, ${g}, ${b})`;
}

main();
