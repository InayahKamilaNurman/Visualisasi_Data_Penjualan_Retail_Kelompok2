const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

const CATEGORY_COLORS = [
  getCssVar("--cat-1"),
  getCssVar("--cat-2"),
  getCssVar("--cat-3"),
  getCssVar("--cat-4"),
  getCssVar("--cat-5"),
  getCssVar("--cat-6"),
  getCssVar("--cat-7"),
  getCssVar("--cat-8")
];

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

  document.getElementById("insight-box").textContent =
    "Supermarket Type1 memiliki jumlah outlet terbanyak dengan proporsi 60%.";
}).catch(err => {
  console.error(err);
  document.getElementById("chart").innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Gagal memuat data CSV.
    </div>
  `;
});

function renderChart(data) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const width = container.clientWidth || 900;
  const height = 420;
  const radius = Math.min(width, height) / 2 - 24;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(CATEGORY_COLORS);

  const pie = d3.pie()
    .sort(null)
    .value(d => d.count);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const labelArc = d3.arc()
    .innerRadius(radius * 0.7)
    .outerRadius(radius * 0.7);

  const tooltip = d3.select("#tooltip");
  const total = d3.sum(data, d => d.count);
  const pieData = pie(data);

  svg.selectAll(".arc")
    .data(pieData)
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", arc)
    .attr("fill", d => color(d.data.type))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.85);
      tooltip
        .classed("visible", true)
        .html(`
          <strong>${d.data.type}</strong><br />
          ${d.data.count} outlet (${((d.data.count / total) * 100).toFixed(1)}%)
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 34}px`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.classed("visible", false);
    });

  svg.selectAll(".arc-label")
    .data(pieData)
    .enter()
    .append("text")
    .attr("class", "arc-label")
    .attr("transform", d => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .text(d => `${d.data.type} (${Math.round((d.data.count / total) * 100)}%)`);

  const legend = d3.select("#legend");
  legend.selectAll("*").remove();

  const legendItems = legend.selectAll(".legend-item")
    .data(data)
    .enter()
    .append("div")
    .attr("class", "legend-item");

  legendItems.append("span")
    .attr("class", "legend-swatch")
    .style("background", d => color(d.type));

  legendItems.append("span")
    .text(d => `${d.type} (${d.count})`);
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

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
