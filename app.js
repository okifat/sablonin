(function(){
  // ---- isi 3 nilai ini setelah daftar gratis di emailjs.com kalau mau notif email otomatis ----
  var EMAILJS_SERVICE_ID = "";
  var EMAILJS_TEMPLATE_ID = "";
  var EMAILJS_PUBLIC_KEY = "";
  var ADMIN_EMAIL = "isi-email-admin@contoh.com";

  if (EMAILJS_PUBLIC_KEY && typeof emailjs !== "undefined"){
    try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch (e) {}
  }

  var SIZES = {
    A5: { label: "A5", dim: "14.8 × 21 cm", price: 20000, cls: "c-blue", ov: { w: 44, h: 56 } },
    A4: { label: "A4", dim: "21 × 29.7 cm", price: 35000, cls: "c-ink", ov: { w: 58, h: 74 } },
    A3: { label: "A3", dim: "29.7 × 42 cm", price: 60000, cls: "c-coral", ov: { w: 76, h: 96 } }
  };
  var PRESET_COLORS = [
    { hex: "#f5f5f0", label: "Putih" },
    { hex: "#1c1d21", label: "Hitam" },
    { hex: "#1c2b4a", label: "Navy" },
    { hex: "#6b1f2a", label: "Maroon" },
    { hex: "#8b8d8f", label: "Abu-abu" },
    { hex: "#c1272d", label: "Merah" }
  ];
  var VIEWS = ["front", "right", "back", "left"];
  var VIEW_LABELS = { front: "Depan", right: "Kanan", back: "Belakang", left: "Kiri" };
  var DEFAULT_PLACEMENT = { x: 50, y: 42, scale: 1, rotation: 0 };
  var pendingSize = null;

  var state = {
    step: 1,
    hasFile: false,
    fileName: "",
    size: "A4",
    qty: 1,
    contourCut: false,
    catatan: "",
    nama: "",
    email: "",
    wa: "",
    orderId: null,
    orderCreatedAt: null,
    proofFile: null,
    proofUploadedAt: null,
    ocrMatch: null,
    shirtColorHex: "#f5f5f0",
    designDataUrl: null,
    viewIndex: 0,
    placement: { view: "front", x: 50, y: 42, scale: 1, rotation: 0 }
  };

  var els = {
    dropzone: document.getElementById("dropzone"),
    dzPreview: document.getElementById("dzPreview"),
    dzLabel: document.getElementById("dzLabel"),
    fileInput: document.getElementById("fileInput"),
    errFile: document.getElementById("err-file"),
    sizePicker: document.getElementById("sizePicker"),
    qty: document.getElementById("qty"),
    contourCut: document.getElementById("contourCut"),
    catatan: document.getElementById("catatan"),
    priceAmount: document.getElementById("priceAmount"),
    nama: document.getElementById("nama"),
    email: document.getElementById("email"),
    wa: document.getElementById("wa"),
    errContact: document.getElementById("err-contact"),
    summaryList: document.getElementById("summaryList"),
    orderIdDisplay: document.getElementById("orderIdDisplay"),
    orderIdDisplay2: document.getElementById("orderIdDisplay2"),
    qrGrid: document.getElementById("qrGrid"),
    qrAmount: document.getElementById("qrAmount"),
    proofInput: document.getElementById("proofInput"),
    proofStatus: document.getElementById("proofStatus"),
    laterLink: document.getElementById("laterLink"),
    laterLink2: document.getElementById("laterLink2"),
    timelineList: document.getElementById("timelineList"),
    notifList: document.getElementById("notifList"),
    stepper: document.querySelectorAll(".stepper-item"),
    priceGrid: document.getElementById("priceGrid"),
    shirtStage: document.getElementById("shirtStage"),
    colorPicker: document.getElementById("colorPicker"),
    colorRow: document.getElementById("colorRow"),
    designEditor: document.getElementById("designEditor"),
    designImgWrap: document.getElementById("designImgWrap"),
    rotateHandle: document.getElementById("rotateHandle"),
    resizeHandle: document.getElementById("resizeHandle"),
    viewLabel: document.getElementById("viewLabel"),
    viewPrevBtn: document.getElementById("viewPrevBtn"),
    viewNextBtn: document.getElementById("viewNextBtn")
  };

  var homeView = document.getElementById("homeView");
  var orderView = document.getElementById("orderView");

  function rupiah(n){ return "Rp " + n.toLocaleString("id-ID"); }

  function calcPrice(){ return SIZES[state.size].price * state.qty; }

  function updatePrice(){
    var p = calcPrice();
    els.priceAmount.textContent = rupiah(p);
    els.qrAmount.textContent = rupiah(p);
  }

  function renderPriceCards(){
    els.priceGrid.innerHTML = Object.keys(SIZES).map(function(key){
      var s = SIZES[key];
      var tag = key === "A4" ? '<span class="pc-tag"><span class="sticker">Paling Laris</span></span>' : "";
      return '<div class="price-card ' + s.cls + '">' + tag +
        '<div class="pc-size">' + s.label + '</div>' +
        '<div class="pc-dim">' + s.dim + '</div>' +
        '<div class="pc-price">' + rupiah(s.price) + '</div>' +
        '<div class="pc-note">per lembar, sudah termasuk potong rapi</div>' +
        '<button class="btn btn-ghost pc-btn" data-size="' + key + '">Pesan ' + s.label + '</button>' +
        '</div>';
    }).join("");
    els.priceGrid.querySelectorAll("[data-size]").forEach(function(btn){
      btn.addEventListener("click", function(){
        pendingSize = btn.getAttribute("data-size");
        goToOrder();
      });
    });
  }

  function renderSizePicker(){
    els.sizePicker.innerHTML = Object.keys(SIZES).map(function(key){
      var s = SIZES[key];
      var sel = state.size === key ? " selected" : "";
      return '<div class="size-card' + sel + '" data-size="' + key + '" tabindex="0" role="button" aria-label="Ukuran ' + s.label + '">' +
        '<div class="sc-name">' + s.label + '</div>' +
        '<div class="sc-dim">' + s.dim + '</div>' +
        '<div class="sc-price">' + rupiah(s.price) + '</div>' +
        '</div>';
    }).join("");
    els.sizePicker.querySelectorAll(".size-card").forEach(function(card){
      card.addEventListener("click", function(){
        state.size = card.getAttribute("data-size");
        renderSizePicker();
        updatePrice();
        renderDesignEditor();
      });
      card.addEventListener("keydown", function(e){
        if (e.key === "Enter" || e.key === " "){ e.preventDefault(); card.click(); }
      });
    });
  }

  // ---------- free color picker ----------
  function renderColorPresets(){
    els.colorRow.innerHTML = PRESET_COLORS.map(function(c){
      var sel = state.shirtColorHex.toLowerCase() === c.hex ? " selected" : "";
      return '<button type="button" class="color-dot' + sel + '" data-hex="' + c.hex + '" ' +
        'style="background:' + c.hex + '" title="' + c.label + '" aria-label="Warna ' + c.label + '"></button>';
    }).join("");
    els.colorRow.querySelectorAll(".color-dot").forEach(function(dot){
      dot.addEventListener("click", function(){ setShirtColor(dot.getAttribute("data-hex")); });
    });
  }

  function setShirtColor(hex){
    state.shirtColorHex = hex;
    els.colorPicker.value = hex;
    renderColorPresets();
    updateShirtColor();
  }

  function updateShirtColor(){
    document.querySelectorAll(".shirt-fill").forEach(function(p){ p.style.fill = state.shirtColorHex; });
  }

  els.colorPicker.addEventListener("input", function(){ setShirtColor(els.colorPicker.value); });

  // ---------- 360 view spin ----------
  function setView(idx){
    state.viewIndex = ((idx % VIEWS.length) + VIEWS.length) % VIEWS.length;
    var view = VIEWS[state.viewIndex];
    document.querySelectorAll(".shirt-svg").forEach(function(svg){
      svg.classList.toggle("active", svg.classList.contains("view-" + view));
    });
    els.viewLabel.textContent = VIEW_LABELS[view];
    renderDesignEditor();
  }
  els.viewPrevBtn.addEventListener("click", function(){ setView(state.viewIndex - 1); });
  els.viewNextBtn.addEventListener("click", function(){ setView(state.viewIndex + 1); });

  var swipeStartX = null;
  els.shirtStage.addEventListener("pointerdown", function(e){
    if (e.target.closest("#designEditor")) return;
    swipeStartX = e.clientX;
  });
  els.shirtStage.addEventListener("pointerup", function(e){
    if (swipeStartX === null) return;
    var dx = e.clientX - swipeStartX;
    if (Math.abs(dx) > 30) setView(state.viewIndex + (dx < 0 ? 1 : -1));
    swipeStartX = null;
  });

  document.querySelectorAll('input[name="printSide"]').forEach(function(r){
    r.addEventListener("change", function(){
      state.placement.view = r.value;
      setView(VIEWS.indexOf(r.value));
    });
  });

  document.getElementById("resetPosBtn").addEventListener("click", function(){
    state.placement = Object.assign({ view: state.placement.view }, DEFAULT_PLACEMENT);
    renderDesignEditor();
  });

  // ---------- live drag / resize / rotate design editor ----------
  function renderDesignEditor(){
    var currentView = VIEWS[state.viewIndex];
    if (currentView !== state.placement.view){
      els.designEditor.hidden = true;
      return;
    }
    els.designEditor.hidden = false;
    var base = SIZES[state.size].ov;
    var w = base.w * state.placement.scale;
    var h = base.h * state.placement.scale;
    els.designEditor.style.width = w + "px";
    els.designEditor.style.height = h + "px";
    els.designEditor.style.left = state.placement.x + "%";
    els.designEditor.style.top = state.placement.y + "%";
    els.designEditor.style.transform = "translate(-50%,-50%) rotate(" + state.placement.rotation + "deg)";
    els.designImgWrap.innerHTML = state.designDataUrl
      ? '<img src="' + state.designDataUrl + '" alt="Preview desain di baju">'
      : '<div class="design-placeholder">Desain kamu</div>';
  }

  var dragState = null;

  els.designEditor.addEventListener("pointerdown", function(e){
    if (e.target.closest(".handle")) return;
    e.preventDefault();
    try { els.designEditor.setPointerCapture(e.pointerId); } catch (err) {}
    dragState = {
      type: "move", startX: e.clientX, startY: e.clientY,
      origX: state.placement.x, origY: state.placement.y,
      stageRect: els.shirtStage.getBoundingClientRect()
    };
    els.designEditor.classList.add("dragging");
  });
  els.designEditor.addEventListener("pointermove", function(e){
    if (!dragState || dragState.type !== "move") return;
    var dxPct = (e.clientX - dragState.startX) / dragState.stageRect.width * 100;
    var dyPct = (e.clientY - dragState.startY) / dragState.stageRect.height * 100;
    state.placement.x = Math.min(90, Math.max(10, dragState.origX + dxPct));
    state.placement.y = Math.min(90, Math.max(10, dragState.origY + dyPct));
    renderDesignEditor();
  });
  ["pointerup", "pointercancel"].forEach(function(evt){
    els.designEditor.addEventListener(evt, function(){
      dragState = null;
      els.designEditor.classList.remove("dragging");
    });
  });

  els.resizeHandle.addEventListener("pointerdown", function(e){
    e.preventDefault(); e.stopPropagation();
    try { els.resizeHandle.setPointerCapture(e.pointerId); } catch (err) {}
    dragState = { type: "resize", startX: e.clientX, origScale: state.placement.scale };
  });
  els.resizeHandle.addEventListener("pointermove", function(e){
    if (!dragState || dragState.type !== "resize") return;
    var dx = e.clientX - dragState.startX;
    state.placement.scale = Math.min(2, Math.max(0.4, dragState.origScale + dx / 80));
    renderDesignEditor();
  });
  ["pointerup", "pointercancel"].forEach(function(evt){
    els.resizeHandle.addEventListener(evt, function(){ dragState = null; });
  });

  els.rotateHandle.addEventListener("pointerdown", function(e){
    e.preventDefault(); e.stopPropagation();
    try { els.rotateHandle.setPointerCapture(e.pointerId); } catch (err) {}
    dragState = { type: "rotate" };
  });
  els.rotateHandle.addEventListener("pointermove", function(e){
    if (!dragState || dragState.type !== "rotate") return;
    var rect = els.designEditor.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    state.placement.rotation = Math.round(angle);
    renderDesignEditor();
  });
  ["pointerup", "pointercancel"].forEach(function(evt){
    els.rotateHandle.addEventListener(evt, function(){ dragState = null; });
  });

  function buildQr(){
    els.qrGrid.innerHTML = "";
    var size = 11;
    for (var r = 0; r < size; r++){
      for (var c = 0; c < size; c++){
        var isFinder = (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3);
        var on = isFinder ? ((r === 1 || c === 1) ? false : true) : (Math.random() > 0.55);
        var cell = document.createElement("div");
        cell.className = "qr-cell" + (on ? " on" : "");
        els.qrGrid.appendChild(cell);
      }
    }
  }

  function pushNotif(channel, text){
    var empty = els.notifList.querySelector(".notif-empty");
    if (empty) empty.remove();
    var li = document.createElement("li");
    li.className = "notif-item " + channel;
    var time = new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", second: "2-digit"});
    li.innerHTML =
      '<span class="ch-dot"></span>' +
      '<div class="n-body">' +
        '<div class="n-chan">' + (channel === "email" ? "Email" : "Telegram") + '</div>' +
        '<div class="n-text">' + text + '</div>' +
        '<div class="n-time">' + time + '</div>' +
      '</div>';
    els.notifList.insertBefore(li, els.notifList.firstChild);
  }

  function renderStepper(){
    els.stepper.forEach(function(item){
      var n = parseInt(item.getAttribute("data-step"), 10);
      item.classList.remove("active", "done");
      if (n < state.step) item.classList.add("done");
      else if (n === state.step) item.classList.add("active");
    });
  }

  function showStep(n){
    state.step = n;
    for (var i = 1; i <= 4; i++){
      document.getElementById("panel-" + i).hidden = (i !== n);
    }
    renderStepper();
  }

  function goToOrder(){
    if (pendingSize){
      state.size = pendingSize;
      pendingSize = null;
      renderSizePicker();
      updatePrice();
    }
    homeView.hidden = true;
    orderView.hidden = false;
    window.scrollTo(0, 0);
  }

  function goHome(){
    orderView.hidden = true;
    homeView.hidden = false;
    window.scrollTo(0, 0);
  }

  document.getElementById("navBrand").addEventListener("click", goHome);
  document.getElementById("navOrderBtn").addEventListener("click", goToOrder);
  document.getElementById("heroOrderBtn").addEventListener("click", goToOrder);
  document.getElementById("ctaOrderBtn").addEventListener("click", goToOrder);
  document.getElementById("backHomeLink").addEventListener("click", goHome);

  document.querySelectorAll("a[data-target]").forEach(function(a){
    a.addEventListener("click", function(e){
      e.preventDefault();
      var target = a.getAttribute("data-target");
      if (!orderView.hidden) goHome();
      requestAnimationFrame(function(){
        var el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  // Step 1: dropzone
  els.dropzone.addEventListener("click", function(){ els.fileInput.click(); });
  els.dropzone.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); els.fileInput.click(); }
  });
  ["dragover","dragenter"].forEach(function(evt){
    els.dropzone.addEventListener(evt, function(e){ e.preventDefault(); els.dropzone.classList.add("drag"); });
  });
  ["dragleave","drop"].forEach(function(evt){
    els.dropzone.addEventListener(evt, function(e){ e.preventDefault(); els.dropzone.classList.remove("drag"); });
  });
  els.dropzone.addEventListener("drop", function(e){
    var f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  els.fileInput.addEventListener("change", function(e){
    var f = e.target.files[0];
    if (f) handleFile(f);
  });

  function handleFile(f){
    if (f.type.indexOf("image/") !== 0){
      els.errFile.textContent = "File harus berupa gambar (PNG/JPG).";
      return;
    }
    els.errFile.textContent = "";
    state.hasFile = true;
    state.fileName = f.name;
    var reader = new FileReader();
    reader.onload = function(e){
      els.dzPreview.innerHTML = '<img src="' + e.target.result + '" alt="Preview desain">';
      els.dzLabel.innerHTML = "<b>" + f.name + "</b> &mdash; klik untuk ganti file";
      state.designDataUrl = e.target.result;
      renderDesignEditor();
    };
    reader.readAsDataURL(f);
  }

  els.qty.addEventListener("input", function(){
    state.qty = parseInt(els.qty.value, 10) || 1;
    updatePrice();
  });
  els.contourCut.addEventListener("change", function(){ state.contourCut = els.contourCut.checked; });
  els.catatan.addEventListener("input", function(){ state.catatan = els.catatan.value; });

  document.getElementById("next-1").addEventListener("click", function(){
    if (!state.hasFile){
      els.errFile.textContent = "Upload desain dulu ya sebelum lanjut.";
      return;
    }
    showStep(2);
  });

  // Step 2
  document.getElementById("back-2").addEventListener("click", function(){ showStep(1); });
  document.getElementById("next-2").addEventListener("click", function(){
    state.nama = els.nama.value.trim();
    state.email = els.email.value.trim();
    state.wa = els.wa.value.trim();
    var validEmail = state.email.indexOf("@") > 0 && state.email.indexOf(".") > 0;
    var validWa = state.wa.replace(/\D/g, "").length >= 9;
    if (!state.nama || !validEmail || !validWa){
      els.errContact.textContent = "Isi nama, email valid, dan nomor WhatsApp minimal 9 digit.";
      return;
    }
    els.errContact.textContent = "";
    createOrder();
    showStep(3);
  });

  function createOrder(){
    var now = new Date();
    var ymd = now.getFullYear().toString().slice(2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    var rand = Math.floor(1000 + Math.random() * 9000);
    state.orderId = "SBI-" + ymd + "-" + rand;
    state.orderCreatedAt = now;

    els.orderIdDisplay.textContent = state.orderId;
    els.orderIdDisplay2.textContent = state.orderId;
    els.laterLink.textContent = "sablonin.id/bayar/" + state.orderId;
    els.laterLink2.textContent = "sablonin.id/bayar/" + state.orderId;

    renderSummary();
    buildQr();
    saveOrderToStorage();

    pushNotif("email", "Order baru " + state.orderId + " dari " + state.nama + " (" + state.email + ")");
    pushNotif("telegram", "Order baru masuk: " + state.orderId + " &mdash; " + rupiah(calcPrice()));
  }

  function saveOrderToStorage(){
    try {
      var key = "sablonin_orders";
      var orders = JSON.parse(localStorage.getItem(key) || "[]");
      orders.push({
        id: state.orderId,
        createdAt: state.orderCreatedAt.toISOString(),
        size: state.size,
        sizeLabel: SIZES[state.size].label,
        qty: state.qty,
        contourCut: state.contourCut,
        catatan: state.catatan,
        nama: state.nama,
        email: state.email,
        wa: state.wa,
        total: calcPrice(),
        shirtColorHex: state.shirtColorHex,
        placement: state.placement,
        fileName: state.fileName,
        proofFileName: null,
        ocrMatch: null,
        status: "menunggu_pembayaran"
      });
      localStorage.setItem(key, JSON.stringify(orders));
    } catch (e) {}
  }

  function updateOrderInStorage(patch){
    try {
      var key = "sablonin_orders";
      var orders = JSON.parse(localStorage.getItem(key) || "[]");
      for (var i = 0; i < orders.length; i++){
        if (orders[i].id === state.orderId){
          Object.assign(orders[i], patch);
          break;
        }
      }
      localStorage.setItem(key, JSON.stringify(orders));
    } catch (e) {}
  }

  function renderSummary(){
    var s = SIZES[state.size];
    var rows = [
      ["Desain", state.fileName || "-"],
      ["Ukuran", s.label + " (" + s.dim + ")"],
      ["Posisi cetak", state.placement.view === "back" ? "Belakang" : "Depan"],
      ["Jumlah", state.qty + " pcs"],
      ["Contour cut", state.contourCut ? "Ya" : "Tidak"],
      ["Catatan", state.catatan || "-"],
      ["Nama", state.nama],
      ["Email", state.email],
      ["WhatsApp", state.wa],
      ["Total", rupiah(calcPrice())]
    ];
    els.summaryList.innerHTML = rows.map(function(r){
      return '<div class="summary-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join("");
  }

  // ---------- Step 3: proof upload + best-effort amount check ----------
  els.proofInput.addEventListener("change", function(e){
    var f = e.target.files[0];
    if (!f) return;
    state.proofFile = f.name;
    state.proofUploadedAt = new Date();
    var total = calcPrice();
    els.proofStatus.innerHTML =
      '<div class="proof-status">Bukti bayar diterima: <b>' + f.name + '</b></div>' +
      '<div class="ocr-badge" id="ocrBadge"><span class="ocr-dot"></span>Memeriksa nominal di bukti transfer&hellip;</div>';
    updateOrderInStorage({ proofFileName: f.name, status: "menunggu_verifikasi" });
    pushNotif("email", "Bukti transfer diupload untuk " + state.orderId + " (" + f.name + ")");
    pushNotif("telegram", "Bukti bayar masuk untuk " + state.orderId + ", siap diverifikasi");
    checkProofAmount(f, total);
  });

  function checkProofAmount(file, expectedTotal){
    if (typeof Tesseract === "undefined"){
      setOcrBadge("unknown", "Deteksi otomatis nggak tersedia &mdash; tim tetap cek manual.");
      return;
    }
    Tesseract.recognize(file, "eng", { logger: function(){} }).then(function(result){
      var text = (result && result.data && result.data.text) || "";
      var groups = text.match(/[0-9][0-9.,]{3,}/g) || [];
      var expectedDigits = String(expectedTotal);
      var matched = groups.some(function(g){
        return g.replace(/[.,]/g, "").indexOf(expectedDigits) !== -1;
      });
      state.ocrMatch = matched;
      updateOrderInStorage({ ocrMatch: matched });
      if (matched){
        setOcrBadge("match", "Nominal " + rupiah(expectedTotal) + " kedeteksi di bukti transfer. Tim tetap verifikasi manual sebelum mulai cetak.");
        notifyAdminEmail(expectedTotal);
      } else {
        setOcrBadge("nomatch", "Nggak nemu nominal yang cocok otomatis di gambar &mdash; gapapa, tim bakal cek manual.");
      }
    }).catch(function(){
      setOcrBadge("unknown", "Deteksi otomatis gagal jalan &mdash; tim tetap cek manual.");
    });
  }

  function setOcrBadge(kind, html){
    var badge = document.getElementById("ocrBadge");
    if (!badge) return;
    badge.className = "ocr-badge" + (kind === "match" ? " match" : kind === "nomatch" ? " nomatch" : "");
    badge.innerHTML = '<span class="ocr-dot"></span>' + html;
  }

  function notifyAdminEmail(total){
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) return;
    if (typeof emailjs === "undefined") return;
    try {
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        order_id: state.orderId,
        nama: state.nama,
        total: rupiah(total),
        to_email: ADMIN_EMAIL
      });
    } catch (e) {}
  }

  document.getElementById("copyLaterLink").addEventListener("click", function(){ copyText(els.laterLink.textContent); });
  document.getElementById("copyLaterLink2").addEventListener("click", function(){ copyText(els.laterLink2.textContent); });
  document.getElementById("copyOrderId").addEventListener("click", function(){ copyText(state.orderId || ""); });

  function copyText(t){
    try { navigator.clipboard.writeText(t); } catch (e) {}
  }

  document.getElementById("back-3").addEventListener("click", function(){ showStep(2); });
  document.getElementById("next-3").addEventListener("click", function(){
    renderTimeline();
    showStep(4);
  });

  function fmtTime(d){
    return d ? d.toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}) : "";
  }

  function renderTimeline(){
    var hasProof = !!state.proofFile;
    var steps = [
      { title: "Order Diterima", time: fmtTime(state.orderCreatedAt), state: "done" },
      hasProof
        ? { title: "Bukti Pembayaran Diterima", time: fmtTime(state.proofUploadedAt), state: "done" }
        : { title: "Menunggu Pembayaran", time: "Upload lewat link di bawah kapan aja", state: "current" },
      hasProof
        ? { title: "Diverifikasi Tim", time: "Diproses maks. 1 jam", state: "current" }
        : { title: "Diverifikasi Tim", time: "", state: "upcoming" },
      { title: "Diproses Cetak", time: hasProof ? "" : "Baru mulai setelah bukti bayar diverifikasi", state: "upcoming" },
      { title: "Siap Diambil / Dikirim", time: "", state: "upcoming" }
    ];
    els.timelineList.innerHTML = steps.map(function(s){
      return '<li class="' + s.state + '">' +
        '<span class="dot"></span>' +
        '<div><div class="t-title">' + s.title + '</div>' +
        (s.time ? '<div class="t-time">' + s.time + '</div>' : '') +
        '</div></li>';
    }).join("");
  }

  document.getElementById("restartBtn").addEventListener("click", function(){
    state = {
      step: 1, hasFile: false, fileName: "", size: "A4", qty: 1,
      contourCut: false, catatan: "", nama: "", email: "", wa: "",
      orderId: null, orderCreatedAt: null, proofFile: null, proofUploadedAt: null, ocrMatch: null,
      shirtColorHex: "#f5f5f0", designDataUrl: null, viewIndex: 0,
      placement: { view: "front", x: 50, y: 42, scale: 1, rotation: 0 }
    };
    els.dzPreview.innerHTML = "";
    els.dzLabel.innerHTML = "<b>Klik untuk upload</b> atau tarik file ke sini";
    els.qty.value = 1;
    els.contourCut.checked = false; els.catatan.value = "";
    els.nama.value = ""; els.email.value = ""; els.wa.value = "";
    els.proofInput.value = ""; els.proofStatus.innerHTML = "";
    els.errFile.textContent = ""; els.errContact.textContent = "";
    document.querySelector('input[name="printSide"][value="front"]').checked = true;
    els.notifList.innerHTML = '<li class="notif-empty">Belum ada aktivitas. Mulai isi form di sebelah kiri.</li>';
    renderSizePicker();
    updatePrice();
    setShirtColor("#f5f5f0");
    setView(0);
    showStep(1);
  });

  function trackView(){
    try {
      var key = "sablonin_views";
      var views = JSON.parse(localStorage.getItem(key) || "[]");
      views.push(new Date().toISOString());
      if (views.length > 3000) views = views.slice(-3000);
      localStorage.setItem(key, JSON.stringify(views));
    } catch (e) {}
  }

  renderPriceCards();
  renderSizePicker();
  updatePrice();
  renderColorPresets();
  updateShirtColor();
  setView(0);
  trackView();
  showStep(1);
})();
