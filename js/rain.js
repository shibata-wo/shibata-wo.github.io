/**
 * Rain Effect — InternalBeyond 风格雨滴动画（Canvas 物理雨丝版）
 * 仅在首页标题页 #page-header.full_page 内生成雾面玻璃遮罩 + 雨丝，
 * 不使用 position:fixed 铺满全站，避免影响文章页 / 双侧栏内容页。
 * 支持 Butterfly 的 pjax 局部刷新：每次切到首页会重新初始化，
 * 离开首页时旧的 canvas 动画会自动停止。
 */
;(function () {
  "use strict";

  function initHeaderRain() {
    var header = document.querySelector("#page-header.full_page");
    if (!header) return;
    // 避免重复插入（同一个 header 实例上只初始化一次）
    if (header.querySelector(".header-rain-container")) return;

    var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // 雾面玻璃遮罩层
    var glass = document.createElement("div");
    glass.className = "header-glass-overlay";
    glass.setAttribute("aria-hidden", "true");
    header.insertBefore(glass, header.firstChild);

    // 雨丝画布容器
    var rain = document.createElement("div");
    rain.className = "header-rain-container";
    rain.setAttribute("aria-hidden", "true");
    header.insertBefore(rain, header.firstChild);

    setTimeout(function () {
      glass.classList.add("show");
      rain.classList.add("show");
    }, 300);

    if (reduced) return; // 尊重“减少动态效果”系统设置，仅保留静态雾面玻璃

    var cv = document.createElement("canvas");
    rain.appendChild(cv);
    var ctx = cv.getContext("2d");
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var W = 0, H = 0;
    var R = function (a, b) { return a + Math.random() * (b - a); };
    var WIND = 24; // 水平风速 px/s（z=1 处）
    var drops = [];

    function reset(d) {
      d.z = R(0.35, 1);
      d.x = Math.random() * W;
      d.v = (380 + R(0, 320)) * d.z;
      d.y = -R(0.05, 1.2) * d.v; // 负空程=入场前的停顿，错开节奏
      d.w = 1.8 + d.z * 0.8;
      d.wf = R(0.8, 1.2); // 每滴风速微差
    }

    function size() {
      W = header.clientWidth;
      H = header.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      drops.length = 0;
      var count = W < 900 ? 26 : 45;
      for (var i = 0; i < count; i++) { var d = {}; reset(d); drops.push(d); }
    }

    var last = 0, raf = null;
    function loop(ts) {
      // header 被 pjax 移除后自动停止动画循环，避免内存泄漏
      if (!document.body.contains(header)) { if (raf) cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(loop);
      var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        var wz = WIND * d.z * d.wf;
        d.y += d.v * dt; d.x += wz * dt;
        if (d.x > W + 30) d.x -= W + 60;
        var len = Math.min(72, d.v * 0.1);
        if (d.y - len > H) { reset(d); continue; } // 整条雨丝坠出屏底再回收
        if (d.y < -40) continue;
        var a = 0.18 + 0.26 * d.z;
        var tx = d.x - wz * (len / d.v), ty = d.y - len;
        var g = ctx.createLinearGradient(tx, ty, d.x, d.y);
        g.addColorStop(0, "rgba(200,220,242,0)");
        g.addColorStop(0.62, "rgba(208,225,245," + (a * 0.55).toFixed(3) + ")");
        g.addColorStop(1, "rgba(218,232,250," + Math.min(0.5, a * 1.15).toFixed(3) + ")");
        ctx.strokeStyle = g; ctx.lineWidth = d.w;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(d.x, d.y); ctx.stroke();
        ctx.fillStyle = "rgba(224,238,252," + Math.min(0.45, a * 0.9).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(d.x, d.y, d.w * 0.55, 0, 6.2832); ctx.fill();
      }
    }

    function onResize() { if (document.body.contains(header)) size(); }
    window.addEventListener("resize", onResize);
    size();
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", initHeaderRain);
  // Butterfly 使用 pjax 局部刷新页面，需要在每次切换完成后重新检测
  document.addEventListener("pjax:complete", initHeaderRain);
})();