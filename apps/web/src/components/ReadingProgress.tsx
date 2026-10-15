'use client';
import { useEffect, useRef } from 'react';

// Thin bar under the header; written straight to the DOM per frame, no re-renders.
export default function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-40 h-[2px] pointer-events-none" aria-hidden>
      <div
        ref={bar}
        className="h-full bg-accent origin-left will-move"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
