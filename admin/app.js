(function(){
  // ---- isi URL Web App Apps Script yang sama kayak di app.js kalau mau ambil data dari Google Sheets ----
  // Lihat SETUP_SHEETS.md. Kosongin aja kalau belum setup, admin tetap jalan pakai localStorage (mode demo).
  var API_URL = "";

  var STATUS_LABELS = {
    menunggu_pembayaran: "Menunggu Pembayaran",
    menunggu_verifikasi: "Menunggu Verifikasi",
    diverifikasi: "Diverifikasi",
    diproses: "Diproses Cetak",
    siap: "Siap Diambil/Dikirim",
    selesai: "Selesai"
  };
  // Status di bawah ini butuh bukti bayar dulu sebelum admin boleh pindah ke sini.
  var PRINT_STATUSES = ["diproses", "siap", "selesai"];

  var ordersCache = [];
  var viewsCache = [];

  function rupiah(n){ return "Rp " + (n || 0).toLocaleString("id-ID"); }
  function esc(s){ var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function getLocalOrders(){ try { return JSON.parse(localStorage.getItem("sablonin_orders") || "[]"); } catch (e) { return []; } }
  function setLocalOrders(o){ try { localStorage.setItem("sablonin_orders", JSON.stringify(o)); } catch (e) {} }
  function getLocalViews(){ try { return JSON.parse(localStorage.getItem("sablonin_views") || "[]"); } catch (e) { return []; } }
  function setLocalViews(v){ try { localStorage.setItem("sablonin_views", JSON.stringify(v)); } catch (e) {} }

  // Baris dari Google Sheet datang flat (placementView/placementX/dst) - susun ulang jadi bentuk
  // yang sama kayak object order di localStorage, biar renderOrders()/placementText() gak perlu berubah.
  function normalizeOrder(o){
    return Object.assign({}, o, {
      qty: Number(o.qty) || 0,
      total: Number(o.total) || 0,
      contourCut: o.contourCut === true || o.contourCut === "true" || o.contourCut === "TRUE",
      sleeveLong: o.sleeveLong === true || o.sleeveLong === "true" || o.sleeveLong === "TRUE",
      ocrMatch: o.ocrMatch === true || o.ocrMatch === "true" || o.ocrMatch === "TRUE" ? true
        : (o.ocrMatch === false || o.ocrMatch === "false" || o.ocrMatch === "FALSE" ? false : null),
      proofFileName: o.proofFileUrl || null,
      placement: {
        view: o.placementView || "front",
        x: Number(o.placementX) || 50,
        y: Number(o.placementY) || 42,
        scale: Number(o.placementScale) || 1,
        rotation: Number(o.placementRotation) || 0
      }
    });
  }

  function loadData(){
    if (!API_URL){
      ordersCache = getLocalOrders();
      viewsCache = getLocalViews();
      return Promise.resolve();
    }
    return fetch(API_URL)
      .then(function(r){ return r.json(); })
      .then(function(data){
        ordersCache = (data.orders || []).map(normalizeOrder);
        viewsCache = data.views || [];
      })
      .catch(function(){
        ordersCache = getLocalOrders();
        viewsCache = getLocalViews();
      });
  }

  function renderStats(){
    var orders = ordersCache;
    var views = viewsCache;
    document.getElementById("statOrders").textContent = orders.length;
    document.getElementById("statPending").textContent =
      orders.filter(function(o){ return o.status === "menunggu_verifikasi"; }).length;
    var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    document.getElementById("statViews").textContent =
      views.filter(function(v){ return new Date(v).getTime() >= cutoff; }).length;
    var revenue = orders
      .filter(function(o){ return o.status !== "menunggu_pembayaran"; })
      .reduce(function(sum, o){ return sum + (o.total || 0); }, 0);
    document.getElementById("statRevenue").textContent = rupiah(revenue);
  }

  function renderChart(){
    var views = viewsCache;
    var days = [];
    for (var i = 13; i >= 0; i--){
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    var counts = days.map(function(d){
      var next = new Date(d);
      next.setDate(next.getDate() + 1);
      return views.filter(function(v){
        var t = new Date(v).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
    });
    var max = Math.max.apply(null, counts.concat([1]));
    document.getElementById("chartBars").innerHTML = counts.map(function(c){
      var h = Math.max(Math.round((c / max) * 100), c > 0 ? 4 : 0);
      return '<div class="chart-bar-col"><div class="chart-value">' + (c || "") + '</div>' +
        '<div class="chart-bar" style="height:' + h + '%"></div></div>';
    }).join("");
    document.getElementById("chartLabels").innerHTML = days.map(function(d){
      return "<div>" + d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }) + "</div>";
    }).join("");
  }

  function placementText(o){
    if (!o.placement) return "Depan";
    // backEnabled = order baru (bisa depan+belakang sekaligus); placement.view === "back"
    // doang tanpa backEnabled = order lama/contoh dari sebelum ada opsi dua sisi.
    var side = o.backEnabled ? "Depan + Belakang" : (o.placement.view === "back" ? "Belakang" : "Depan");
    var isCustom = o.placement.x !== 50 || o.placement.y !== 42 || o.placement.scale !== 1 || o.placement.rotation !== 0;
    return side + (isCustom ? " (digeser)" : " (tengah)");
  }

  function ocrCell(o){
    if (o.ocrMatch === true) return '<span class="ocr-yes">&#10003; Cocok</span>';
    if (o.ocrMatch === false) return '<span class="ocr-no">&#9888; Beda</span>';
    return '<span class="ocr-none">&ndash;</span>';
  }

  // Link status yang sama kayak yang di-generate app.js (?order=ID di halaman utama,
  // BUKAN di /admin/) - dihitung relatif dari lokasi /admin/ sekarang biar tetap
  // bener kalau situsnya di-deploy di subfolder, bukan cuma di root domain.
  function buildResumeLink(orderId){
    var base = location.origin + location.pathname.replace(/admin\/(index\.html)?$/, "");
    return base + "?order=" + encodeURIComponent(orderId);
  }

  function waConfirmLink(o){
    var digits = (o.wa || "").replace(/\D/g, "");
    if (digits.charAt(0) === "0") digits = "62" + digits.slice(1);
    var msg = "Halo " + o.nama + ", pembayaran order " + o.id + " (" + rupiah(o.total) +
      ") sudah kami terima & verifikasi. Pesanan mulai diproses cetak ya.\n\n" +
      "Cek status pesanan kamu kapan aja di sini:\n" + buildResumeLink(o.id) +
      "\n\nTerima kasih! - Sablonin";
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(msg);
  }

  function renderOrders(){
    var orders = ordersCache.slice().sort(function(a, b){ return new Date(b.createdAt) - new Date(a.createdAt); });
    var tbody = document.getElementById("ordersBody");
    var empty = document.getElementById("ordersEmpty");
    if (!orders.length){
      tbody.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    tbody.innerHTML = orders.map(function(o){
      var dateStr = new Date(o.createdAt).toLocaleString("id-ID",
        { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
      var hasProof = !!o.proofFileName;
      var proofCell = hasProof
        ? '<span class="proof-yes">Ya</span>'
        : '<span class="proof-no">Belum</span>';
      var statusOptions = Object.keys(STATUS_LABELS).map(function(k){
        var locked = PRINT_STATUSES.indexOf(k) !== -1 && !hasProof;
        return '<option value="' + k + '"' + (o.status === k ? " selected" : "") + (locked ? " disabled" : "") + '>' +
          STATUS_LABELS[k] + (locked ? " (perlu bukti)" : "") + "</option>";
      }).join("");
      var lockNote = !hasProof ? '<span class="status-lock">Cetak terkunci sampai bukti bayar masuk</span>' : "";
      var waBtn = hasProof
        ? '<a class="wa-confirm" target="_blank" rel="noopener noreferrer" href="' + waConfirmLink(o) + '">Konfirmasi WA</a>'
        : '<span class="ocr-none">&ndash;</span>';
      return "<tr>" +
        '<td class="order-id-cell">' + esc(o.id) + "</td>" +
        "<td>" + dateStr + "</td>" +
        "<td>" + esc(o.nama) + '<br><span style="color:var(--ink-soft);font-size:.72rem;">' + esc(o.wa) + "</span></td>" +
        "<td>" + esc(o.sizeLabel) + " &times; " + esc(o.qty) +
          (o.shirtSizeLabel ? '<br><span style="color:var(--ink-soft);font-size:.72rem;">Baju ' + esc(o.shirtSizeLabel) +
            (o.sleeveLong ? " · Lengan panjang" : "") + "</span>" : "") + "</td>" +
        '<td><span class="swatch-dot" style="background:' + esc(o.shirtColorHex || "#ccc") + '"></span>' + esc(o.shirtColorHex || "-") + "</td>" +
        "<td>" + placementText(o) + "</td>" +
        "<td>" + rupiah(o.total) + "</td>" +
        "<td>" + proofCell + "</td>" +
        "<td>" + ocrCell(o) + "</td>" +
        '<td><select class="status-select" data-id="' + esc(o.id) + '">' + statusOptions + "</select>" + lockNote + "</td>" +
        "<td>" + waBtn + "</td>" +
        "</tr>";
    }).join("");
    tbody.querySelectorAll(".status-select").forEach(function(sel){
      sel.addEventListener("change", function(){
        var id = sel.getAttribute("data-id");
        var newStatus = sel.value;
        for (var i = 0; i < ordersCache.length; i++){
          if (ordersCache[i].id === id){ ordersCache[i].status = newStatus; break; }
        }
        if (API_URL){
          fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateStatus", id: id, status: newStatus }) })
            .catch(function(){});
        } else {
          var orders = getLocalOrders();
          for (var j = 0; j < orders.length; j++){
            if (orders[j].id === id){ orders[j].status = newStatus; break; }
          }
          setLocalOrders(orders);
        }
        renderStats();
      });
    });
  }

  function renderAll(){
    renderStats();
    renderChart();
    renderOrders();
  }

  function refreshAll(){
    loadData().then(renderAll);
  }

  document.getElementById("seedBtn").addEventListener("click", function(){
    var now = Date.now();
    var defPlacement = { view: "front", x: 50, y: 42, scale: 1, rotation: 0 };
    var sample = [
      { id: "SBI-DEMO-1001", createdAt: new Date(now - 3600e3 * 5).toISOString(), size: "A4", sizeLabel: "A4",
        shirtSize: "L", shirtSizeLabel: "L", sleeveLong: false, qty: 2,
        contourCut: true, catatan: "", nama: "Rizky Ramadhan", email: "rizky@example.com", wa: "081234567801",
        total: 140000, shirtColorHex: "#1c1d21", placement: defPlacement, fileName: "logo-band.png",
        proofFileName: "bukti1.jpg", ocrMatch: true, status: "menunggu_verifikasi" },
      { id: "SBI-DEMO-1002", createdAt: new Date(now - 3600e3 * 20).toISOString(), size: "A4", sizeLabel: "A4",
        shirtSize: "M", shirtSizeLabel: "M", sleeveLong: false, qty: 1,
        contourCut: false, catatan: "warna solid", nama: "Dewi Anjani", email: "dewi@example.com", wa: "081234567802",
        total: 70000, shirtColorHex: "#f5f5f0", placement: { view: "back", x: 50, y: 42, scale: 1, rotation: 0 },
        fileName: "desain-kaos.png", proofFileName: null, ocrMatch: null, status: "menunggu_pembayaran" },
      { id: "SBI-DEMO-1003", createdAt: new Date(now - 3600e3 * 40).toISOString(), size: "A5", sizeLabel: "A5",
        shirtSize: "M", shirtSizeLabel: "M", sleeveLong: true, qty: 5,
        contourCut: true, catatan: "", nama: "Fajar Nugroho", email: "fajar@example.com", wa: "081234567803",
        total: 400000, shirtColorHex: "#1c2b4a", placement: { view: "front", x: 62, y: 38, scale: 0.8, rotation: -6 },
        fileName: "logo-kecil.png", proofFileName: "bukti3.png", ocrMatch: false, status: "diverifikasi" },
      { id: "SBI-DEMO-1004", createdAt: new Date(now - 3600e3 * 70).toISOString(), size: "A4", sizeLabel: "A4",
        shirtSize: "XXL", shirtSizeLabel: "XXL", sleeveLong: false, qty: 3,
        contourCut: false, catatan: "", nama: "Nadia Putri", email: "nadia@example.com", wa: "081234567804",
        total: 225000, shirtColorHex: "#6b1f2a", placement: defPlacement, fileName: "event-2026.png",
        proofFileName: "bukti4.jpg", ocrMatch: true, status: "diproses" },
      { id: "SBI-DEMO-1005", createdAt: new Date(now - 3600e3 * 100).toISOString(), size: "A4", sizeLabel: "A4",
        shirtSize: "XXXL", shirtSizeLabel: "XXXL", sleeveLong: true, qty: 2,
        contourCut: true, catatan: "", nama: "Bagas Setiawan", email: "bagas@example.com", wa: "081234567805",
        total: 170000, shirtColorHex: "#c1272d", placement: defPlacement, fileName: "komunitas.png",
        proofFileName: "bukti5.jpg", ocrMatch: true, status: "selesai" }
    ];
    setLocalOrders(sample);

    var views = [];
    for (var i = 0; i < 14; i++){
      var count = Math.floor(Math.random() * 12) + 2;
      for (var j = 0; j < count; j++){
        var d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(Math.floor(Math.random() * 14) + 8);
        views.push(d.toISOString());
      }
    }
    setLocalViews(views);
    refreshAll();
  });

  document.getElementById("clearBtn").addEventListener("click", function(){
    if (!confirm("Hapus semua data order & kunjungan yang tersimpan di browser ini?")) return;
    localStorage.removeItem("sablonin_orders");
    localStorage.removeItem("sablonin_views");
    refreshAll();
  });

  // Data udah beneran (dari Sheets), bukan demo lagi - sembunyiin tombol seed/hapus lokal.
  if (API_URL){
    var seedBtn = document.getElementById("seedBtn");
    var clearBtn = document.getElementById("clearBtn");
    if (seedBtn) seedBtn.hidden = true;
    if (clearBtn) clearBtn.hidden = true;
  }

  var refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", refreshAll);

  refreshAll();
})();
