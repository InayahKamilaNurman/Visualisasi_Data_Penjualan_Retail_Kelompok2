const DATA_PATH = "../Data/Dataset_Visdat_Cleaned.csv";

let showTop5 = false;
let allData  = [];

// load data
d3.csv(DATA_PATH, d => ({
  Item_Type:         d.Item_Type,
  Item_Outlet_Sales: +d.Item_Outlet_Sales
})).then(data => {

  // agregasi total penjualan per tipe item
  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => d.Item_Type
  );

  // ubah ke array objek, urutkan dari terbesar
  allData = grouped
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);

  // render pertama kali
  renderChart(allData);

  // toggle semua
  document.getElementById("btn-all").addEventListener("click", () => {
    showTop5 = false;
    document.getElementById("btn-all").classList.add("active");
    document.getElementById("btn-top5").classList.remove("active");
    renderChart(allData);
  });

  // toggle top 5
  document.getElementById("btn-top5").addEventListener("click", () => {
    showTop5 = true;
    document.getElementById("btn-top5").classList.add("active");
    document.getElementById("btn-all").classList.remove("active");
    renderChart(allData.slice(0, 5));
  });

}).catch(err => {
  console.error("Gagal load data:", err);
  document.getElementById("chart").innerHTML =
    `<p style="color:red;padding:20px">Gagal memuat data. Pastikan file CSV ada di folder Data/.</p>`;
});


// render chart
function renderChart(data) {

  // hapus svg lama
  d3.select("#chart").selectAll("*").remove();

  // ukuran
  const container  = document.getElementById("chart");
  const totalWidth = container.clientWidth || 900;
  const margin     = { top: 20, right: 30, bottom: showTop5 ? 60 : 120, left: 90 };
  const width      = totalWidth - margin.left - margin.right;
  const height     = 420 - margin.top - margin.bottom;

  // buat svg
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // skala x
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.25);

  // skala y
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.15])
    .range([height, 0]);

  // grid horizontal
  svg.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-width)
        .tickFormat("")
    );

  // sumbu x — miring kalau semua, lurus kalau top 5
  const xAxisG = svg.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  if (showTop5) {
    xAxisG.selectAll("text")
      .style("font-size", "12px")
      .style("text-anchor", "middle");
  } else {
    xAxisG.selectAll("text")
      .style("font-size", "11px")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.5em");
  }

  // sumbu y — pakai Miliar
  svg.append("g")
    .attr("class", "axis y-axis")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d => formatMiliar(d))
    );

  // label sumbu y
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Total Penjualan (Miliar IDR)");

  const tooltip = d3.select("#tooltip");

  // gambar batang
  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.type))
    .attr("width", xScale.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", "var(--primary)")
    .attr("rx", 4)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 40)
    .attr("y", d => yScale(d.total))
    .attr("height", d => height - yScale(d.total));

  // hover
  svg.selectAll(".bar")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "var(--primary-dark)");
      tooltip
        .classed("visible", true)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">${d.type}</div>
          <div class="tooltip-value">${formatMiliar(d.total)} Miliar IDR</div>
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "var(--primary)");
      tooltip.classed("visible", false);
    });

  // insight
  const top1 = allData[0];
  document.getElementById("insight-box").innerHTML =
    `${top1.type} adalah tipe item dengan penjualan tertinggi.`;
}

// format miliar
function formatMiliar(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000_000;
  return (Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1)) + " M";
}