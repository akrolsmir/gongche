const charts = {};
export function renderChart(labelsToData, canvas) {
  const labels = Object.keys(labelsToData);
  const values = labels.map(label => labelsToData[label]);

  // Generate a nice green-to-blue gradient. From https://uigradients.com/#Meridian.
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 400, 0);
  gradient.addColorStop(0, '#45a247');
  gradient.addColorStop(1, '#283c86');

  if (canvas.id in charts) {
    const chart = charts[canvas.id];
    replaceData(chart, labels, values);
  } else {
    const dataset = {
      data: values,
      backgroundColor: gradient,
      label: 'Count'
    };
    const data = { labels, datasets: [dataset] };
    charts[canvas.id] = new Chart(canvas, {
      type: 'bar',
      data,
      options: { responsive: false }
    });
  }
}

function replaceData(chart, labels, data) {
  const oldCount = chart.data.labels.length
  for (let i = 0; i < oldCount; i++) {
    removeData(chart);
  }
  for (let i = 0; i < labels.length; i++) {
    addData(chart, labels[i], data[i]);
  }
}

function addData(chart, label, data) {
  chart.data.labels.push(label);
  chart.data.datasets.forEach((dataset) => {
    dataset.data.push(data);
  });
  chart.update();
}

function removeData(chart) {
  chart.data.labels.pop();
  chart.data.datasets.forEach((dataset) => {
    dataset.data.pop();
  });
  chart.update();
}
