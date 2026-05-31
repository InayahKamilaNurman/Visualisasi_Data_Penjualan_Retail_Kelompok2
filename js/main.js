const DATA_PATHS = [
  "Data/Dataset_Visdat_Cleaned.csv",
  "data/Dataset_Visdat_Cleaned.csv"
];

loadCsv(DATA_PATHS).then(data => {
  // 1. Total Penjualan
  const totalSales = d3.sum(data, d => d.Item_Outlet_Sales);

  // 2. Total Transaksi (jumlah baris data)
  const totalTransactions = data.length;

  // 3. Rata-rata per Transaksi
  const averageSales = totalSales / totalTransactions;

  // 4. Jumlah Outlet Unik
  const uniqueOutlets = new Set(data.map(d => d.Outlet_Identifier)).size;

  // Render metrik ke UI dengan transisi atau animasi teks
  animateCount("stat-total-sales", totalSales, formatTotalSales);
  animateCount("stat-total-items", totalTransactions, d => d.toLocaleString("id-ID"));
  animateCount("stat-avg-sales", averageSales, formatAverageSales);
  animateCount("stat-outlet-count", uniqueOutlets, d => d.toLocaleString("id-ID"));

}).catch(err => {
  console.error("Gagal memproses data dashboard:", err);
  // Set fallback jika gagal load
  document.getElementById("stat-total-sales").textContent = "Rp -";
  document.getElementById("stat-total-items").textContent = "-";
  document.getElementById("stat-avg-sales").textContent = "Rp -";
  document.getElementById("stat-outlet-count").textContent = "-";
});

// Fungsi pembantu untuk meload CSV dari beberapa path alternatif
function loadCsv(paths) {
  const parse = d => ({
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Outlet_Identifier: d.Outlet_Identifier
  });

  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };

  return tryLoad(0);
}

// Fungsi animasi counter angka dari 0 ke target agar tampilan dashboard terasa hidup
function animateCount(elementId, targetValue, formatter) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 1200; // milidetik
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing fungsi: easeOutQuad
    const easeProgress = progress * (2 - progress);
    const currentValue = targetValue * easeProgress;

    el.textContent = formatter(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = formatter(targetValue);
    }
  }

  requestAnimationFrame(update);
}

// Formatter untuk Total Penjualan (dalam Miliar / Triliun Rupiah)
function formatTotalSales(value) {
  if (value === 0) return "Rp 0";
  if (value >= 1_000_000_000) {
    const val = value / 1_000_000_000;
    return "Rp " + val.toFixed(2) + " M";
  }
  if (value >= 1_000_000) {
    return "Rp " + (value / 1_000_000).toFixed(2) + " Jt";
  }
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

// Formatter untuk Rerata Transaksi (dalam Juta / Ribu Rupiah)
function formatAverageSales(value) {
  if (value === 0) return "Rp 0";
  if (value >= 1_000_000) {
    const val = value / 1_000_000;
    return "Rp " + val.toFixed(2) + " Jt";
  }
  if (value >= 1_000) {
    return "Rp " + (value / 1_000).toFixed(0) + " Rb";
  }
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}
