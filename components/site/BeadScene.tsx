"use client";

import { useEffect, useRef } from "react";

/** A small spring simulation, confined to the marketing hero. */
export default function BeadScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;
    const view = canvas;
    const ctx = context;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    type Bead = { x: number; y: number; homeX: number; homeY: number; vx: number; vy: number; radius: number; coral: boolean };
    let beads: Bead[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let previous = 0;
    let pointer: { x: number; y: number } | null = null;
    let coral = "";

    function paint() {
      ctx.clearRect(0, 0, width, height);
      for (const bead of beads) {
        const { x, y, radius: r } = bead;
        ctx.beginPath();
        ctx.ellipse(x + r * .25, y + r * .95, r * 1.1, r * .4, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(70, 40, 30, 0.09)";
        ctx.fill();
        const fill = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .05, x, y, r);
        fill.addColorStop(0, bead.coral ? "#ffdfd4" : "#ffffff");
        fill.addColorStop(.42, bead.coral ? coral : "#e9e4e1");
        fill.addColorStop(1, bead.coral ? "#a45344" : "#aaa19b");
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      }
    }

    function tick(time: number) {
      frame = 0;
      const step = previous ? Math.min((time - previous) / 16.67, 2) : 1;
      previous = time;
      let moving = false;
      for (const b of beads) {
        let fx = (b.homeX - b.x) * .035;
        let fy = (b.homeY - b.y) * .035;
        if (pointer) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 105) {
            const force = (1 - distance / 105) * 2.4;
            fx += dx / Math.max(distance, 1) * force;
            fy += dy / Math.max(distance, 1) * force;
          }
        }
        b.vx = (b.vx + fx * step) * Math.pow(.83, step);
        b.vy = (b.vy + fy * step) * Math.pow(.83, step);
        b.x += b.vx * step;
        b.y += b.vy * step;
        moving ||= Math.abs(b.vx) + Math.abs(b.vy) > .025;
      }
      paint();
      if (moving && visible && !motion.matches) frame = requestAnimationFrame(tick);
      else previous = 0;
    }
    function wake() {
      if (!frame && visible && !motion.matches) frame = requestAnimationFrame(tick);
    }
    function resize() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      width = host!.clientWidth;
      height = host!.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view.width = Math.round(width * dpr);
      view.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      coral = `hsl(${getComputedStyle(host!).getPropertyValue("--primary").trim()})`;
      beads = [];
      const count = width < 640 ? 27 : 46;
      for (let strand = 0; strand < 3; strand++) {
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const x = 15 + t * (width - 30);
          const y = height - 90 + Math.sin(t * Math.PI * 2 + strand * .48) * 38 + strand * 15;
          beads.push({ homeX: x, homeY: y, x, y: y + (motion.matches ? 0 : Math.sin(i * 2.3 + strand) * 42), vx: 0, vy: 0, radius: (width < 640 ? 4.5 : 6.5) + strand * .8, coral: (i + strand) % 4 !== 0 });
        }
      }
      paint();
      wake();
    }
    function move(event: PointerEvent) {
      if (motion.matches) return;
      const box = host!.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
      wake();
    }
    function leave() { pointer = null; wake(); }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const visibility = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      visible = entry.isIntersecting;
      if (visible) wake();
      else { cancelAnimationFrame(frame); frame = 0; previous = 0; }
    });
    visibility.observe(host);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerdown", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    host.addEventListener("pointerup", leave);
    motion.addEventListener("change", resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerdown", move);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointerup", leave);
      motion.removeEventListener("change", resize);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="wit-bead-scene" />;
}
