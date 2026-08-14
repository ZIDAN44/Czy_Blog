'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SPRING_SNAPPY, SpringValue, prefersReducedMotion } from '@/lib/motion';

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

/**
 * A single indicator that travels between sibling elements, rather than a
 * highlight that blinks off here and on over there.
 *
 * Position and width ride independent springs: one spring driving both
 * desynchronises whenever they have different distances to cover (a short
 * label following a long one is the visible case). Because they are springs,
 * changing the target mid-flight re-aims from wherever the indicator
 * currently is — it never snaps back to the start.
 *
 * Callers own the markup and supply `setItem(key)` as each item's ref. The
 * indicator hides itself whenever no item matches `activeKey`.
 */
export function useMovingIndicator<
  K,
  Track extends HTMLElement = HTMLElement,
  Indicator extends HTMLElement = HTMLElement,
>(activeKey: K | null) {
  const trackRef = useRef<Track | null>(null);
  const indicatorRef = useRef<Indicator | null>(null);
  const items = useRef(new Map<K, HTMLElement>());
  const x = useSpring(0);
  const width = useSpring(0);
  const hasSettled = useRef(false);

  const paint = useCallback(() => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x.current}px, 0, 0)`;
    el.style.width = `${width.current}px`;
  }, [x, width]);

  useEffect(() => {
    const off = [x.subscribe(paint), width.subscribe(paint)];
    return () => off.forEach((fn) => fn());
  }, [x, width, paint]);

  const measure = useCallback(
    (animate: boolean) => {
      const indicator = indicatorRef.current;
      if (!indicator) return;
      const el = activeKey === null ? undefined : items.current.get(activeKey);
      if (!el) {
        indicator.style.opacity = '0';
        return;
      }
      indicator.style.opacity = '1';
      if (!animate || prefersReducedMotion()) {
        x.set(el.offsetLeft);
        width.set(el.offsetWidth);
        paint();
        return;
      }
      x.to(el.offsetLeft, SPRING_SNAPPY);
      width.to(el.offsetWidth, SPRING_SNAPPY);
    },
    [activeKey, x, width, paint],
  );

  // The first placement must not animate in from zero; every later one should.
  useLayoutEffect(() => {
    measure(hasSettled.current);
    hasSettled.current = true;
  }, [measure]);

  // Layout can change under the indicator — keep it glued to its item.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const setItem = useCallback(
    (key: K) => (el: HTMLElement | null) => {
      if (el) items.current.set(key, el);
      else items.current.delete(key);
    },
    [],
  );

  return { trackRef, indicatorRef, setItem };
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
