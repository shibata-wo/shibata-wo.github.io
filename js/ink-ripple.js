(function () {
  'use strict';

  // ========== 可调配置【直接在这里微调效果】 ==========
  const CFG = {
    DAMP: 0.992,        // 阻尼值越高，波纹消散越慢、持续更久
    LIGHT: 100,          // 明暗对比度，数值越大波纹越清晰（解决效果不明显）
    STEP: 1 / 36,       // 物理步长，降低速率，动画更舒缓
    CLICK_STRENGTH: 2.2,// 点击扰动强度
    DRAG_STRENGTH: 0.8, // 拖动扰动强度
    // 波纹色彩：适配你的浅蓝冷调玻璃背景
    COLOR_HIGHLIGHT: [235, 245, 255],
    COLOR_SHADOW: [110, 155, 200]
  };

  // ========== 全局状态 ==========
  let header = null;
  let canvas = null;
  let ctx = null;
  let handle = null;
  let dpr = 1;

  let W = 0, H = 0;
  let SW = 0, SH = 0;
  let h1 = null, h2 = null;
  let sim = null, simCtx = null, outImg = null;
  let stepAcc = 0;
  let ready = false;

  let isDown = false;
  let lastPt = { x: 0, y: 0 };
  let rafId = null;

  // ========== 工具函数 ==========
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ========== 初始化入口 ==========
  function init() {
    header = document.querySelector('#page-header.full_page');
    if (!header) return;

    // 防止重复创建
    if (document.getElementById('header-water-canvas')) return;

    dpr = Math.min(2, window.devicePixelRatio || 1);

    // 创建画布与交互层
    canvas = document.createElement('canvas');
    canvas.id = 'header-water-canvas';
    header.appendChild(canvas);
    ctx = canvas.getContext('2d');

    handle = document.createElement('div');
    handle.id = 'header-water-handle';
    header.appendChild(handle);

    sim = document.createElement('canvas');
    simCtx = sim.getContext('2d');

    resize();
    window.addEventListener('resize', resize);
    bindEvents();
    startLoop();

    requestAnimationFrame(() => canvas.classList.add('show'));
    console.log("✅ 物理水波纹已加载（无白色光圈版本）");
  }

  // ========== 尺寸重建 ==========
  function resize() {
    if (!header) return;
    ready = false;

    W = header.clientWidth;
    H = header.clientHeight;
    if (W < 10 || H < 10) {
      setTimeout(resize, 200);
      return;
    }

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    SW = Math.min(320, Math.max(120, Math.round(W / 5)));
    SH = Math.max(60, Math.round(SW * H / W));

    sim.width = SW;
    sim.height = SH;
    h1 = new Float32Array(SW * SH);
    h2 = new Float32Array(SW * SH);
    outImg = simCtx.createImageData(SW, SH);

    stepAcc = 0;
    // 初始轻微水面起伏
    for (let i = 0; i < 4; i++) {
      poke(rand(2, SW - 2), rand(2, SH - 2), rand(0.3, 0.7), 3);
    }
    ready = true;
  }

  // ========== 水面施加扰动（鼠标点击/拖动调用） ==========
  function poke(cx, cy, str, rad) {
    if (!ready) return;
    cx |= 0; cy |= 0;
    const r2 = rad * rad;
    const R0 = Math.ceil(rad);

    for (let y = -R0; y <= R0; y++) {
      for (let x = -R0; x <= R0; x++) {
        const px = cx + x, py = cy + y;
        if (px < 1 || py < 1 || px >= SW - 1 || py >= SH - 1) continue;
        const f = (x * x + y * y) / r2;
        if (f > 1) continue;
        h1[py * SW + px] += str * (0.5 + 0.5 * Math.cos(Math.PI * Math.sqrt(f)));
      }
    }
  }

  // ========== 水波物理迭代计算 ==========
  function stepWater() {
    if (!ready) return;
    for (let y = 1; y < SH - 1; y++) {
      let i = y * SW + 1;
      for (let x = 1; x < SW - 1; x++, i++) {
        h2[i] = (
          (h1[i - 1] + h1[i + 1] + h1[i - SW] + h1[i + SW]) * 0.5
          - h2[i]
        ) * CFG.DAMP;
      }
    }
    // 交换前后帧缓冲区
    const t = h1;
    h1 = h2;
    h2 = t;
  }

  // ========== 渲染水面（【重点】已彻底移除独立白色光圈绘制） ==========
  function renderWater() {
    if (!ready || !outImg) return;
    const dst = outImg.data;
    const h = h1;
    const [hr, hg, hb] = CFG.COLOR_HIGHLIGHT;
    const [sr, sg, sb] = CFG.COLOR_SHADOW;

    for (let y = 0; y < SH; y++) {
      const yu = y > 0 ? y - 1 : y;
      const yd = y < SH - 1 ? y + 1 : y;
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x;
        const xl = x > 0 ? i - 1 : i;
        const xr = x < SW - 1 ? i + 1 : i;

        const gx = h[xl] - h[xr];
        const gy = h[yu * SW + x] - h[yd * SW + x];
        const di = i * 4;
        const a = gy * CFG.LIGHT;

        if (a >= 0) {
          dst[di] = hr;
          dst[di + 1] = hg;
          dst[di + 2] = hb;
          dst[di + 3] = Math.min(255, a * 2.2) | 0;
        } else {
          const na = -a;
          dst[di] = sr;
          dst[di + 1] = sg;
          dst[di + 2] = sb;
          dst[di + 3] = Math.min(255, na * 1.6) | 0;
        }
      }
    }

    simCtx.putImageData(outImg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(sim, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ========== 坐标转换 ==========
  function getPos(e) {
    const rect = header.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      sx: (e.clientX - rect.left) / rect.width * SW,
      sy: (e.clientY - rect.top) / rect.height * SH
    };
  }

  // ========== 鼠标交互绑定 ==========
  function bindEvents() {
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      isDown = true;
      const p = getPos(e);
      lastPt = p;
      poke(p.sx, p.sy, CFG.CLICK_STRENGTH, 3);
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!isDown) return;
      const p = getPos(e);
      const dx = p.x - lastPt.x, dy = p.y - lastPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) return;

      const steps = Math.min(4, Math.ceil(dist / 8));
      for (let i = 1; i <= steps; i++) {
        const tx = lastPt.sx + (p.sx - lastPt.sx) * (i / steps);
        const ty = lastPt.sy + (p.sy - lastPt.sy) * (i / steps);
        poke(tx, ty, CFG.DRAG_STRENGTH, 1.8);
      }
      lastPt = p;
    });

    const stop = () => { isDown = false; };
    window.addEventListener('mouseup', stop);
    window.addEventListener('mouseleave', stop);
  }

  // ========== 主动画循环 ==========
  function loop() {
    rafId = requestAnimationFrame(loop);
    if (!ready) return;

    stepAcc += 1 / 60;
    let n = 0;
    while (stepAcc >= CFG.STEP && n < 2) {
      stepWater();
      stepAcc -= CFG.STEP;
      n++;
    }
    renderWater();
  }

  function startLoop() {
    if (rafId) return;
    loop();
  }

  // ========== 页面载入启动 + Hexo PJAX兼容 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('pjax:complete', init);
})();