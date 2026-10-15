import { Geist, Geist_Mono, Newsreader } from 'next/font/google';

// Self-hosted at build time by next/font; exposed as CSS variables for globals.css.
const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const serif = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
});

export const fontVariables = `${sans.variable} ${mono.variable} ${serif.variable}`;
