const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

loadCsv(DATA_PATHS)
  .then(data => {
    const allData = data
      .filter(d => Number.isFinite(d.Item_MRP) && Number.isFinite(d.Item_Outlet_Sales))
      .map(d => ({
        mrp: d.Item_MRP,
        sales: d.Item_Outlet_Sales,
        itemType: d.Item_Type,
        outletType: d.Outlet_Type,
        outletId: d.Outlet_Identifier
      }));

    const xMin = 0;
    const xMax = d3.max(allData, d => d.mrp) * 1.05;
    const yMin = 0;
    const yMax = d3.max(allData, d => d.sales) * 1.05;

    document.getElementById("stats-row").innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${allData.length}</div>
        <div class="stat-label">Jumlah Titik</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${formatRupiah(d3.mean(allData, d => d.mrp))}</div>
        <div class="stat-label">Rata-rata MRP</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${formatRupiah(d3.mean(allData, d => d.sales))}</div>
        <div class="stat-label">Rata-rata Penjualan</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${corr(allData).toFixed(2)}</div>
        <div class="stat-label">Korelasi</div>
      </div>
    `;

    renderChart(allData, xMin, xMax, yMin, yMax);
    document.getElementById("insight-box").innerHTML = `
      Hubungan antara Item MRP dan total penjualan terlihat ${Math.abs(corr(allData)) < 0.2 ? "lemah" : "cukup terlihat"} dengan nilai korelasi <strong>${corr(allData).toFixed(2)}</strong>.
    `;
  })
  .catch(err => {
    console.error("Gagal load data:", err);
    document.getElementById("chart").innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        Gagal memuat data CSV.
      </div>
    `;
  });

function renderChart(data, xMin, xMax, yMin, yMax) {
  d3.select("#chart").selectAll("*").remove();

  const container = document.getElementById("chart");
  const totalWidth = container.clientWidth || 900;
  const margin = { top: 20, right: 30, bottom: 70, left: 90 };
  const width = totalWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([xMin, xMax])
    .nice()
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([yMin, yMax])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""));

  svg.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d => formatSingkat(d)));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-family", "var(--font-main)")
    .text("Item MRP");

  svg.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale).tickFormat(d => formatSingkat(d)));

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 18)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-family", "var(--font-main)")
    .text("Item Outlet Sales");

  const tooltip = d3.select("#tooltip");

  svg.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-dot")
    .attr("cx", d => xScale(d.mrp))
    .attr("cy", d => yScale(d.sales))
    .attr("r", 3.2)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 6);
      tooltip
        .classed("visible", true)
        .html(`
          <strong>${d.itemType}</strong><br />
          MRP: ${formatRupiah(d.mrp)}<br />
          Penjualan: ${formatRupiah(d.sales)}<br />
          Outlet: ${d.outletType}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 36) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", 3.2);
      tooltip.classed("visible", false);
    });

  const lineData = linearRegression(data);
  const line = d3.line()
    .x(d => xScale(d.mrp))
    .y(d => yScale(d.sales));

  svg.append("path")
    .datum(lineData)
    .attr("class", "line-path")
    .attr("stroke-dasharray", "6 5")
    .attr("opacity", 0.7)
    .attr("d", line);
}

function linearRegression(data) {
  const n = data.length;
  const sumX = d3.sum(data, d => d.mrp);
  const sumY = d3.sum(data, d => d.sales);
  const sumXY = d3.sum(data, d => d.mrp * d.sales);
  const sumXX = d3.sum(data, d => d.mrp * d.mrp);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const x1 = d3.min(data, d => d.mrp);
  const x2 = d3.max(data, d => d.mrp);

  return [
    { mrp: x1, sales: slope * x1 + intercept },
    { mrp: x2, sales: slope * x2 + intercept }
  ];
}

function corr(data) {
  const meanX = d3.mean(data, d => d.mrp);
  const meanY = d3.mean(data, d => d.sales);
  const numerator = d3.sum(data, d => (d.mrp - meanX) * (d.sales - meanY));
  const denX = Math.sqrt(d3.sum(data, d => Math.pow(d.mrp - meanX, 2)));
  const denY = Math.sqrt(d3.sum(data, d => Math.pow(d.sales - meanY, 2)));
  return numerator / (denX * denY);
}

function loadCsv(paths) {
  const converters = d => ({
    Item_MRP: +d.Item_MRP,
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Item_Type: d.Item_Type,
    Outlet_Type: d.Outlet_Type,
    Outlet_Identifier: d.Outlet_Identifier
  });

  const tryLoad = index => {
    if (index >= paths.length) {
      return Promise.reject(new Error("Semua path CSV gagal dimuat."));
    }
    return d3.csv(paths[index], converters).catch(() => tryLoad(index + 1));
  };

  return tryLoad(0);
}

function formatRupiah(angka) {
  return "Rp " + Math.round(angka).toLocaleString("id-ID");
}

function formatSingkat(angka) {
  if (Math.abs(angka) >= 1_000_000) return (angka / 1_000_000).toFixed(1) + "M";
  if (Math.abs(angka) >= 1_000) return (angka / 1_000).toFixed(0) + "K";
  return Math.round(angka).toLocaleString("id-ID");
}

