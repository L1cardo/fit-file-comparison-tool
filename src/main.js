import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import FitParser from "fit-file-parser";
import "./styles.css";

const fileInput = document.getElementById("fileInput");
const compareButton = document.getElementById("compareButton");
const timeButton = document.getElementById("timeButton");
const distanceButton = document.getElementById("distanceButton");
const chartContainer = document.getElementById("charts");
const loadingIndicator = document.getElementById("loadingIndicator");
const fileInfoTableContainer = document.getElementById("fileInfoTableContainer");
const processingTimeContainer = document.getElementById("processingTimeContainer");
const processingTimeElement = document.getElementById("processingTime");

let coordinateType = "time";
let chartInstances = [];

const updateButtonStyles = () => {
  timeButton.classList.toggle("active", coordinateType === "time");
  distanceButton.classList.toggle("active", coordinateType === "distance");
};

timeButton.addEventListener("click", () => {
  coordinateType = "time";
  updateButtonStyles();
  handleFileCompare();
});

distanceButton.addEventListener("click", () => {
  coordinateType = "distance";
  updateButtonStyles();
  handleFileCompare();
});

document.addEventListener('DOMContentLoaded', () => {
  updateButtonStyles();
});
compareButton.addEventListener("click", handleFileCompare);

async function handleFileCompare() {
  const files = fileInput.files;
  if (files.length === 0) {
    alert("请至少选择一个文件来对比");
    return;
  }

  const startTime = performance.now();
  showLoadingIndicator(true);

  try {
    const allData = await parseFiles(files);
    console.log(allData);
    displayFileInfo(allData);
    displayData(allData);
    displayProcessingTime(startTime);
  } catch (error) {
    console.error(error);
    alert("文件处理过程中发生错误");
  } finally {
    showLoadingIndicator(false);
  }
}

async function parseFiles(files) {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "km/h",
    lengthUnit: "km",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "cascade",
  });

  const allDataPromises = Array.from(files).map(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          fitParser.parse(event.target.result, (error, data) => {
            if (error) {
              reject(error);
            } else {
              resolve({ data, fileName: file.name });
            }
          });
        };
        reader.readAsArrayBuffer(file);
      })
  );

  return Promise.all(allDataPromises);
}

function showLoadingIndicator(show) {
  loadingIndicator.style.display = show ? "block" : "none";
  processingTimeContainer.style.display = show ? "none" : "block";
}

function displayProcessingTime(startTime) {
  const endTime = performance.now();
  const processingTime = ((endTime - startTime) / 1000).toFixed(2);
  processingTimeElement.textContent = processingTime;
  processingTimeContainer.style.display = "block";
}

function displayFileInfo(allData) {
  const table = document.createElement("table");
  table.classList.add("file-info-table");

  const headers = ["文件名", "运动类型", "开始时间", "结束时间", "总时间", "总距离", "总上升高度", "总下降高度", "总卡路里", "最大步频/踏频", "平均步频/踏频", "最大心率", "平均心率", "最大速度", "平均速度", "最大功率", "平均功率", "标准化功率", "设备信息"];
  table.appendChild(createTableRow(headers, "th"));

  allData.forEach(({ data, fileName }) => {
    const session = data.activity.sessions[0];
    const events = data.activity.events;
    const startEvent = events.find((event) => event.event_type === "start");
    const stopEvent = events.find((event) => event.event_type === "stop_all");

    const cells = [fileName, session.sport || "", startEvent ? formatDate(startEvent.timestamp) : "", stopEvent ? formatDate(stopEvent.timestamp) : "", formatTime(session.total_elapsed_time), formatDistance(session.total_distance), formatAltitude(session.total_ascent), formatAltitude(session.total_descent), `${session.total_calories} kcal`, `${session.max_cadence} ${getUnit("cadence", session.sport)}`, `${session.avg_cadence} ${getUnit("cadence", session.sport)}`, `${session.max_heart_rate} bpm`, `${session.avg_heart_rate} bpm`, `${session.max_speed.toFixed(2)} km/h`, `${session.avg_speed.toFixed(2)} km/h`, `${session.max_power} w`, `${session.avg_power} w`, `${session.normalized_power} w`, data.activity.device_infos[0]?.product_name || ""];
    table.appendChild(createTableRow(cells, "td"));
  });

  fileInfoTableContainer.innerHTML = "";
  fileInfoTableContainer.appendChild(table);
}

function createTableRow(cells, cellTag) {
  const row = document.createElement("tr");
  cells.forEach((cellText) => {
    const cell = document.createElement(cellTag);
    cell.textContent = cellText;
    row.appendChild(cell);
  });
  return row;
}

function displayData(allData) {
  clearPreviousCharts();

  const overallDatasets = {
    heartRate: [],
    speed: [],
    cadence: [],
    altitude: [],
  };

  let maxLabels = [];

  allData.forEach(({ data, fileName }, index) => {
    const records = getRecords(data.activity.sessions);
    const sport = data.activity.sessions[0].sport;
    if (records.length === 0) {
      console.error(`No records found for file: ${fileName}`);
      return;
    }

    const labels = createLabels(records, coordinateType);
    if (labels.length > maxLabels.length) {
      maxLabels = labels;
    }
    const datasets = createDatasets(records);

    chartInstances.push(createChart(fileName, labels, datasets, sport));
    addToOverallDatasets(overallDatasets, datasets, fileName, index);
  });

  Object.keys(overallDatasets).forEach((key) => {
    const sport = allData[0].data.activity.sessions[0].sport;
    chartInstances.push(createComparisonChart(key, overallDatasets[key], maxLabels, sport));
  });
}

function clearPreviousCharts() {
  chartContainer.innerHTML = "";
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances = [];
}

function getRecords(sessions) {
  return sessions.flatMap((session) => session.laps.flatMap((lap) => lap.records));
}

function createLabels(records, coordinateType) {
  return records.map((record) => (coordinateType === "distance" ? formatDistance(record.distance) : formatTime(record.elapsed_time)));
}

function createDatasets(records) {
  return {
    heartRate: records.map((record) => record.heart_rate),
    speed: records.map((record) => (record.speed * 1).toFixed(2)),
    cadence: records.map((record) => record.cadence),
    altitude: records.map((record) => (record.altitude * 1000).toFixed(0)),
  };
}

function addToOverallDatasets(overallDatasets, datasets, fileName, index) {
  Object.keys(overallDatasets).forEach((key) => {
    overallDatasets[key].push({
      label: fileName,
      data: datasets[key],
      borderWidth: 1,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
    });
  });
}

function createChart(fileName, labels, datasets, sessions, sport) {
  const canvas = document.createElement("canvas");
  const chartWrapper = document.createElement("div");
  chartWrapper.classList.add("chart-container");
  chartWrapper.appendChild(canvas);

  // 添加提示框
  const tooltipText = document.createElement("div");
  tooltipText.classList.add("chart-tooltip");
  tooltipText.innerHTML = "左键框选区域放大<br>Ctrl+鼠标左键平移<br>双击重置缩放";
  chartWrapper.appendChild(tooltipText);

  const controls = document.createElement("div");
  controls.classList.add("chart-controls");
  controls.innerHTML = `
        <button onclick="zoomIn(event)">＋</button>
        <button onclick="zoomOut(event)">－</button>
        <button onclick="resetZoom(event)">🔄</button>
    `;
  chartWrapper.appendChild(controls);
  chartContainer.appendChild(chartWrapper);

  // 过滤掉非数字值并计算最大值
  const filterNonNumeric = (data) => data.filter((value) => !isNaN(value) && isFinite(value));
  const maxValue = Math.max(...filterNonNumeric(datasets.heartRate));

  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: Object.keys(datasets).map((key) => ({
        label: getLocalizedName(key, sport),
        data: datasets[key],
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      onClick(event, elements, chart) {
        if (event.native.ctrlKey) {
          chart.panZoom.dragEnabled = !chart.panZoom.dragEnabled;
        }
      },
      onDblClick(event, elements, chart) {
        chart.resetZoom();
      },
      scales: {
        y: {
          suggestedMax: maxValue,
        },
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "ctrl", // 按住ctrl键平移
          },
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: "rgba(0,0,0,0.1)",
              modifierKey: null, // 默认左键缩放
            },
            mode: "x",
          },
        },
        legend: {
          display: true,
          labels: {
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: fileName,
          font: {
            size: 18,
          },
        },
        tooltip: {
          mode: "index",
          position: "nearest",
          intersect: false,
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}${getUnitFromChinese(tooltipItem.dataset.label)}`,
          },
        },
      },
    },
  });

  canvas.addEventListener("dblclick", () => {
    chart.resetZoom();
  });

  canvas.chart = chart; // 方便后续调用

  return chart;
}

function createComparisonChart(sportLabel, datasets, labels, sport) {
  //const sport = datasets[0].data.activity.sessions[0].sport;
  const canvas = document.createElement("canvas");
  const chartWrapper = document.createElement("div");
  chartWrapper.classList.add("chart-container");
  chartWrapper.appendChild(canvas);

  // 添加提示框
  const tooltipText = document.createElement("div");
  tooltipText.classList.add("chart-tooltip");
  tooltipText.innerHTML = "左键框选区域放大<br>Ctrl+鼠标左键平移<br>双击重置缩放";
  chartWrapper.appendChild(tooltipText);

  const controls = document.createElement("div");
  controls.classList.add("chart-controls");
  controls.innerHTML = `
        <button onclick="zoomIn(event)">＋</button>
        <button onclick="zoomOut(event)">－</button>
        <button onclick="resetZoom(event)">🔄</button>
    `;
  chartWrapper.appendChild(controls);
  chartContainer.appendChild(chartWrapper);

  // 过滤掉非数字值并计算最大值
  const filterNonNumeric = (data) => data.filter((value) => !isNaN(value) && isFinite(value));
  const maxValue = Math.max(...filterNonNumeric(datasets[0].data));
  const minValue = Math.min(...filterNonNumeric(datasets[0].data));

  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      onClick(event, elements, chart) {
        if (event.native.ctrlKey) {
          chart.panZoom.dragEnabled = !chart.panZoom.dragEnabled;
        }
      },
      onDblClick(event, elements, chart) {
        chart.resetZoom();
      },
      scales: {
        y: {
          suggestedMax: maxValue,
          suggestedMin: minValue,
        },
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "ctrl", // 按住ctrl键平移
          },
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: "rgba(0,0,0,0.1)",
              modifierKey: null, // 默认左键缩放
            },
            mode: "x",
          },
        },
        legend: {
          display: true,
          labels: {
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: `总对比：${getLocalizedName(sportLabel, sport)}`,
          font: {
            size: 18,
          },
        },
        tooltip: {
          mode: "index",
          position: "nearest",
          intersect: false,
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}${getUnit(sportLabel, sport)}`,
          },
        },
      },
    },
  });

  canvas.addEventListener("dblclick", () => {
    chart.resetZoom();
  });

  canvas.chart = chart; // 方便后续调用

  return chart;
}

window.zoomIn = function (event) {
  const chart = event.target.closest(".chart-container").querySelector("canvas").chart;
  chart.zoom(1.2);
};

window.zoomOut = function (event) {
  const chart = event.target.closest(".chart-container").querySelector("canvas").chart;
  chart.zoom(0.8);
};

window.resetZoom = function (event) {
  const chart = event.target.closest(".chart-container").querySelector("canvas").chart;
  chart.resetZoom();
};

function formatTime(seconds) {
  return new Date(seconds * 1000).toISOString().slice(11, 19);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString(undefined, { hour12: true });
}

function formatDistance(distance) {
  return `${distance.toFixed(2)} km`;
}

function formatAltitude(altitude) {
  return `${(altitude * 1000).toFixed(0)} m`;
}

function getCadenceLabel(sport) {
  return sport === "running" ? "步频" : "踏频";
}

function getLocalizedName(sportLabel, sport) {
  const labels = {
    heartRate: "心率",
    speed: "速度",
    cadence: getCadenceLabel(sport),
    altitude: "海拔",
  };
  return labels[sportLabel] || "";
}

function getUnit(label, sport) {
  const units = {
    heartRate: " bpm",
    speed: " km/h",
    cadence: getCadenceLabel(sport) === "步频" ? " spm" : " rpm",
    altitude: " m",
  };
  return units[label] || "";
}

function getUnitFromChinese(label, sport) {
  const units = {
    心率: " bpm",
    速度: " km/h",
    步频: " spm",
    踏频: " rpm",
    海拔: " m",
  };
  return units[label] || "";
}

const crosshairLinePlugin = {
  id: "crosshairLine",
  afterDraw(chart) {
    const { tooltip, ctx, chartArea } = chart;
    if (tooltip && tooltip._active && tooltip._active.length) {
      const activePoint = tooltip._active[0];
      const { x } = activePoint.element;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#969696";
      ctx.setLineDash([5, 2]);
      ctx.stroke();
      ctx.restore();
    }
  },
};

const activePointsPlugin = {
  id: "activePoints",
  afterDraw: (chart) => {
    const {
      ctx,
      tooltip,
      scales: { x, y },
    } = chart;
    if (tooltip._active && tooltip._active.length) {
      const xValue = tooltip._active[0].element.x;

      ctx.save();

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (!dataset.hidden) {
          const meta = chart.getDatasetMeta(datasetIndex);
          const yValue = y.getPixelForValue(dataset.data[x.getValueForPixel(xValue)]);

          ctx.beginPath();
          ctx.arc(xValue, yValue, 4, 0, 2 * Math.PI);
          ctx.fillStyle = dataset.borderColor;
          ctx.fill();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      ctx.restore();
    }
  },
};

Chart.register(crosshairLinePlugin);
Chart.register(activePointsPlugin);
Chart.register(zoomPlugin);