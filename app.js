(function(){
  // ---- isi URL Web App Apps Script di sini kalau mau order kesimpen ke Google Sheets/Drive ----
  // Lihat SETUP_SHEETS.md. Kosongin aja kalau belum mau setup, situs tetap jalan pakai localStorage.
  var API_URL = "";

  function apiPost(action, payload){
    if (!API_URL) return;
    var body = Object.assign({ action: action }, payload);
    fetch(API_URL, { method: "POST", body: JSON.stringify(body) }).catch(function(){});
  }

  function readAsDataUrl(file){
    return new Promise(function(resolve){
      if (!file){ resolve(null); return; }
      var reader = new FileReader();
      reader.onload = function(e){ resolve(e.target.result); };
      reader.onerror = function(){ resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  // ---- isi 3 nilai ini setelah daftar gratis di emailjs.com kalau mau notif email otomatis ----
  var EMAILJS_SERVICE_ID = "";
  var EMAILJS_TEMPLATE_ID = "";
  var EMAILJS_PUBLIC_KEY = "";
  var ADMIN_EMAIL = "isi-email-admin@contoh.com";

  if (EMAILJS_PUBLIC_KEY && typeof emailjs !== "undefined"){
    try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch (e) {}
  }

  var SIZES = {
    A5: { label: "A5", dim: "14.8 × 21 cm", cls: "c-blue", ov: { w: 44, h: 56 } },
    A4: { label: "A4", dim: "21 × 29.7 cm", cls: "c-ink", ov: { w: 58, h: 74 } }
  };
  var SHIRT_SIZES = {
    M: { label: "M", price: 70000 },
    L: { label: "L", price: 70000 },
    XL: { label: "XL", price: 70000 },
    XXL: { label: "XXL", price: 75000 },
    XXXL: { label: "XXXL", price: 80000 }
  };
  var SHIRT_PRICE_TIERS = [
    { label: "M – XL", price: 70000, cls: "c-blue", firstSize: "M" },
    { label: "XXL – XXXL", priceMin: 75000, priceMax: 80000, cls: "c-coral", firstSize: "XXL" }
  ];
  var SLEEVE_LONG_ADDON = 10000;
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
  var pendingShirtSize = null;

  var state = {
    step: 1,
    hasFile: false,
    fileName: "",
    size: "A4",
    shirtSize: "M",
    sleeveLong: false,
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
    placement: { view: "front", x: 50, y: 42, scale: 1, rotation: 0 },
    backEnabled: false,
    backHasFile: false,
    backFileName: "",
    backDesignDataUrl: null,
    backPlacement: { view: "back", x: 50, y: 42, scale: 1, rotation: 0 }
  };

  var els = {
    dropzone: document.getElementById("dropzone"),
    dzPreview: document.getElementById("dzPreview"),
    dzLabel: document.getElementById("dzLabel"),
    fileInput: document.getElementById("fileInput"),
    errFile: document.getElementById("err-file"),
    backEnabled: document.getElementById("backEnabled"),
    backDesignSection: document.getElementById("backDesignSection"),
    dropzoneBack: document.getElementById("dropzoneBack"),
    dzPreviewBack: document.getElementById("dzPreviewBack"),
    dzLabelBack: document.getElementById("dzLabelBack"),
    fileInputBack: document.getElementById("fileInputBack"),
    errFileBack: document.getElementById("err-file-back"),
    activeSideLabel: document.getElementById("activeSideLabel"),
    backHint: document.getElementById("backHint"),
    spinHint: document.getElementById("spinHint"),
    downloadPreviewBtn: document.getElementById("downloadPreviewBtn"),
    sizePicker: document.getElementById("sizePicker"),
    shirtSizeRow: document.getElementById("shirtSizeRow"),
    sleeveLong: document.getElementById("sleeveLong"),
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
    qrImage: document.getElementById("qrImage"),
    qrImageMissing: document.getElementById("qrImageMissing"),
    qrAmount: document.getElementById("qrAmount"),
    proofInput: document.getElementById("proofInput"),
    proofStatus: document.getElementById("proofStatus"),
    laterLink: document.getElementById("laterLink"),
    laterLink2: document.getElementById("laterLink2"),
    uploadProofBox2: document.getElementById("uploadProofBox2"),
    uploadProofBtn2: document.getElementById("uploadProofBtn2"),
    timelineList: document.getElementById("timelineList"),
    notifList: document.getElementById("notifList"),
    stepper: document.querySelectorAll(".stepper-item"),
    priceGrid: document.getElementById("priceGrid"),
    shirtStage: document.getElementById("shirtStage"),
    shirtCanvas: document.getElementById("shirtCanvas"),
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

  // Link "lanjutin bayar nanti" - link BENERAN (bukan domain contoh), dibuat dari
  // origin halaman yang lagi jalan sekarang (localhost pas dev, domain asli kalau
  // udah di-deploy) + query ?order=ID. Query string aman dipakai di static file
  // server manapun (gak butuh routing/rewrite khusus) karena tetap nge-load
  // index.html yang sama - resumeOrderFromUrl() yang baca query-nya pas halaman load.
  function buildResumeLink(orderId){
    return location.origin + location.pathname + "?order=" + encodeURIComponent(orderId);
  }

  function calcShirtPrice(){
    return SHIRT_SIZES[state.shirtSize].price + (state.sleeveLong ? SLEEVE_LONG_ADDON : 0);
  }

  function calcPrice(){ return calcShirtPrice() * state.qty; }

  function updatePrice(){
    var p = calcPrice();
    els.priceAmount.textContent = rupiah(p);
    els.qrAmount.textContent = rupiah(p);
  }

  function renderShirtSizes(){
    els.shirtSizeRow.innerHTML = Object.keys(SHIRT_SIZES).map(function(key){
      var s = SHIRT_SIZES[key];
      var checked = state.shirtSize === key ? " checked" : "";
      return '<label class="radio-chip"><input type="radio" name="shirtSize" value="' + key + '"' + checked + '> ' +
        s.label + " (" + rupiah(s.price) + ")</label>";
    }).join("");
  }

  function renderPriceCards(){
    els.priceGrid.innerHTML = SHIRT_PRICE_TIERS.map(function(t){
      var tag = t.firstSize === "M" ? '<span class="pc-tag"><span class="sticker">Paling Laris</span></span>' : "";
      var priceText = t.priceMin != null ? (rupiah(t.priceMin) + " – " + rupiah(t.priceMax)) : rupiah(t.price);
      var note = t.priceMin != null ? "ukurannya dipilih pas checkout" : "sudah termasuk kaos &amp; cetak DTF";
      return '<div class="price-card ' + t.cls + '">' + tag +
        '<div class="pc-size">' + t.label + '</div>' +
        '<div class="pc-dim">Kaos custom lengan pendek, Cotton Combed 24s + cetak, desain sampai A4</div>' +
        '<div class="pc-price' + (t.priceMin != null ? " pc-price-range" : "") + '">' + priceText + '</div>' +
        '<div class="pc-note">' + note + '</div>' +
        '<button class="btn btn-ghost pc-btn" data-shirt-size="' + t.firstSize + '">Pesan Sekarang</button>' +
        '</div>';
    }).join("");
    els.priceGrid.querySelectorAll("[data-shirt-size]").forEach(function(btn){
      btn.addEventListener("click", function(){
        pendingShirtSize = btn.getAttribute("data-shirt-size");
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
    if (window.Shirt3D) Shirt3D.setColor(state.shirtColorHex);
  }

  els.colorPicker.addEventListener("input", function(){ setShirtColor(els.colorPicker.value); });

  // ---------- 360 view spin (3D, seret bebas + snap ke 4 sisi) ----------
  var VIEW_ANGLES = [0, 90, 180, 270];

  function angleToNearestViewIndex(deg){
    var norm = ((deg % 360) + 360) % 360;
    var nearest = 0, best = Infinity;
    for (var i = 0; i < VIEW_ANGLES.length; i++){
      var diff = Math.abs(norm - VIEW_ANGLES[i]);
      diff = Math.min(diff, 360 - diff);
      if (diff < best){ best = diff; nearest = i; }
    }
    return nearest;
  }

  // Desain depan & belakang independen - fungsi ini yang nentuin sisi mana yang lagi
  // "aktif" diedit berdasarkan sisi baju yang lagi ditampilin (view kanan/kiri gak
  // pernah punya desain, cuma depan & belakang, dan belakang cuma aktif kalau
  // backEnabled dicentang).
  function activeDesignSlot(){
    var v = VIEWS[state.viewIndex];
    if (v === "front") return "front";
    if (v === "back" && state.backEnabled) return "back";
    return null;
  }
  function activePlacement(){
    var slot = activeDesignSlot();
    if (slot === "front") return state.placement;
    if (slot === "back") return state.backPlacement;
    return null;
  }
  function activeDesignDataUrl(){
    var slot = activeDesignSlot();
    if (slot === "front") return state.designDataUrl;
    if (slot === "back") return state.backDesignDataUrl;
    return null;
  }

  function setView(idx, skipAnimate){
    state.viewIndex = ((idx % VIEWS.length) + VIEWS.length) % VIEWS.length;
    var view = VIEWS[state.viewIndex];
    els.viewLabel.textContent = VIEW_LABELS[view];
    if (window.Shirt3D && Shirt3D.isReady()){
      if (skipAnimate) Shirt3D.setRotationY(VIEW_ANGLES[state.viewIndex]);
      else Shirt3D.animateRotationTo(VIEW_ANGLES[state.viewIndex], 320);
    }
    var slot = activeDesignSlot();
    els.activeSideLabel.textContent = "Atur desain: " + (slot === "back" ? "Belakang" : "Depan");
    els.backHint.hidden = !(view === "back" && !state.backEnabled);
    els.spinHint.hidden = !els.backHint.hidden;
    renderDesignEditor();
  }
  els.viewPrevBtn.addEventListener("click", function(){ setView(state.viewIndex - 1); });
  els.viewNextBtn.addEventListener("click", function(){ setView(state.viewIndex + 1); });

  var dragRotate = null;
  els.shirtStage.addEventListener("pointerdown", function(e){
    if (e.target.closest("#designEditor")) return;
    if (!window.Shirt3D || !Shirt3D.isReady()) return;
    dragRotate = { startX: e.clientX, startRot: Shirt3D.getRotationY() };
    try { els.shirtStage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  els.shirtStage.addEventListener("pointermove", function(e){
    if (!dragRotate) return;
    var dx = e.clientX - dragRotate.startX;
    Shirt3D.setRotationY(dragRotate.startRot + dx * 0.6);
  });
  function endDragRotate(){
    if (!dragRotate) return;
    dragRotate = null;
    setView(angleToNearestViewIndex(Shirt3D.getRotationY()));
  }
  els.shirtStage.addEventListener("pointerup", endDragRotate);
  els.shirtStage.addEventListener("pointercancel", endDragRotate);

  els.backEnabled.addEventListener("change", function(){
    state.backEnabled = els.backEnabled.checked;
    els.backDesignSection.hidden = !state.backEnabled;
    if (!state.backEnabled){
      els.errFileBack.textContent = "";
    }
    setView(state.viewIndex, true);
  });

  document.getElementById("resetPosBtn").addEventListener("click", function(){
    var slot = activeDesignSlot();
    if (slot === "front") state.placement = Object.assign({ view: "front" }, DEFAULT_PLACEMENT);
    else if (slot === "back") state.backPlacement = Object.assign({ view: "back" }, DEFAULT_PLACEMENT);
    renderDesignEditor();
  });

  els.downloadPreviewBtn.addEventListener("click", downloadPreview);

  // ---------- live drag / resize / rotate design editor ----------
  function renderDesignEditor(){
    var placement = activePlacement();
    if (!placement){
      els.designEditor.hidden = true;
      return;
    }
    els.designEditor.hidden = false;
    var base = SIZES[state.size].ov;
    var w = base.w * placement.scale;
    var h = base.h * placement.scale;
    els.designEditor.style.width = w + "px";
    els.designEditor.style.height = h + "px";
    els.designEditor.style.left = placement.x + "%";
    els.designEditor.style.top = placement.y + "%";
    els.designEditor.style.transform = "translate(-50%,-50%) rotate(" + placement.rotation + "deg)";
    var dataUrl = activeDesignDataUrl();
    els.designImgWrap.innerHTML = dataUrl
      ? '<img src="' + dataUrl + '" alt="Preview desain di baju">'
      : '<div class="design-placeholder">Desain kamu</div>';
  }

  var dragState = null;

  els.designEditor.addEventListener("pointerdown", function(e){
    if (e.target.closest(".handle")) return;
    var placement = activePlacement();
    if (!placement) return;
    e.preventDefault();
    try { els.designEditor.setPointerCapture(e.pointerId); } catch (err) {}
    dragState = {
      type: "move", startX: e.clientX, startY: e.clientY,
      origX: placement.x, origY: placement.y,
      stageRect: els.shirtStage.getBoundingClientRect()
    };
    els.designEditor.classList.add("dragging");
  });
  els.designEditor.addEventListener("pointermove", function(e){
    if (!dragState || dragState.type !== "move") return;
    var placement = activePlacement();
    if (!placement) return;
    var dxPct = (e.clientX - dragState.startX) / dragState.stageRect.width * 100;
    var dyPct = (e.clientY - dragState.startY) / dragState.stageRect.height * 100;
    placement.x = Math.min(90, Math.max(10, dragState.origX + dxPct));
    placement.y = Math.min(90, Math.max(10, dragState.origY + dyPct));
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
    var placement = activePlacement();
    if (!placement) return;
    try { els.resizeHandle.setPointerCapture(e.pointerId); } catch (err) {}
    dragState = { type: "resize", startX: e.clientX, origScale: placement.scale };
  });
  els.resizeHandle.addEventListener("pointermove", function(e){
    if (!dragState || dragState.type !== "resize") return;
    var placement = activePlacement();
    if (!placement) return;
    var dx = e.clientX - dragState.startX;
    placement.scale = Math.min(2, Math.max(0.4, dragState.origScale + dx / 80));
    renderDesignEditor();
  });
  ["pointerup", "pointercancel"].forEach(function(evt){
    els.resizeHandle.addEventListener(evt, function(){ dragState = null; });
  });

  els.rotateHandle.addEventListener("pointerdown", function(e){
    e.preventDefault(); e.stopPropagation();
    if (!activePlacement()) return;
    try { els.rotateHandle.setPointerCapture(e.pointerId); } catch (err) {}
    dragState = { type: "rotate" };
  });
  els.rotateHandle.addEventListener("pointermove", function(e){
    if (!dragState || dragState.type !== "rotate") return;
    var placement = activePlacement();
    if (!placement) return;
    var rect = els.designEditor.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    placement.rotation = Math.round(angle);
    renderDesignEditor();
  });
  ["pointerup", "pointercancel"].forEach(function(evt){
    els.rotateHandle.addEventListener(evt, function(){ dragState = null; });
  });

  els.qrImage.addEventListener("error", function(){
    els.qrImage.hidden = true;
    els.qrImageMissing.hidden = false;
  }, { once: true });

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
    if (pendingShirtSize){
      state.shirtSize = pendingShirtSize;
      pendingShirtSize = null;
      renderShirtSizes();
      updatePrice();
    }
    homeView.hidden = true;
    orderView.hidden = false;
    window.scrollTo(0, 0);
    if (window.Shirt3D && !Shirt3D.isReady()){
      Shirt3D.init(els.shirtCanvas, state.shirtColorHex);
      Shirt3D.setRotationY(VIEW_ANGLES[state.viewIndex]);
    } else if (window.Shirt3D){
      Shirt3D.resize();
    }
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

  // Step 1: dropzone desain belakang (opsional, cuma aktif kalau backEnabled dicentang)
  els.dropzoneBack.addEventListener("click", function(){ els.fileInputBack.click(); });
  els.dropzoneBack.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); els.fileInputBack.click(); }
  });
  ["dragover","dragenter"].forEach(function(evt){
    els.dropzoneBack.addEventListener(evt, function(e){ e.preventDefault(); els.dropzoneBack.classList.add("drag"); });
  });
  ["dragleave","drop"].forEach(function(evt){
    els.dropzoneBack.addEventListener(evt, function(e){ e.preventDefault(); els.dropzoneBack.classList.remove("drag"); });
  });
  els.dropzoneBack.addEventListener("drop", function(e){
    var f = e.dataTransfer.files[0];
    if (f) handleFileBack(f);
  });
  els.fileInputBack.addEventListener("change", function(e){
    var f = e.target.files[0];
    if (f) handleFileBack(f);
  });

  function handleFileBack(f){
    if (f.type.indexOf("image/") !== 0){
      els.errFileBack.textContent = "File harus berupa gambar (PNG/JPG).";
      return;
    }
    els.errFileBack.textContent = "";
    state.backHasFile = true;
    state.backFileName = f.name;
    var reader = new FileReader();
    reader.onload = function(e){
      els.dzPreviewBack.innerHTML = '<img src="' + e.target.result + '" alt="Preview desain belakang">';
      els.dzLabelBack.innerHTML = "<b>" + f.name + "</b> &mdash; klik untuk ganti file";
      state.backDesignDataUrl = e.target.result;
      renderDesignEditor();
    };
    reader.readAsDataURL(f);
  }

  // ---------- download hasil preview (canvas 3D + desain aktif digabung jadi 1 PNG) ----------
  function downloadPreview(){
    if (!window.Shirt3D || !Shirt3D.isReady()) return;
    var stageRect = els.shirtStage.getBoundingClientRect();
    var scaleFactor = 2;
    var out = document.createElement("canvas");
    out.width = Math.round(stageRect.width * scaleFactor);
    out.height = Math.round(stageRect.height * scaleFactor);
    var ctx = out.getContext("2d");
    // isi putih dulu sebelum nimpa canvas WebGL-nya - canvas 3D itu transparan
    // (alpha:true) dan kalau langsung di-drawImage ke kanvas kosong, pixel tepi
    // yang anti-aliased suka keluar abu-abu (unpremultiplied alpha), bukan mulus.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(els.shirtCanvas, 0, 0, out.width, out.height);

    var dataUrl = activeDesignDataUrl();
    var placement = activePlacement();

    function finish(){
      var link = document.createElement("a");
      link.download = "sablonin-preview-" + VIEWS[state.viewIndex] + ".png";
      link.href = out.toDataURL("image/png");
      link.click();
    }

    if (dataUrl && placement){
      var img = new Image();
      img.onload = function(){
        var base = SIZES[state.size].ov;
        var w = base.w * placement.scale * scaleFactor;
        var h = base.h * placement.scale * scaleFactor;
        var cx = (placement.x / 100) * out.width;
        var cy = (placement.y / 100) * out.height;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(placement.rotation * Math.PI / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
        finish();
      };
      img.onerror = finish;
      img.src = dataUrl;
    } else {
      finish();
    }
  }

  els.qty.addEventListener("input", function(){
    state.qty = parseInt(els.qty.value, 10) || 1;
    updatePrice();
  });
  els.shirtSizeRow.addEventListener("change", function(e){
    if (e.target && e.target.name === "shirtSize"){
      state.shirtSize = e.target.value;
      updatePrice();
    }
  });
  els.sleeveLong.addEventListener("change", function(){
    state.sleeveLong = els.sleeveLong.checked;
    updatePrice();
  });
  els.contourCut.addEventListener("change", function(){ state.contourCut = els.contourCut.checked; });
  els.catatan.addEventListener("input", function(){ state.catatan = els.catatan.value; });

  document.getElementById("next-1").addEventListener("click", function(){
    if (!state.hasFile){
      els.errFile.textContent = "Upload desain dulu ya sebelum lanjut.";
      return;
    }
    if (state.backEnabled && !state.backHasFile){
      els.errFileBack.textContent = "Sudah aktifin desain belakang - upload dulu gambarnya, atau matiin lagi kalau gak jadi.";
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
    els.laterLink.textContent = buildResumeLink(state.orderId);
    els.laterLink2.textContent = buildResumeLink(state.orderId);

    renderSummary();
    saveOrderToStorage();

    pushNotif("email", "Order baru " + state.orderId + " dari " + state.nama + " (" + state.email + ")");
    pushNotif("telegram", "Order baru masuk: " + state.orderId + " &mdash; " + rupiah(calcPrice()));
  }

  function saveOrderToStorage(){
    var order = {
      id: state.orderId,
      createdAt: state.orderCreatedAt.toISOString(),
      size: state.size,
      sizeLabel: SIZES[state.size].label,
      shirtSize: state.shirtSize,
      shirtSizeLabel: SHIRT_SIZES[state.shirtSize].label,
      sleeveLong: state.sleeveLong,
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
      backEnabled: state.backEnabled,
      backPlacement: state.backEnabled ? state.backPlacement : null,
      backFileName: state.backEnabled ? state.backFileName : "",
      proofFileName: null,
      ocrMatch: null,
      status: "menunggu_pembayaran"
    };
    try {
      var key = "sablonin_orders";
      var orders = JSON.parse(localStorage.getItem(key) || "[]");
      orders.push(order);
      localStorage.setItem(key, JSON.stringify(orders));
    } catch (e) {}
    // kirim juga ke Google Sheets/Drive kalau API_URL sudah diisi (lihat SETUP_SHEETS.md)
    apiPost("createOrder", Object.assign({}, order, {
      designDataUrl: state.designDataUrl,
      backDesignDataUrl: state.backEnabled ? state.backDesignDataUrl : null
    }));
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
      ["Desain depan", state.fileName || "-"],
      ["Desain belakang", state.backEnabled ? (state.backFileName || "-") : "Tidak ada"],
      ["Ukuran desain", s.label + " (" + s.dim + ")"],
      ["Ukuran baju", SHIRT_SIZES[state.shirtSize].label + (state.sleeveLong ? " · Lengan panjang" : " · Lengan pendek")],
      ["Posisi cetak", "Depan" + (state.backEnabled ? " + Belakang" : "")],
      ["Jumlah", state.qty + " pcs"],
      ["Contour cut", state.contourCut ? "Ya" : "Tidak"],
      ["Catatan", state.catatan || "-"],
      ["Nama", state.nama],
      ["Email", state.email],
      ["WhatsApp", state.wa],
      ["Harga per pcs", rupiah(calcShirtPrice())],
      ["Total", rupiah(calcPrice())]
    ];
    els.summaryList.innerHTML = rows.map(function(r){
      return '<div class="summary-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join("");
  }

  // Sama kayak renderSummary(), tapi dari data order yang udah tersimpan (localStorage) -
  // dipakai pas buka link "lanjutin bayar nanti", karena saat itu gak ada proses upload
  // desain/pilih ukuran yang baru jalan - state 3D/step 1 gak perlu direkonstruksi ulang,
  // cukup baca langsung field-field flat yang udah kesimpen di object order-nya.
  function renderSummaryFromOrder(order){
    var rows = [
      ["Desain depan", order.fileName || "-"],
      ["Desain belakang", order.backEnabled ? (order.backFileName || "-") : "Tidak ada"],
      ["Ukuran desain", order.sizeLabel || "-"],
      ["Ukuran baju", order.shirtSizeLabel + (order.sleeveLong ? " · Lengan panjang" : " · Lengan pendek")],
      ["Posisi cetak", "Depan" + (order.backEnabled ? " + Belakang" : "")],
      ["Jumlah", order.qty + " pcs"],
      ["Contour cut", order.contourCut ? "Ya" : "Tidak"],
      ["Catatan", order.catatan || "-"],
      ["Nama", order.nama],
      ["Email", order.email],
      ["WhatsApp", order.wa],
      ["Total", rupiah(order.total)]
    ];
    els.summaryList.innerHTML = rows.map(function(r){
      return '<div class="summary-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join("");
  }

  // Buka link "lanjutin bayar nanti" (?order=ID di URL) - cari order-nya di
  // localStorage BROWSER INI (data emang cuma tersimpan per-device, lihat README),
  // kalau ketemu langsung lompat ke step Bayar/Selesai tanpa lewat step 1-2 lagi.
  function resumeOrderFromUrl(){
    var orderId = new URLSearchParams(location.search).get("order");
    if (!orderId) return false;
    var orders = [];
    try { orders = JSON.parse(localStorage.getItem("sablonin_orders") || "[]"); } catch (e) {}
    var order = orders.filter(function(o){ return o.id === orderId; })[0];
    if (!order){
      alert("Order " + orderId + " gak ketemu di browser ini. Data order cuma tersimpan lokal per-device/browser (lihat README) - buka dari device/browser yang sama waktu order dibuat ya.");
      return false;
    }
    state.orderId = order.id;
    state.orderCreatedAt = new Date(order.createdAt);
    state.nama = order.nama; state.email = order.email; state.wa = order.wa;
    state.proofFile = order.proofFileName || null;
    state.proofUploadedAt = order.proofUploadedAt ? new Date(order.proofUploadedAt) : null;

    els.orderIdDisplay.textContent = order.id;
    els.orderIdDisplay2.textContent = order.id;
    els.laterLink.textContent = buildResumeLink(order.id);
    els.laterLink2.textContent = buildResumeLink(order.id);
    els.qrAmount.textContent = rupiah(order.total);
    renderSummaryFromOrder(order);

    goToOrder();
    if (state.proofFile){
      renderTimeline();
      els.uploadProofBox2.hidden = true;
      showStep(4);
    } else {
      showStep(3);
    }
    return true;
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
    updateOrderInStorage({ proofFileName: f.name, proofUploadedAt: state.proofUploadedAt.toISOString(), status: "menunggu_verifikasi" });
    pushNotif("email", "Bukti transfer diupload untuk " + state.orderId + " (" + f.name + ")");
    pushNotif("telegram", "Bukti bayar masuk untuk " + state.orderId + ", siap diverifikasi");
    readAsDataUrl(f).then(function(dataUrl){
      apiPost("updateProof", { id: state.orderId, proofDataUrl: dataUrl });
    });
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
      apiPost("updateOcr", { id: state.orderId, ocrMatch: matched });
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
    els.uploadProofBox2.hidden = !!state.proofFile;
    showStep(4);
  });

  // step 4: kalau tadi lewatin upload bukti bayar di step 3, tombol ini balikin
  // ke step 3 buat upload sekarang - order-nya masih sama (createOrder gak dipanggil
  // ulang), jadi gak bikin order duplikat/notif dobel.
  els.uploadProofBtn2.addEventListener("click", function(){ showStep(3); });

  function fmtTime(d){
    return d ? d.toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}) : "";
  }

  // Urutan status HARUS sama kayak STATUS_LABELS di admin/app.js - timeline di sini
  // ngikutin status ASLI yang di-set admin (bukan cuma nebak dari ada/gaknya bukti
  // bayar), biar begitu admin ubah status, pelanggan yang buka link liat progress
  // yang sebenarnya, sampai ke "Selesai".
  var TIMELINE_STEPS = [
    { key: "order_diterima", title: "Order Diterima" },
    { key: "menunggu_pembayaran", title: "Menunggu Pembayaran" },
    { key: "menunggu_verifikasi", title: "Menunggu Verifikasi" },
    { key: "diverifikasi", title: "Diverifikasi Tim" },
    { key: "diproses", title: "Diproses Cetak" },
    { key: "siap", title: "Siap Diambil / Dikirim" },
    { key: "selesai", title: "Selesai" }
  ];
  var STATUS_ORDER = TIMELINE_STEPS.map(function(s){ return s.key; });

  // Baca status TERBARU langsung dari localStorage (bukan dari state JS yang bisa
  // basi) - ini yang bikin timeline selalu nunjukin hasil update admin yang paling
  // baru, termasuk kalau di-update dari tab admin yang lagi kebuka di tab lain.
  function getStoredOrder(orderId){
    try {
      var orders = JSON.parse(localStorage.getItem("sablonin_orders") || "[]");
      return orders.filter(function(o){ return o.id === orderId; })[0] || null;
    } catch (e) { return null; }
  }

  function renderTimeline(){
    var stored = state.orderId ? getStoredOrder(state.orderId) : null;
    var status = (stored && stored.status) || (state.proofFile ? "menunggu_verifikasi" : "menunggu_pembayaran");
    if (stored && stored.proofUploadedAt) state.proofUploadedAt = new Date(stored.proofUploadedAt);
    var currentIdx = STATUS_ORDER.indexOf(status);
    if (currentIdx < 0) currentIdx = 1;

    var steps = TIMELINE_STEPS.map(function(s, i){
      var st = status === "selesai" ? "done" : (i < currentIdx ? "done" : (i === currentIdx ? "current" : "upcoming"));
      var time = "";
      if (s.key === "order_diterima") time = fmtTime(state.orderCreatedAt);
      else if (s.key === "menunggu_pembayaran" && i === currentIdx) time = "Upload lewat link di bawah kapan aja";
      else if (s.key === "menunggu_verifikasi" && (st === "done" || i === currentIdx)) time = fmtTime(state.proofUploadedAt);
      else if (s.key === "diverifikasi" && i === currentIdx) time = "Diproses maks. 1 jam";
      else if (s.key === "diproses" && i === currentIdx) time = "Lagi diproses cetak sekarang";
      return { title: s.title, time: time, state: st };
    });
    els.timelineList.innerHTML = steps.map(function(s){
      return '<li class="' + s.state + '">' +
        '<span class="dot"></span>' +
        '<div><div class="t-title">' + s.title + '</div>' +
        (s.time ? '<div class="t-time">' + s.time + '</div>' : '') +
        '</div></li>';
    }).join("");
  }

  // Kalau tab ini lagi kebuka di step "Selesai" pas admin ubah status di tab lain
  // (localStorage sama-sama di origin ini), event "storage" nembak otomatis di SINI
  // (browser gak nembakin storage event ke tab yang bikin perubahannya sendiri) -
  // jadi timeline ke-refresh live tanpa pelanggan perlu reload/buka link lagi.
  window.addEventListener("storage", function(e){
    if (e.key === "sablonin_orders" && state.step === 4 && state.orderId){
      renderTimeline();
    }
  });

  document.getElementById("restartBtn").addEventListener("click", function(){
    state = {
      step: 1, hasFile: false, fileName: "", size: "A4", qty: 1,
      contourCut: false, catatan: "", nama: "", email: "", wa: "",
      orderId: null, orderCreatedAt: null, proofFile: null, proofUploadedAt: null, ocrMatch: null,
      shirtColorHex: "#f5f5f0", designDataUrl: null, viewIndex: 0,
      placement: { view: "front", x: 50, y: 42, scale: 1, rotation: 0 },
      backEnabled: false, backHasFile: false, backFileName: "", backDesignDataUrl: null,
      backPlacement: { view: "back", x: 50, y: 42, scale: 1, rotation: 0 }
    };
    els.dzPreview.innerHTML = "";
    els.dzLabel.innerHTML = "<b>Klik untuk upload</b> atau tarik file ke sini";
    els.dzPreviewBack.innerHTML = "";
    els.dzLabelBack.innerHTML = "<b>Klik untuk upload</b> atau tarik file desain belakang ke sini";
    els.qty.value = 1;
    els.contourCut.checked = false; els.catatan.value = "";
    els.nama.value = ""; els.email.value = ""; els.wa.value = "";
    els.proofInput.value = ""; els.proofStatus.innerHTML = "";
    els.errFile.textContent = ""; els.errContact.textContent = ""; els.errFileBack.textContent = "";
    els.backEnabled.checked = false;
    els.backDesignSection.hidden = true;
    els.notifList.innerHTML = '<li class="notif-empty">Belum ada aktivitas. Mulai isi form di sebelah kiri.</li>';
    renderSizePicker();
    updatePrice();
    setShirtColor("#f5f5f0");
    setView(0);
    showStep(1);
  });

  function trackView(){
    var ts = new Date().toISOString();
    try {
      var key = "sablonin_views";
      var views = JSON.parse(localStorage.getItem(key) || "[]");
      views.push(ts);
      if (views.length > 3000) views = views.slice(-3000);
      localStorage.setItem(key, JSON.stringify(views));
    } catch (e) {}
    apiPost("trackView", { timestamp: ts });
  }

  renderPriceCards();
  renderSizePicker();
  renderShirtSizes();
  updatePrice();
  renderColorPresets();
  updateShirtColor();
  setView(0);
  trackView();
  if (!resumeOrderFromUrl()) showStep(1);
})();
