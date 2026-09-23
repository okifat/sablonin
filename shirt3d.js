(function(){
  // Preview baju 3D (WebGL via three.js) - bentuk kaos di-generate dari satu outline,
  // dibengkokkan dikit biar ada lengkung dada/punggung, lalu bisa diputer 360 derajat.
  // Diekspos sebagai window.Shirt3D biar app.js (script biasa) tinggal manggil.

  var scene, camera, renderer, canvasEl;
  var shirtGroup, shirtMesh, material;
  var currentRotationY = 0;
  var animId = null;
  var ready = false;

  function buildShirtShape(){
    // Outline kaos (depan/belakang sama) digambar pake kurva, bukan garis lurus,
    // biar siluetnya bulat/natural kayak kaos beneran (leher bulat, lengan set-in,
    // lengkung ketiak) - bukan kotak-kotak kayak versi lama. Simetris kanan-kiri,
    // separuh kanan digambar dulu lalu dicerminkan balik ke tengah.
    // PENTING: tengah kerah depan harus jadi titik TERENDAH (cekung ke dalam,
    // ini lubang leher), lebih rendah dari titik pundak - kalau kebalik (tengah
    // lebih tinggi dari pundak) hasilnya kerah "nungging" dan bikin extrude/bevel-nya
    // nyipain segitiga ganjil ngambang di atas kerah (pernah kejadian, sudah diperbaiki).
    var shape = new THREE.Shape();
    shape.moveTo(0, 10.6);                           // tengah kerah depan (titik terendah/cekung)
    shape.quadraticCurveTo(2.6, 10.8, 4.4, 12.3);     // lengkung kerah kanan naik ke sudut pundak
    shape.quadraticCurveTo(6.2, 12.6, 8.2, 9.6);      // garis bahu kanan turun ke lengan
    shape.quadraticCurveTo(10.7, 8.6, 11.7, 5.7);     // ujung lengan kanan
    shape.quadraticCurveTo(9.6, 3.5, 7.4, 2.0);       // sisi luar lengan turun
    shape.quadraticCurveTo(6.6, 4.1, 5.85, 3.35);     // lengkung ketiak kanan
    shape.lineTo(5.85, -12.4);                        // sisi badan kanan
    shape.quadraticCurveTo(5.85, -13.5, 4.75, -13.5); // sudut bawah kanan dibulatkan
    shape.lineTo(-4.75, -13.5);                       // hem bawah
    shape.quadraticCurveTo(-5.85, -13.5, -5.85, -12.4); // sudut bawah kiri dibulatkan
    shape.lineTo(-5.85, 3.35);                        // sisi badan kiri
    shape.quadraticCurveTo(-6.6, 4.1, -7.4, 2.0);     // lengkung ketiak kiri
    shape.quadraticCurveTo(-9.6, 3.5, -11.7, 5.7);    // sisi luar lengan naik
    shape.quadraticCurveTo(-10.7, 8.6, -8.2, 9.6);    // ujung lengan kiri
    shape.quadraticCurveTo(-6.2, 12.6, -4.4, 12.3);   // garis bahu kiri naik ke sudut pundak
    shape.quadraticCurveTo(-2.6, 10.8, 0, 10.6);      // lengkung kerah kiri turun ke tengah
    shape.closePath();
    return shape;
  }

  function bendGeometry(geometry){
    var pos = geometry.attributes.position;
    var torsoHalfWidth = 6;
    var bendAmount = 2.3;
    for (var i = 0; i < pos.count; i++){
      var x = pos.getX(i);
      var z = pos.getZ(i);
      var bx = Math.max(-torsoHalfWidth, Math.min(torsoHalfWidth, x));
      var bend = Math.cos((bx / torsoHalfWidth) * (Math.PI / 2)) * bendAmount;
      pos.setZ(i, z + bend);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function render(){
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function sizeToContainer(){
    if (!renderer || !canvasEl) return;
    var w = canvasEl.clientWidth || 200;
    var h = canvasEl.clientHeight || 220;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    render();
  }

  function init(canvas, initialColorHex){
    if (ready) return;
    if (typeof THREE === "undefined") return;
    canvasEl = canvas;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 200 / 220, 0.1, 200);
    camera.position.set(0, 0, 48);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl, antialias: true, alpha: true,
      // wajib true biar canvas-nya bisa di-drawImage/didownload sebagai gambar
      // lewat downloadPreview() di app.js - default-nya buffer suka ke-clear duluan.
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(6, 10, 14);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-9, -2, 8);
    scene.add(fill);

    var shape = buildShirtShape();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 7, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.8,
      bevelSegments: 5, curveSegments: 24
    });
    geo.center();
    bendGeometry(geo);

    material = new THREE.MeshStandardMaterial({
      color: initialColorHex || 0xf5f5f0, roughness: 0.88, metalness: 0.04, side: THREE.DoubleSide
    });
    shirtMesh = new THREE.Mesh(geo, material);

    // Outline tebal ala gaya stiker Sablonin - hull terbalik yang di-scale sedikit lebih besar
    var outlineMat = new THREE.MeshBasicMaterial({ color: 0x15161b, side: THREE.BackSide });
    var outlineMesh = new THREE.Mesh(geo, outlineMat);
    outlineMesh.scale.multiplyScalar(1.07);

    shirtGroup = new THREE.Group();
    shirtGroup.add(outlineMesh);
    shirtGroup.add(shirtMesh);
    scene.add(shirtGroup);

    ready = true;
    sizeToContainer();
    window.addEventListener("resize", sizeToContainer);
  }

  function setColor(hex){
    if (!material) return;
    material.color.set(hex);
    render();
  }

  function setRotationY(deg){
    currentRotationY = deg;
    if (shirtGroup) shirtGroup.rotation.y = (deg * Math.PI) / 180;
    render();
  }

  function getRotationY(){ return currentRotationY; }

  function animateRotationTo(targetDeg, duration, onDone){
    if (!ready) { if (onDone) onDone(); return; }
    var startDeg = currentRotationY;
    var diff = targetDeg - startDeg;
    diff = ((diff + 180) % 360 + 360) % 360 - 180;
    var t0 = performance.now();
    if (animId) cancelAnimationFrame(animId);
    duration = duration || 260;
    function step(now){
      var t = Math.min(1, (now - t0) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      setRotationY(startDeg + diff * eased);
      if (t < 1) { animId = requestAnimationFrame(step); }
      else { animId = null; if (onDone) onDone(); }
    }
    animId = requestAnimationFrame(step);
  }

  window.Shirt3D = {
    init: init,
    isReady: function(){ return ready; },
    setColor: setColor,
    setRotationY: setRotationY,
    getRotationY: getRotationY,
    animateRotationTo: animateRotationTo,
    resize: sizeToContainer
  };
})();
