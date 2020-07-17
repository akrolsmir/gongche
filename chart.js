export class KeyCounter {
  constructor(minKey = '0') {
    this.map = {};
    this.map[minKey] = 0;
  }

  /** @param key a positive integer to count.  */
  count(key) {
    if (key in this.map) {
      this.map[key]++;
    } else {
      this.map[key] = 1;
    }
    return this.map;
  }
}

const charts = {};
export function renderChart(labelsToData, canvas) {
  // Generate a nice green-to-blue gradient. From https://uigradients.com/#Meridian.
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 400, 0);
  gradient.addColorStop(0, '#45a247');
  gradient.addColorStop(1, '#283c86');

  const [labels, values] = cleanLabels(labelsToData);
  if (canvas.id in charts) {
    const chart = charts[canvas.id];
    replaceData(chart, labels, values);
  } else {
    const dataset = {
      data: values,
      backgroundColor: gradient,
      label: 'Count',
    };
    const data = { labels, datasets: [dataset] };
    charts[canvas.id] = new Chart(canvas, {
      type: 'bar',
      data,
      options: {
        responsive: false,
        scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
      },
    });
  }
}

function cleanLabels(labelsToData) {
  // Ensure that the chart is continuously labeled from min to max.
  const intLabels = Object.keys(labelsToData).map(Number);
  const minLabel = Math.min(...intLabels);
  const maxLabel = Math.max(...intLabels);
  const labels = [];
  for (let i = minLabel; i <= maxLabel; i++) {
    labels.push(i);
  }
  const values = labels.map((label) =>
    label in labelsToData ? labelsToData[label] : 0
  );
  return [labels, values];
}

function replaceData(chart, labels, data) {
  const oldCount = chart.data.labels.length;
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

Vue.component('confusion-matrix', {
  props: ['matrix'],
  template: `
<table>
  <tbody>
    <tr>
      <th>From</th>
      <th :colspan='matrix[0].length'>To</th>
    </tr>
    <tr>
      <th></th>
      <template v-for='i in matrix.length'>
        <th>{{ i }}</th>
      </template>
    </tr>
    <template v-for='(row, i) in matrix'>
      <tr>
        <th>{{ i + 1 }}</th>
        <template v-for="entry in row">
          <td>{{ entry }}</td>
        </template>
      </tr>
    </template>
  </tbody>
</table>
  `,
});
