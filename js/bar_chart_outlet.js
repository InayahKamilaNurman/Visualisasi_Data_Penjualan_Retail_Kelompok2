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
  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => d.Outlet_Type
  );

  const chartData = grouped
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);

  renderChart(chartData);

  const top = chartData[0];
  document.getElementById("insight-box").textContent =
    `${top.type} adalah tipe outlet dengan total penjualan tertinggi.`;
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

  const margin = { top: 20, right: 30, bottom: 110, left: 105 };
  const fullWidth = container.clientWidth || 900;
  const width = fullWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.28);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.08])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(CATEGORY_COLORS);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-20)")
    .style("text-anchor", "end")
    .attr("dx", "-0.3em")
    .attr("dy", "0.5em");

  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(formatMiliar));

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 22)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .text("Total Penjualan (Miliar IDR)");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .text("Tipe Outlet");

  const tooltip = d3.select("#tooltip");

  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.total))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.total))
    .attr("rx", 6)
    .attr("fill", d => color(d.type))
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.85);
      tooltip
        .classed("visible", true)
        .html(`
          <strong>${d.type}</strong><br />
          Total: ${formatMiliar(d.total)}
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

  svg.selectAll(".bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.type) + x.bandwidth() / 2)
    .attr("y", d => y(d.total) - 8)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "var(--text-secondary)")
    .text(d => formatMiliar(d.total));
}

function loadCsv(paths) {
  const parse = d => ({
    Outlet_Type: d.Outlet_Type,
    Item_Outlet_Sales: +d.Item_Outlet_Sales
  });

  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };

  return tryLoad(0);
}

function formatMiliar(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000_000;
  return (Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1)) + " M";
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
