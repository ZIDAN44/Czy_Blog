'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SpringValue } from '@/lib/motion';

/** A spring that lives for the lifetime of the component. */
export function useSpring(initial: number): SpringValue {
  const ref = useRef<SpringValue | null>(null);
  if (ref.current === null) ref.current = new SpringValue(initial);
  useEffect(() => {
    const spring = ref.current;
    return () => spring?.destroy();
  }, []);
  return ref.current;
}

/**
 * Bind a spring straight to the DOM. The callback runs on every frame with the
 * live value, bypassing React so a drag stays at 1:1 with the pointer.
 */
export function useSpringEffect(
  spring: SpringValue,
  apply: (el: HTMLElement, value: number) => void,
) {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const elRef = useRef<HTMLElement | null>(null);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      elRef.current = el;
      if (el) applyRef.current(el, spring.current);
    },
    [spring],
  );

  useEffect(() => {
    return spring.subscribe((value) => {
      const el = elRef.current;
      if (el) applyRef.current(el, value);
    });
  }, [spring]);

  return ref;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/**
 * Touch-sized viewports get sheets you can throw; pointer-sized ones get
 * centred surfaces. Same content, adapted to how the device is held.
 */
export function useIsCompact(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

/**
 * Locks body scroll while a modal surface is up, without the layout shift that
 * comes from the scrollbar disappearing.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const gutter = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [active]);
}

/** True once the window has scrolled past `threshold` — drives scroll edge effects. */
export function useScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

/**
 * Traps focus inside a surface and restores it to whatever was focused before.
 * Wayfinding: a modal must never be a place you can tab out of and get lost in.
 */
export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;

    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(selector));
    const first = focusables()[0];
    (root.querySelector<HTMLElement>('[data-autofocus]') ?? first)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const start = items[0];
      const end = items[items.length - 1];
      if (e.shiftKey && document.activeElement === start) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        start.focus();
      }
    }

    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [active]);

  return ref;
}
