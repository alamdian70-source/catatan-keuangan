// Fungsi server Vercel: mengambil riwayat harga saham/indeks agar browser tidak terkena batasan CORS.
// Hanya menerima kode saham/indeks sederhana, bukan alamat bebas.
module.exports = async function handler(req, res) {
  const symbol = String(req.query.symbol || "").toUpperCase();
  const range = ["1mo", "3mo", "6mo"].includes(req.query.range) ? req.query.range : "1mo";
  if (!/^(\^[A-Z0-9]{2,8}|[A-Z0-9]{2,6}(\.JK)?)$/.test(symbol)) {
    return res.status(400).json({ error: "Kode tidak valid" });
  }
  const yahoo = symbol.startsWith("^") || symbol.endsWith(".JK") ? symbol : symbol + ".JK";
  try {
    const r = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahoo) + "?range=" + range + "&interval=1d",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    if (!r.ok) return res.status(502).json({ error: "Sumber data menolak permintaan (" + r.status + ")" });
    const j = await r.json();
    const d = j && j.chart && j.chart.result && j.chart.result[0];
    if (!d || !d.timestamp) return res.status(404).json({ error: "Kode tidak ditemukan" });
    const close = d.indicators.quote[0].close || [];
    const points = [];
    d.timestamp.forEach((t, i) => { if (close[i] != null) points.push([t * 1000, close[i]]); });
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ symbol: yahoo, currency: d.meta && d.meta.currency, points });
  } catch (e) {
    return res.status(502).json({ error: "Gagal menghubungi sumber data" });
  }
};
