// Kelompok 2 - histogram distribusi harga produk

const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

let allPrices      = [];
let currentBinCount = 20;

loadCsv(DATA_PATHS).then(data => {

  allPrices = data.map(d => d.Item_MRP).filter(d => !isNaN(d) && d > 0);
  renderChart(allPrices, currentBinCount);
  setupBinControllers();

}).catch(err => {
  console.error("Gagal memuat data:", err);
  document.getElementById("chart").innerHTML =
    `<div class="loading"><div class="spinner"></div>Gagal memuat data CSV.</div>`;
});

function setupBinControllers() {
  const opts = [
    { id: "btn-bins-10", value: 10 },
    { id: "btn-bins-20", value: 20 },
    { id: "btn-bins-30", value: 30 }
  ];
  opts.forEach(opt => {
    const btn = document.getElementById(opt.id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      opts.forEach(o => document.getElementById(o.id)?.classList.remove("active"));
      btn.classList.add("active");
      currentBinCount = opt.value;
      renderChart(allPrices, currentBinCount);
    });
  });
}

function renderChart(prices, binCount) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin    = { top: 30, right: 30, bottom: 60, left: 75 };
  const fullWidth = container.clientWidth || 900;
  const width     = fullWidth - margin.left - margin.right;
  const height    = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(prices) * 1.02])
    .range([0, width])
    .nice();

  const histogram = d3.bin()
    .domain(xScale.domain())
    .thresholds(xScale.ticks(binCount));

  const bins = histogram(prices);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length) * 1.1])
    .nice()
    .range([height, 0]);

  // warna sequential hardcode — tidak pakai getCssVar
  const colorScale = d3.scaleLinear()
    .domain([0, bins.length - 1])
    .range(["#21918c", "#3b528b"]);

  // grid
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(""));

  // sumbu x
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(formatRibu))
    .selectAll("text")
    .style("font-size", "12px");

  // sumbu y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(6));

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
    .text("Frekuensi (Jumlah Produk)");

  // label sumbu x
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Harga Produk (Ribu IDR)");

  const tooltip = d3.select("#tooltip");

  // batang histogram
  const bars = svg.selectAll(".bar-hist")
    .data(bins)
    .enter()
    .append("rect")
    .attr("class", "bar-hist")
    .attr("x", d => xScale(d.x0) + 1)
    .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1.5))
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", (d, i) => colorScale(i))
    .attr("rx", 3)
    .style("cursor", "pointer");

  bars.transition()
    .duration(850)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 30)
    .attr("y", d => yScale(d.length))
    .attr("height", d => height - yScale(d.length));

  // hover
  bars
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill-opacity", 0.8);
      tooltip
        .classed("visible", true)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">Rentang Harga</div>
          <div class="tooltip-value">${formatRibuLabel(d.x0)} – ${formatRibuLabel(d.x1)}</div>
          <div style="font-size:12px;margin-top:4px">Jumlah produk: <strong>${d.length} item</strong></div>
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill-opacity", 1);
      tooltip.classed("visible", false);
    });

  // insight
  const maxBin    = [...bins].sort((a, b) => b.length - a.length)[0];
  const persen    = ((maxBin.length / prices.length) * 100).toFixed(1).replace(".", ",");
  document.getElementById("insight-box").textContent =
    `Sebagian besar produk memiliki harga di kisaran ${formatRibuLabel(maxBin.x0)}–${formatRibuLabel(maxBin.x1)}, dengan ${maxBin.length} item (${persen}% dari total produk).`;
}

function loadCsv(paths) {
  const parse = d => ({ Item_MRP: +d.Item_MRP });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

// format sumbu x — singkat tanpa Rp
function formatRibu(angka) {
  if (angka === 0) return "0";
  if (angka >= 1_000_000) {
    const val = angka / 1_000_000;
    const str = Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1);
    return str.replace(".", ",") + " Jt";
  }
  if (angka >= 1_000) return (angka / 1_000).toFixed(0) + " Rb";
  return angka.toString();
}

// format insight & tooltip
function formatRibuLabel(angka) {
  if (angka >= 1_000_000) {
    const val = angka / 1_000_000;
    const str = Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1);
    return str.replace(".", ",") + " Jt IDR";
  }
  if (angka >= 1_000) return (angka / 1_000).toFixed(0) + " Rb IDR";
  return angka + " IDR";
}