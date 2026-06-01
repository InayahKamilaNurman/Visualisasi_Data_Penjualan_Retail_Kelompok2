// Kelompok 2 - dashboard controller

const DATA_PATHS = [
  "Data/Dataset_Visdat_Cleaned.csv",
  "data/Dataset_Visdat_Cleaned.csv"
];

// tampilkan loading state dulu
["stat-total-sales","stat-total-items","stat-avg-sales","stat-outlet-count"]
  .forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "...";
  });

// load data
loadCsv(DATA_PATHS).then(data => {

  const validData    = data.filter(d => Number.isFinite(d.Item_Outlet_Sales));
  const totalSales   = d3.sum(validData, d => d.Item_Outlet_Sales);
  const totalTx      = validData.length;
  const rataRata     = totalTx > 0 ? totalSales / totalTx : 0;
  const jumlahOutlet = new Set(validData.map(d => d.Outlet_Identifier)).size;

  animateCount("stat-total-sales",  totalSales,   formatMiliar);
  animateCount("stat-total-items",  totalTx,      d => Math.round(d).toLocaleString("id-ID"));
  animateCount("stat-avg-sales",    rataRata,     formatJuta);
  animateCount("stat-outlet-count", jumlahOutlet, d => Math.round(d).toString());

}).catch(err => {
  console.error("Gagal load data:", err);
  ["stat-total-sales","stat-total-items","stat-avg-sales","stat-outlet-count"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = "–";
        el.title = "Gagal memuat data";
      }
    });
});

// load csv dengan fallback path
function loadCsv(paths) {
  const parse = d => ({
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Outlet_Identifier: d.Outlet_Identifier
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan di semua path"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

// animasi counter — handle NaN & 0
function animateCount(id, target, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!Number.isFinite(target) || target === 0) {
    el.textContent = formatter(0);
    return;
  }
  const duration  = 1200;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease     = progress * (2 - progress); // ease-out quad
    el.textContent = formatter(target * ease);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = formatter(target);
  }
  requestAnimationFrame(update);
}

// format miliar — "125,1 M"
function formatMiliar(angka) {
  if (!angka || angka === 0) return "0";
  const val = angka / 1_000_000_000;
  return (Math.round(val * 10) / 10).toFixed(1).replace(".", ",") + " M";
}

// format juta — "14,7 Jt"
function formatJuta(angka) {
  if (!angka || angka === 0) return "0";
  const val = angka / 1_000_000;
  return (Math.round(val * 10) / 10).toFixed(1).replace(".", ",") + " Jt";
}