"use client";

import type { PointerEvent } from "react";

/** Decorative, locally rendered objects. Pointer movement never affects navigation. */
export default function CommunityArtwork() {
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--scene-x", `${((event.clientX - box.left) / box.width - 0.5) * 12}deg`);
    event.currentTarget.style.setProperty("--scene-y", `${((event.clientY - box.top) / box.height - 0.5) * -12}deg`);
  }
  function reset(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--scene-x", "0deg");
    event.currentTarget.style.setProperty("--scene-y", "0deg");
  }
  return (
    <div className="wit-playground" aria-hidden="true" onPointerMove={move} onPointerLeave={reset}>
      <div className="wit-scene-object wit-code-object">
        <svg viewBox="0 0 300 310" fill="none">
          <path d="M46 100 176 42 262 111 129 174Z" fill="#ffd8d0" stroke="#cf7567" />
          <path d="M46 100v106l83 68V174Z" fill="#e78777" stroke="#cf7567" />
          <path d="m129 174 133-63v107l-133 56Z" fill="#f4a898" stroke="#cf7567" />
          <path d="m65 99 108-47 69 57-110 50Z" fill="#fff1ec" />
          <path d="m127 78-32 19 23 19m66-28 23 20-34 17m-15-51-18 58" stroke="#a4493c" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m57 192 60 48m27-2 103-48" stroke="#ffd8d0" strokeWidth="2" />
        </svg>
        <span className="wit-object-caption">01 / Build something</span>
      </div>
      <div className="wit-scene-object wit-laptop-object">
        <svg viewBox="0 0 400 350" fill="none">
          <path d="m102 39 229 40c9 2 12 8 10 17l-28 154-244-45 26-154c1-9 2-13 7-12Z" fill="#242020" />
          <path d="m110 53 216 38-24 139-219-39Z" fill="#f8b7a9" />
          <path d="m112 63 202 36-4 21-202-36Z" fill="#fbd2c8" />
          <circle cx="119" cy="76" r="3" fill="#ad5145" /><circle cx="130" cy="78" r="3" fill="#ad5145" /><circle cx="141" cy="80" r="3" fill="#ad5145" />
          <path d="m132 113-20 13 15 18m57-22 15 18-21 12m-20-35-17 36" stroke="#713a33" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m115 163 113 20m-116-6 78 14m-81-1 139 24" stroke="#d8897c" strokeWidth="5" strokeLinecap="round" />
          <path d="m69 205 244 45 58 59-263-45-77-37Z" fill="#ebc9c2" stroke="#c39185" />
          <path d="m31 227 77 37 263 45-8 10-259-44-73-36Z" fill="#b78073" />
          <path d="m80 215 220 40 29 28-222-39Z" fill="#fff0eb" />
          <path d="m95 225 204 36m-186-15 207 36m-194-47 12 12m12-8 13 12m12-8 12 12m13-8 13 13m12-8 13 13m13-8 13 13m12-8 13 12" stroke="#c89b90" strokeWidth="2" />
          <path d="m165 267 51 9 15 10-51-8Z" fill="#fff0eb" />
        </svg>
        <span className="wit-object-caption">02 / Make it yours</span>
      </div>
      <div className="wit-scene-object wit-spark-object">
        <svg viewBox="0 0 120 120" fill="none"><path d="M60 4 70 42 106 22 82 53 118 65 78 73 97 111 65 85 48 118 44 78 7 94 33 64 2 44 42 43Z" fill="#f29b89" /><path d="m60 4 4 55 54 6-53 8-17 45 2-51-48-23 51 13Z" fill="#ffd5ca" /></svg>
      </div>
    </div>
  );
}
