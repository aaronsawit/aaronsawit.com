// CV page: "Save as PDF" opens the print dialog.
(function () {
  var b = document.getElementById("print");
  if (b) b.addEventListener("click", function () { window.print(); });
})();

// Hero: a slowly rotating sphere of points with a few lit nodes and links firing between them.
// Pure canvas, no library. Pauses off-screen, draws one still frame when reduced motion is on.
(function () {
  var c = document.getElementById("globe");
  if (!c || !c.getContext) return;
  var ctx = c.getContext("2d"), reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var N = 520, pts = [], nodes = [], links = [], size = 0, dpr = 1, rotY = 0, tiltX = -0.35, targetTilt = -0.35, targetSpin = 0, running = false, last = 0;
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = golden * i;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  for (var k = 0; k < 14; k++) nodes.push((k * 37 + 11) % N);

  function resize() {
    var w = c.clientWidth; if (!w) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); size = w;
    c.width = c.height = Math.round(w * dpr);
    if (!running) draw(0);
  }
  function project(p, cy, sy, cx, sx) {
    var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1] * cx - z * sx; z = p[1] * sx + z * cx;
    var s = 1 / (1 + z * 0.35);
    return [x * s, y * s, z];
  }
  function draw(dt) {
    rotY += dt * (0.00016 + targetSpin); tiltX += (targetTilt - tiltX) * 0.04;
    var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(tiltX), sx = Math.sin(tiltX);
    var R = size * dpr * 0.4, o = size * dpr / 2;
    ctx.clearRect(0, 0, c.width, c.height);
    var lit = {};
    for (var n = 0; n < nodes.length; n++) lit[nodes[n]] = 1;
    for (var i = 0; i < N; i++) {
      var q = project(pts[i], cy, sy, cx, sx), depth = (1 - q[2]) / 2; // 1 = front
      if (lit[i]) continue;
      ctx.globalAlpha = 0.12 + depth * 0.5;
      ctx.fillStyle = "#9aa1b0";
      var rad = (0.6 + depth * 1.1) * dpr;
      ctx.beginPath(); ctx.arc(o + q[0] * R, o + q[1] * R, rad, 0, 6.2832); ctx.fill();
    }
    // links: a great-circle-ish arc that draws on, holds, and fades
    if (!reduce && links.length < 4 && Math.random() < 0.02) {
      var a = nodes[(Math.random() * nodes.length) | 0], b = nodes[(Math.random() * nodes.length) | 0];
      if (a !== b) links.push({ a: a, b: b, t: 0 });
    }
    ctx.lineWidth = 1.2 * dpr; ctx.strokeStyle = "#c6ff3d";
    for (var l = links.length - 1; l >= 0; l--) {
      var L = links[l]; L.t += dt * 0.0006;
      if (L.t > 1.6) { links.splice(l, 1); continue; }
      var A = pts[L.a], B = pts[L.b], steps = 24, upto = Math.min(1, L.t) * steps;
      ctx.globalAlpha = L.t < 1 ? 0.7 : Math.max(0, 0.7 * (1.6 - L.t) / 0.6);
      ctx.beginPath();
      for (var s = 0; s <= upto; s++) {
        var u = s / steps, mx = A[0] + (B[0] - A[0]) * u, my = A[1] + (B[1] - A[1]) * u, mz = A[2] + (B[2] - A[2]) * u;
        var len = Math.sqrt(mx * mx + my * my + mz * mz) || 1, lift = 1 + 0.18 * Math.sin(Math.PI * u);
        var pq = project([mx / len * lift, my / len * lift, mz / len * lift], cy, sy, cx, sx);
        if (s === 0) ctx.moveTo(o + pq[0] * R, o + pq[1] * R); else ctx.lineTo(o + pq[0] * R, o + pq[1] * R);
      }
      ctx.stroke();
    }
    for (var m = 0; m < nodes.length; m++) {
      var nq = project(pts[nodes[m]], cy, sy, cx, sx), nd = (1 - nq[2]) / 2;
      ctx.globalAlpha = 0.25 + nd * 0.75; ctx.fillStyle = "#c6ff3d";
      ctx.beginPath(); ctx.arc(o + nq[0] * R, o + nq[1] * R, (1.4 + nd * 2) * dpr, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = (0.05 + nd * 0.12);
      ctx.beginPath(); ctx.arc(o + nq[0] * R, o + nq[1] * R, (5 + nd * 6) * dpr, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    if (!running) return;
    var dt = Math.min(50, now - (last || now)); last = now;
    draw(dt); requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; last = 0; requestAnimationFrame(frame); }
  function stop() { running = false; }
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) {
    var r = c.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    targetTilt = -0.35 + dy * 0.5; targetSpin = dx * 0.0004;
  }, { passive: true });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(c);
  else start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  resize(); if (reduce) draw(0);
})();
