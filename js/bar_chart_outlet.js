const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

const COLORS = [
  getCssVar("--cat-1"),
  getCssVar("--cat-2"),
  getCssVar("--cat-3"),
  getCssVar("--cat-4"),
  getCssVar("--cat-5"),
  getCssVar("--cat-6"),
  getCssVar("--cat-7"),
  getCssVar("--cat-8")
];

loadCsv(DATA_PATHS)
  .then(data => {
    const grouped = d3.rollups(
      data,
      v => d3.sum(v, d => d.Item_Outlet_Sales),
      d => d.Outlet_Type
    );

    const allData = grouped
      .map(([type, total]) => ({ type, total }))
      .sort((a, b) => b.total - a.total);

    const totalKeseluruhan = d3.sum(allData, d => d.total);
    const outletTertinggi = allData[0];
    const outletTerendah = allData[allData.length - 1];

    document.getElementById("stats-row").innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${allData.length}</div>
        <div class="stat-label">Tipe Outlet</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${formatRupiah(totalKeseluruhan)}</div>
        <div class="stat-label">Total Penjualan</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${outletTertinggi.type}</div>
        <div class="stat-label">Penjualan Tertinggi</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${outletTerendah.type}</div>
        <div class="stat-label">Penjualan Terendah</div>
      </div>
    `;

    renderChart(allData);

    document.getElementById("insight-box").innerHTML = `
      <strong>${outletTertinggi.type}</strong> menjadi tipe outlet dengan total penjualan tertinggi sebesar <strong>${formatRupiah(outletTertinggi.total)}</strong>.
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

function renderChart(data) {
  d3.select("#chart").selectAll("*").remove();

  const container = document.getElementById("chart");
  const totalWidth = container.clientWidth || 900;
  const margin = { top: 20, right: 30, bottom: 120, left: 90 };
  const width = totalWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.28);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.1])
    .nice()
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(COLORS);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end")
    .attr("dx", "-0.3em")
    .attr("dy", "0.5em");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-family", "var(--font-main)")
    .text("Tipe Outlet");

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
    .text("Total Penjualan (IDR)");

  const tooltip = d3.select("#tooltip");

  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.type))
    .attr("width", xScale.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("rx", 5)
    .attr("fill", d => colorScale(d.type))
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.85);
      tooltip
        .classed("visible", true)
        .html(`
          <strong>${d.type}</strong><br />
          ${formatRupiah(d.total)}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 36) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.classed("visible", false);
    })
    .transition()
    .duration(700)
    .delay((d, i) => i * 80)
    .attr("y", d => yScale(d.total))
    .attr("height", d => height - yScale(d.total));

  svg.selectAll(".bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.type) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.total) - 8)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("font-family", "var(--font-mono)")
    .attr("fill", "var(--text-secondary)")
    .text(d => formatSingkat(d.total));
}

function loadCsv(paths) {
  const converters = d => ({
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Outlet_Type: d.Outlet_Type
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
  if (angka >= 1_000_000) return (angka / 1_000_000).toFixed(1) + "M";
  if (angka >= 1_000) return (angka / 1_000).toFixed(0) + "K";
  return angka.toLocaleString("id-ID");
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

