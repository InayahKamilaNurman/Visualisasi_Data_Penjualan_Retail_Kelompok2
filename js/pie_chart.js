const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

const COLORS = ["#1a56db", "#f97316", "#16a34a", "#9333ea", "#e11d48", "#0891b2"];

loadCsv(DATA_PATHS).then(data => {
  const uniqueOutlets = Array.from(
    d3.rollup(
      data,
      v => v[0],
      d => d.Outlet_Identifier
    ).values()
  );

  const chartData = d3.rollups(
    uniqueOutlets,
    v => v.length,
    d => d.Outlet_Type
  )
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  renderChart(chartData);

  const total = d3.sum(chartData, d => d.count);
  const top = chartData[0];
  const pct = Math.round((top.count / total) * 100);
  document.getElementById("insight-box").textContent =
    `${top.type} memiliki jumlah outlet terbanyak dengan proporsi ${pct}% dari total ${total} outlet.`;

}).catch(err => {
  console.error(err);
  document.getElementById("chart").innerHTML = `<div class="loading"><div class="spinner"></div>Gagal memuat data CSV.</div>`;
});

function renderChart(data) {
  const wrapper = document.getElementById("chart");
  wrapper.innerHTML = "";

  // Layout: pie kiri, legend kanan
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.gap = "32px";
  wrapper.style.flexWrap = "wrap";

  const svgContainer = document.createElement("div");
  const legendContainer = document.createElement("div");
  legendContainer.style.display = "flex";
  legendContainer.style.flexDirection = "column";
  legendContainer.style.gap = "10px";
  legendContainer.style.minWidth = "180px";

  wrapper.appendChild(svgContainer);
  wrapper.appendChild(legendContainer);

  const size = 340;
  const radius = size / 2 - 16;

  const svg = d3.select(svgContainer)
    .append("svg")
    .attr("width", size)
    .attr("height", size)
    .append("g")
    .attr("transform", `translate(${size / 2},${size / 2})`);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(COLORS);

  const pie = d3.pie().sort(null).value(d => d.count);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const arcHover = d3.arc().innerRadius(0).outerRadius(radius + 8);

  const total = d3.sum(data, d => d.count);
  const pieData = pie(data);
  const tooltip = d3.select("#tooltip");

  svg.selectAll(".arc")
    .data(pieData)
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", arc)
    .style("fill", d => color(d.data.type))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).transition().duration(150).attr("d", arcHover);
      tooltip.classed("visible", true).html(`
        <div class="tooltip-title">${d.data.type}</div>
        <div class="tooltip-value">${d.data.count} outlet</div>
        <div class="tooltip-sub">${Math.round((d.data.count / total) * 100)}% dari total
      `);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", `${event.pageX + 14}px`).style("top", `${event.pageY - 34}px`);
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(150).attr("d", arc);
      tooltip.classed("visible", false);
    });

  // Hanya tampilkan % di dalam slice, tanpa nama
  svg.selectAll(".arc-label")
    .data(pieData)
    .enter()
    .append("text")
    .attr("class", "arc-label")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("fill", "white")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .style("pointer-events", "none")
    .text(d => {
      const pct = (d.data.count / total) * 100;
      return pct >= 8 ? `${Math.round(pct)}%` : "";
    });

  // Legend di kanan
  data.forEach(d => {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.style.fontSize = "13px";
    item.style.color = "var(--text-primary)";

    const swatch = document.createElement("span");
    swatch.style.width = "12px";
    swatch.style.height = "12px";
    swatch.style.borderRadius = "3px";
    swatch.style.background = color(d.type);
    swatch.style.flexShrink = "0";

    const label = document.createElement("span");
    const pct = Math.round((d.count / total) * 100);
    label.textContent = `${d.type} — ${pct}%`;

    item.appendChild(swatch);
    item.appendChild(label);
    legendContainer.appendChild(item);
  });
}

function loadCsv(paths) {
  const parse = d => ({
    Outlet_Identifier: d.Outlet_Identifier,
    Outlet_Type: d.Outlet_Type
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}