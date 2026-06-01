const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

loadCsv(DATA_PATHS).then(data => {
  const chartData = data
    .filter(d => Number.isFinite(d.Item_MRP) && Number.isFinite(d.Item_Outlet_Sales))
    .map(d => ({
      mrp: d.Item_MRP,
      sales: d.Item_Outlet_Sales,
      itemType: d.Item_Type,
      outletType: d.Outlet_Type,
      outletId: d.Outlet_Identifier
    }));

  const corrValue = correlation(chartData);
  renderChart(chartData);

  const corrFormatted = corrValue.toFixed(2).replace(".", ",");
  document.getElementById("insight-box").textContent =
    `Hubungan antara harga produk dan total penjualan bersifat positif dengan korelasi ${corrFormatted}.`;

}).catch(err => {
  console.error(err);
  document.getElementById("chart").innerHTML = `
    <div class="loading"><div class="spinner"></div>Gagal memuat data CSV.</div>
  `;
});

function renderChart(data) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin = { top: 20, right: 28, bottom: 78, left: 95 };
  const fullWidth = container.clientWidth || 900;
  const width = fullWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.mrp) * 1.05])
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.sales) * 1.05])
    .nice()
    .range([height, 0]);

  // Grid
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));

  // Sumbu X — pakai Juta IDR biar angkanya kecil dan rapi
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(formatJuta));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 12)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .text("Harga Produk (Juta IDR)");

  // Sumbu Y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(formatJuta));

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 22)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .text("Total Penjualan (Juta IDR)");

  // Trendline (regresi linear)
  const n = data.length;
  const meanX = d3.mean(data, d => d.mrp);
  const meanY = d3.mean(data, d => d.sales);
  const slope = d3.sum(data, d => (d.mrp - meanX) * (d.sales - meanY)) /
                d3.sum(data, d => Math.pow(d.mrp - meanX, 2));
  const intercept = meanY - slope * meanX;

  const xMin = d3.min(data, d => d.mrp);
  const xMax = d3.max(data, d => d.mrp);

  svg.append("line")
    .attr("x1", x(xMin))
    .attr("y1", y(slope * xMin + intercept))
    .attr("x2", x(xMax))
    .attr("y2", y(slope * xMax + intercept))
    .attr("stroke", "#f97316")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "6,4")
    .attr("opacity", 0.8);

  // Dots
  const tooltip = d3.select("#tooltip");

  svg.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-dot")
    .attr("cx", d => x(d.mrp))
    .attr("cy", d => y(d.sales))
    .attr("r", 3.2)
    .attr("fill", "#1a56db")
    .attr("fill-opacity", 0.45)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 6).attr("fill-opacity", 1);
      tooltip
        .classed("visible", true)
        .html(`
          <div class="tooltip-title">${d.itemType}</div>
          <div class="tooltip-value">Penjualan: ${formatJutaLabel(d.sales)}</div>
          <div class="tooltip-sub">Harga: ${formatJutaLabel(d.mrp)} &nbsp;|&nbsp; ${d.outletType}</div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 34}px`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", 3.2).attr("fill-opacity", 0.45);
      tooltip.classed("visible", false);
    });
}

function loadCsv(paths) {
  const parse = d => ({
    Item_MRP: +d.Item_MRP,
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Item_Type: d.Item_Type,
    Outlet_Type: d.Outlet_Type,
    Outlet_Identifier: d.Outlet_Identifier
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

function correlation(data) {
  const meanX = d3.mean(data, d => d.mrp);
  const meanY = d3.mean(data, d => d.sales);
  const num = d3.sum(data, d => (d.mrp - meanX) * (d.sales - meanY));
  const denX = Math.sqrt(d3.sum(data, d => Math.pow(d.mrp - meanX, 2)));
  const denY = Math.sqrt(d3.sum(data, d => Math.pow(d.sales - meanY, 2)));
  return num / (denX * denY);
}

// Untuk sumbu — singkat
function formatJuta(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000;
  const str = Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1);
  return str.replace(".", ",") + " Jt";
}

// Untuk tooltip — dengan satuan lengkap
function formatJutaLabel(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000;
  const str = (Math.round(val * 10) / 10).toFixed(1).replace(".", ",");
  return str + " Juta IDR";
}