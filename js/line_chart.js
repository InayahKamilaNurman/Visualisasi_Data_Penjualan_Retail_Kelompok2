// Kelompok 2 - line chart tren penjualan tahunan

const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

loadCsv(DATA_PATHS).then(data => {

  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => +d.Outlet_Establishment_Year
  );

  const chartData = grouped
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year - b.year);

  renderChart(chartData);

  const highest = [...chartData].sort((a, b) => b.total - a.total)[0];
  document.getElementById("insight-box").textContent =
    `Outlet yang berdiri pada tahun ${highest.year} memiliki total penjualan tertinggi dengan ${formatMiliarLabel(highest.total)}.`;

}).catch(err => {
  console.error("Gagal memuat data:", err);
  document.getElementById("chart").innerHTML =
    `<div class="loading"><div class="spinner"></div>Gagal memuat data CSV.</div>`;
});

function renderChart(data) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin    = { top: 30, right: 40, bottom: 60, left: 90 };
  const fullWidth = container.clientWidth || 900;
  const width     = fullWidth - margin.left - margin.right;
  const height    = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // gradien area
  const defs = svg.append("defs");
  const areaGradient = defs.append("linearGradient")
    .attr("id", "area-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  areaGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "var(--primary)")
    .attr("stop-opacity", 0.35);
  areaGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "var(--primary)")
    .attr("stop-opacity", 0.0);

  const years  = data.map(d => d.year);
  const xScale = d3.scaleLinear()
    .domain([d3.min(years), d3.max(years)])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.1])
    .nice()
    .range([height, 0]);

  // grid
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(""));

  // sumbu x
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickValues(years).tickFormat(d3.format("d")))
    .selectAll("text")
    .style("font-size", "12px");

  // sumbu y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(6).tickFormat(formatMiliar));

  // label sumbu y
  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Total Penjualan (Miliar IDR)");

  // label sumbu x
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Tahun Pendirian Outlet");

  // area
  const areaGenerator = d3.area()
    .x(d => xScale(d.year))
    .y0(height)
    .y1(d => yScale(d.total))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(data)
    .attr("class", "area-path")
    .attr("d", areaGenerator)
    .style("fill", "url(#area-gradient)")
    .style("opacity", 0)
    .transition()
    .duration(800)
    .delay(1000)
    .style("opacity", 1);

  // garis
  const lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.total))
    .curve(d3.curveMonotoneX);

  const linePath = svg.append("path")
    .datum(data)
    .attr("class", "line-path")
    .attr("d", lineGenerator)
    .attr("fill", "none")
    .attr("stroke", "var(--primary)")
    .attr("stroke-width", 3);

  const totalLength = linePath.node().getTotalLength();
  linePath
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(1500)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  const tooltip = d3.select("#tooltip");

  // titik data
  const dots = svg.selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.total))
    .attr("r", 0)
    .attr("fill", "var(--accent)")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .style("cursor", "pointer");

  dots.transition()
    .duration(600)
    .ease(d3.easeBackOut)
    .delay((d, i) => 1200 + i * 80)
    .attr("r", 5);

  // hover
  dots
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(150).attr("r", 8).attr("fill", "var(--primary-dark)");
      tooltip
        .classed("visible", true)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">Tahun ${d.year}</div>
          <div class="tooltip-value">${formatMiliarLabel(d.total)}</div>
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).transition().duration(150).attr("r", 5).attr("fill", "var(--accent)");
      tooltip.classed("visible", false);
    });
}

function loadCsv(paths) {
  const parse = d => ({
    Outlet_Establishment_Year: d.Outlet_Establishment_Year,
    Item_Outlet_Sales:         +d.Item_Outlet_Sales
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

// format sumbu
function formatMiliar(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000_000;
  return (Number.isInteger(Math.round(val * 10) / 10)
    ? val.toFixed(0)
    : val.toFixed(1)) + " M";
}

// format insight & tooltip
function formatMiliarLabel(angka) {
  const val = angka / 1_000_000_000;
  return (Math.round(val * 10) / 10).toFixed(1).replace(".", ",") + " Miliar IDR";
}