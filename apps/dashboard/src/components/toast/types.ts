// Non-blocking feedback that only needs to be seen (status/success/warning/error);
// dialogs stay reserved for actual decisions.
export type ToastTone = 'status' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** Milliseconds on screen. Errors stay longer by default. */
  duration?: number;
}

export interface ToastRecord extends ToastOptions {
  id: number;
}
