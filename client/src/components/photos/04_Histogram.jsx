/**
 * ================================================================
 * FILE: client/src/components/photos/Histogram.jsx
 * ================================================================
 * Real RGB exposure histogram rendered from image pixel data.
 * Uses a hidden <canvas> to read pixel values — no server call.
 *
 * USAGE in PhotoDetailPage.jsx:
 *   import Histogram from '@/components/photos/Histogram';
 *   <Histogram src={photo.thumbnailUrl || photo.url} />
 */

import { useEffect, useRef, useState } from 'react';

const BINS = 128;

const buildHistogram = (imageData) => {
  const r = new Array(BINS).fill(0);
  const g = new Array(BINS).fill(0);
  const b = new Array(BINS).fill(0);
  const lum = new Array(BINS).fill(0);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const rv = imageData.data[i];
    const gv = imageData.data[i + 1];
    const bv = imageData.data[i + 2];
    const l  = Math.round(0.299 * rv + 0.587 * gv + 0.114 * bv);

    r[Math.floor(rv / 256 * BINS)]++;
    g[Math.floor(gv / 256 * BINS)]++;
    b[Math.floor(bv / 256 * BINS)]++;
    lum[Math.floor(l  / 256 * BINS)]++;
  }
  return { r, g, b, lum };
};

const drawHistogram = (canvas, hist) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(W * i / 4, 0); ctx.lineTo(W * i / 4, H); ctx.stroke();
  }

  const maxVal = Math.max(
    ...hist.r, ...hist.g, ...hist.b
  ) || 1;

  const drawChannel = (data, color, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    data.forEach((v, i) => {
      const x = (i / BINS) * W;
      const y = H - (v / maxVal) * H * 0.92;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  };

  drawChannel(hist.b, '#3B82F6', 0.55);
  drawChannel(hist.g, '#10B981', 0.55);
  drawChannel(hist.r, '#EF4444', 0.55);

  // Luminosity outline
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  hist.lum.forEach((v, i) => {
    const x = (i / BINS) * W;
    const y = H - (v / maxVal) * H * 0.92;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;
};

export default function Histogram({ src, className = '' }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState(null);

  useEffect(() => {
    if (!src) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw into offscreen canvas to read pixels
      const off = document.createElement('canvas');
      const scale = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight));
      off.width  = Math.round(img.naturalWidth  * scale);
      off.height = Math.round(img.naturalHeight * scale);
      const ctx  = off.getContext('2d');
      ctx.drawImage(img, 0, 0, off.width, off.height);
      const imageData = ctx.getImageData(0, 0, off.width, off.height);
      const hist = buildHistogram(imageData);
      drawHistogram(canvasRef.current, hist);

      // Exposure stats
      const totalPx = imageData.data.length / 4;
      let dark = 0, mid = 0, bright = 0;
      hist.lum.forEach((v, i) => {
        const pct = i / BINS;
        if (pct < 0.25) dark   += v;
        else if (pct < 0.75) mid += v;
        else bright += v;
      });
      setStats({
        dark:   Math.round((dark   / totalPx) * 100),
        mid:    Math.round((mid    / totalPx) * 100),
        bright: Math.round((bright / totalPx) * 100),
      });
      setLoading(false);
    };
    img.onerror = () => setLoading(false);
    img.src = src;
  }, [src]);

  return (
    <div className={`glass rounded-2xl border border-obsidian-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Histogram</h3>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>R</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>G</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>B</span>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-obsidian-900">
            <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"/>
          </div>
        )}
        <canvas ref={canvasRef} width={256} height={80} className="w-full rounded-xl" />
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Shadows',   value: stats.dark,   color: 'text-blue-400' },
            { label: 'Midtones',  value: stats.mid,    color: 'text-obsidian-300' },
            { label: 'Highlights',value: stats.bright, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-mono font-bold ${s.color}`}>{s.value}%</p>
              <p className="text-[10px] text-obsidian-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
