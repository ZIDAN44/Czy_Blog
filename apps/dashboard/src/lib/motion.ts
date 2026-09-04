/**
 * Motion primitives — springs, momentum projection, rubber-banding.
 *
 * Gestures animate with springs, not CSS transitions, so they can be re-targeted
 * mid-flight without losing velocity — that's what makes a thing feel grabbable.
 * Springs are described by Apple's two params: `bounce` (0 = critically damped)
 * and `response` (seconds to reach target; a settle time, not a fixed duration).
 */

export interface SpringConfig {
  /** 0 = critically damped. ~0.2 for momentum-driven motion. */
  bounce?: number;
  /** Seconds to approach the target. Lower is snappier. */
  response?: number;
}

/** Default for anything the user did not throw: graceful, no overshoot. */
export const SPRING_SMOOTH: SpringConfig = { bounce: 0, response: 0.4 };
/** Drawers and sheets — quick, and bouncy only because a throw preceded it. */
export const SPRING_SHEET: SpringConfig = { bounce: 0.2, response: 0.3 };
/** Small, frequent UI moves (selection indicators, hover chrome). */
export const SPRING_SNAPPY: SpringConfig = { bounce: 0, response: 0.28 };

const REST_DISPLACEMENT = 0.01;
const REST_VELOCITY = 0.05;
/** Fixed physics step. Decoupled from frame rate so the feel never changes. */
const STEP = 1 / 240;
const MAX_FRAME = 1 / 20;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Shared clock: one rAF loop drives every live spring off the same timestamp,
// so values that move together stay in lockstep.
type Ticker = (dt: number) => void;

const tickers = new Set<Ticker>();
let rafId: number | null = null;
let lastTime = 0;

function loop(now: number) {
  const dt = Math.min((now - lastTime) / 1000, MAX_FRAME);
  lastTime = now;
  for (const tick of Array.from(tickers)) tick(dt);
  rafId = tickers.size > 0 ? requestAnimationFrame(loop) : null;
}

function addTicker(tick: Ticker) {
  tickers.add(tick);
  if (rafId === null) {
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}

function removeTicker(tick: Ticker) {
  tickers.delete(tick);
}

export interface SpringTarget extends SpringConfig {
  /** Initial velocity in units/s — hand the release velocity of a gesture here. */
  velocity?: number;
  /** Called once the spring comes to rest at the target. */
  onRest?: () => void;
}

// A single animatable number. Imperative on purpose: writes to the DOM through a
// subscriber, not React state, so a drag never queues 60 renders a second.
export class SpringValue {
  private value: number;
  private velocity = 0;
  private target: number;
  private omega = 0;
  private zeta = 1;
  private onRest?: () => void;
  private subscribers = new Set<(value: number) => void>();
  private tick: Ticker;
  private running = false;

  constructor(initial: number) {
    this.value = initial;
    this.target = initial;
    this.applyConfig(SPRING_SMOOTH);
    this.tick = (dt) => this.advance(dt);
  }

  /** The live on-screen value. Interruptions must start from this, never from the target. */
  get current(): number {
    return this.value;
  }

  subscribe(fn: (value: number) => void): () => void {
    this.subscribers.add(fn);
    fn(this.value);
    return () => this.subscribers.delete(fn);
  }

  /** Jump to a value with no animation — used while a finger is in control. */
  set(value: number) {
    this.stop();
    this.value = value;
    this.emit();
  }

  /** Animate to `target`, carrying whatever velocity the spring already has. */
  to(target: number, opts: SpringTarget = {}) {
    this.applyConfig(opts);
    this.target = target;
    if (opts.velocity !== undefined) this.velocity = opts.velocity;
    this.onRest = opts.onRest;

    if (prefersReducedMotion()) {
      // Reduced motion gets the outcome, not the journey.
      this.value = target;
      this.velocity = 0;
      this.emit();
      this.stop();
      this.onRest?.();
      this.onRest = undefined;
      return;
    }

    if (!this.running) {
      this.running = true;
      addTicker(this.tick);
    }
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.velocity = 0;
    removeTicker(this.tick);
  }

  destroy() {
    this.stop();
    this.subscribers.clear();
  }

  private applyConfig({ bounce, response }: SpringConfig) {
    const r = response ?? SPRING_SMOOTH.response!;
    const b = bounce ?? SPRING_SMOOTH.bounce!;
    this.omega = (2 * Math.PI) / Math.max(r, 0.01);
    // bounce 0 → critically damped; bounce 1 → no damping at all.
    this.zeta = Math.max(0, 1 - Math.min(b, 0.99));
  }

  private advance(frame: number) {
    let remaining = frame;
    const { omega, zeta } = this;

    // Semi-implicit Euler on a fixed substep: stable at any frame rate.
    while (remaining > 0) {
      const dt = Math.min(remaining, STEP);
      remaining -= dt;
      const displacement = this.value - this.target;
      const accel = -omega * omega * displacement - 2 * zeta * omega * this.velocity;
      this.velocity += accel * dt;
      this.value += this.velocity * dt;
    }

    if (
      Math.abs(this.value - this.target) < REST_DISPLACEMENT &&
      Math.abs(this.velocity) < REST_VELOCITY
    ) {
      this.value = this.target;
      this.velocity = 0;
      this.emit();
      this.stop();
      const rest = this.onRest;
      this.onRest = undefined;
      rest?.();
      return;
    }
    this.emit();
  }

  private emit() {
    for (const fn of this.subscribers) fn(this.value);
  }
}

// Where a flick would come to rest on its own — snap to the target nearest that
// point, not the release point. Exponential decay like UIScrollView, not v²/2a.
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Progressive resistance past a boundary: a hard stop reads as frozen, resistance as responsive.
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension === 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

interface Sample {
  value: number;
  time: number;
}

// Rolling window of recent positions: a single pointer delta is too noisy for a
// spring, so a short window makes the finger-to-animation handoff invisible.
export class VelocityTracker {
  private samples: Sample[] = [];
  private window: number;

  constructor(windowMs = 100) {
    this.window = windowMs;
  }

  add(value: number, time = performance.now()) {
    this.samples.push({ value, time });
    const cutoff = time - this.window;
    while (this.samples.length > 2 && this.samples[0].time < cutoff) this.samples.shift();
  }

  reset() {
    this.samples = [];
  }

  /** Units per second. */
  get velocity(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (last.time - first.time) / 1000;
    if (dt <= 0) return 0;
    return (last.value - first.value) / dt;
  }
}
