// Consolidated Tailwind v4 JIT Engine
import { effect as _effect } from './reactivity.ts';
import { RuntimeContext } from './composition.ts';

// ============================================================================
// 1. THEME CONSTANTS 
// ============================================================================
export const THEME_CSS = `@theme default {
  --font-sans:
    ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;

  --color-red-50: oklch(97.1% 0.013 17.38);
  --color-red-100: oklch(93.6% 0.032 17.717);
  --color-red-200: oklch(88.5% 0.062 18.334);
  --color-red-300: oklch(80.8% 0.114 19.571);
  --color-red-400: oklch(70.4% 0.191 22.216);
  --color-red-500: oklch(63.7% 0.237 25.331);
  --color-red-600: oklch(57.7% 0.245 27.325);
  --color-red-700: oklch(50.5% 0.213 27.518);
  --color-red-800: oklch(44.4% 0.177 26.899);
  --color-red-900: oklch(39.6% 0.141 25.723);
  --color-red-950: oklch(25.8% 0.092 26.042);

  --color-orange-50: oklch(98% 0.016 73.684);
  --color-orange-100: oklch(95.4% 0.038 75.164);
  --color-orange-200: oklch(90.1% 0.076 70.697);
  --color-orange-300: oklch(83.7% 0.128 66.29);
  --color-orange-400: oklch(75% 0.183 55.934);
  --color-orange-500: oklch(70.5% 0.213 47.604);
  --color-orange-600: oklch(64.6% 0.222 41.116);
  --color-orange-700: oklch(55.3% 0.195 38.402);
  --color-orange-800: oklch(47% 0.157 37.304);
  --color-orange-900: oklch(40.8% 0.123 38.172);
  --color-orange-950: oklch(26.6% 0.079 36.259);

  --color-amber-50: oklch(98.7% 0.022 95.277);
  --color-amber-100: oklch(96.2% 0.059 95.617);
  --color-amber-200: oklch(92.4% 0.12 95.746);
  --color-amber-300: oklch(87.9% 0.169 91.605);
  --color-amber-400: oklch(82.8% 0.189 84.429);
  --color-amber-500: oklch(76.9% 0.188 70.08);
  --color-amber-600: oklch(66.6% 0.179 58.318);
  --color-amber-700: oklch(55.5% 0.163 48.998);
  --color-amber-800: oklch(47.3% 0.137 46.201);
  --color-amber-900: oklch(41.4% 0.112 45.904);
  --color-amber-950: oklch(27.9% 0.077 45.635);

  --color-yellow-50: oklch(98.7% 0.026 102.212);
  --color-yellow-100: oklch(97.3% 0.071 103.193);
  --color-yellow-200: oklch(94.5% 0.129 101.54);
  --color-yellow-300: oklch(90.5% 0.182 98.111);
  --color-yellow-400: oklch(85.2% 0.199 91.936);
  --color-yellow-500: oklch(79.5% 0.184 86.047);
  --color-yellow-600: oklch(68.1% 0.162 75.834);
  --color-yellow-700: oklch(55.4% 0.135 66.442);
  --color-yellow-800: oklch(47.6% 0.114 61.907);
  --color-yellow-900: oklch(42.1% 0.095 57.708);
  --color-yellow-950: oklch(28.6% 0.066 53.813);

  --color-lime-50: oklch(98.6% 0.031 120.757);
  --color-lime-100: oklch(96.7% 0.067 122.328);
  --color-lime-200: oklch(93.8% 0.127 124.321);
  --color-lime-300: oklch(89.7% 0.196 126.665);
  --color-lime-400: oklch(84.1% 0.238 128.85);
  --color-lime-500: oklch(76.8% 0.233 130.85);
  --color-lime-600: oklch(64.8% 0.2 131.684);
  --color-lime-700: oklch(53.2% 0.157 131.589);
  --color-lime-800: oklch(45.3% 0.124 130.933);
  --color-lime-900: oklch(40.5% 0.101 131.063);
  --color-lime-950: oklch(27.4% 0.072 132.109);

  --color-green-50: oklch(98.2% 0.018 155.826);
  --color-green-100: oklch(96.2% 0.044 156.743);
  --color-green-200: oklch(92.5% 0.084 155.995);
  --color-green-300: oklch(87.1% 0.15 154.449);
  --color-green-400: oklch(79.2% 0.209 151.711);
  --color-green-500: oklch(72.3% 0.219 149.579);
  --color-green-600: oklch(62.7% 0.194 149.214);
  --color-green-700: oklch(52.7% 0.154 150.069);
  --color-green-800: oklch(44.8% 0.119 151.328);
  --color-green-900: oklch(39.3% 0.095 152.535);
  --color-green-950: oklch(26.6% 0.065 152.934);

  --color-emerald-50: oklch(97.9% 0.021 166.113);
  --color-emerald-100: oklch(95% 0.052 163.051);
  --color-emerald-200: oklch(90.5% 0.093 164.15);
  --color-emerald-300: oklch(84.5% 0.143 164.978);
  --color-emerald-400: oklch(76.5% 0.177 163.223);
  --color-emerald-500: oklch(69.6% 0.17 162.48);
  --color-emerald-600: oklch(59.6% 0.145 163.225);
  --color-emerald-700: oklch(50.8% 0.118 165.612);
  --color-emerald-800: oklch(43.2% 0.095 166.913);
  --color-emerald-900: oklch(37.8% 0.077 168.94);
  --color-emerald-950: oklch(26.2% 0.051 172.552);

  --color-teal-50: oklch(98.4% 0.014 180.72);
  --color-teal-100: oklch(95.3% 0.051 180.801);
  --color-teal-200: oklch(91% 0.096 180.426);
  --color-teal-300: oklch(85.5% 0.138 181.071);
  --color-teal-400: oklch(77.7% 0.152 181.912);
  --color-teal-500: oklch(70.4% 0.14 182.503);
  --color-teal-600: oklch(60% 0.118 184.704);
  --color-teal-700: oklch(51.1% 0.096 186.391);
  --color-teal-800: oklch(43.7% 0.078 188.216);
  --color-teal-900: oklch(38.6% 0.063 188.416);
  --color-teal-950: oklch(27.7% 0.046 192.524);

  --color-cyan-50: oklch(98.4% 0.019 200.873);
  --color-cyan-100: oklch(95.6% 0.045 203.388);
  --color-cyan-200: oklch(91.7% 0.08 205.041);
  --color-cyan-300: oklch(86.5% 0.127 207.078);
  --color-cyan-400: oklch(78.9% 0.154 211.53);
  --color-cyan-500: oklch(71.5% 0.143 215.221);
  --color-cyan-600: oklch(60.9% 0.126 221.723);
  --color-cyan-700: oklch(52% 0.105 223.128);
  --color-cyan-800: oklch(45% 0.085 224.283);
  --color-cyan-900: oklch(39.8% 0.07 227.392);
  --color-cyan-950: oklch(30.2% 0.056 229.695);

  --color-sky-50: oklch(97.7% 0.013 236.62);
  --color-sky-100: oklch(95.1% 0.026 236.824);
  --color-sky-200: oklch(90.1% 0.058 230.902);
  --color-sky-300: oklch(82.8% 0.111 230.318);
  --color-sky-400: oklch(74.6% 0.16 232.661);
  --color-sky-500: oklch(68.5% 0.169 237.323);
  --color-sky-600: oklch(58.8% 0.158 241.966);
  --color-sky-700: oklch(50% 0.134 242.749);
  --color-sky-800: oklch(44.3% 0.11 240.79);
  --color-sky-900: oklch(39.1% 0.09 240.876);
  --color-sky-950: oklch(29.3% 0.066 243.157);

  --color-blue-50: oklch(97% 0.014 254.604);
  --color-blue-100: oklch(93.2% 0.032 255.585);
  --color-blue-200: oklch(88.2% 0.059 254.128);
  --color-blue-300: oklch(80.9% 0.105 251.813);
  --color-blue-400: oklch(70.7% 0.165 254.624);
  --color-blue-500: oklch(62.3% 0.214 259.815);
  --color-blue-600: oklch(54.6% 0.245 262.881);
  --color-blue-700: oklch(48.8% 0.243 264.376);
  --color-blue-800: oklch(42.4% 0.199 265.638);
  --color-blue-900: oklch(37.9% 0.146 265.522);
  --color-blue-950: oklch(28.2% 0.091 267.935);

  --color-indigo-50: oklch(96.2% 0.018 272.314);
  --color-indigo-100: oklch(93% 0.034 272.788);
  --color-indigo-200: oklch(87% 0.065 274.039);
  --color-indigo-300: oklch(78.5% 0.115 274.713);
  --color-indigo-400: oklch(67.3% 0.182 276.935);
  --color-indigo-500: oklch(58.5% 0.233 277.117);
  --color-indigo-600: oklch(51.1% 0.262 276.966);
  --color-indigo-700: oklch(45.7% 0.24 277.023);
  --color-indigo-800: oklch(39.8% 0.195 277.366);
  --color-indigo-900: oklch(35.9% 0.144 278.697);
  --color-indigo-950: oklch(25.7% 0.09 281.288);

  --color-violet-50: oklch(96.9% 0.016 293.756);
  --color-violet-100: oklch(94.3% 0.029 294.588);
  --color-violet-200: oklch(89.4% 0.057 293.283);
  --color-violet-300: oklch(81.1% 0.111 293.571);
  --color-violet-400: oklch(70.2% 0.183 293.541);
  --color-violet-500: oklch(60.6% 0.25 292.717);
  --color-violet-600: oklch(54.1% 0.281 293.009);
  --color-violet-700: oklch(49.1% 0.27 292.581);
  --color-violet-800: oklch(43.2% 0.232 292.759);
  --color-violet-900: oklch(38% 0.189 293.745);
  --color-violet-950: oklch(28.3% 0.141 291.089);

  --color-purple-50: oklch(97.7% 0.014 308.299);
  --color-purple-100: oklch(94.6% 0.033 307.174);
  --color-purple-200: oklch(90.2% 0.063 306.703);
  --color-purple-300: oklch(82.7% 0.119 306.383);
  --color-purple-400: oklch(71.4% 0.203 305.504);
  --color-purple-500: oklch(62.7% 0.265 303.9);
  --color-purple-600: oklch(55.8% 0.288 302.321);
  --color-purple-700: oklch(49.6% 0.265 301.924);
  --color-purple-800: oklch(43.8% 0.218 303.724);
  --color-purple-900: oklch(38.1% 0.176 304.987);
  --color-purple-950: oklch(29.1% 0.149 302.717);

  --color-fuchsia-50: oklch(97.7% 0.017 320.058);
  --color-fuchsia-100: oklch(95.2% 0.037 318.852);
  --color-fuchsia-200: oklch(90.3% 0.076 319.62);
  --color-fuchsia-300: oklch(83.3% 0.145 321.434);
  --color-fuchsia-400: oklch(74% 0.238 322.16);
  --color-fuchsia-500: oklch(66.7% 0.295 322.15);
  --color-fuchsia-600: oklch(59.1% 0.293 322.896);
  --color-fuchsia-700: oklch(51.8% 0.253 323.949);
  --color-fuchsia-800: oklch(45.2% 0.211 324.591);
  --color-fuchsia-900: oklch(40.1% 0.17 325.612);
  --color-fuchsia-950: oklch(29.3% 0.136 325.661);

  --color-pink-50: oklch(97.1% 0.014 343.198);
  --color-pink-100: oklch(94.8% 0.028 342.258);
  --color-pink-200: oklch(89.9% 0.061 343.231);
  --color-pink-300: oklch(82.3% 0.12 346.018);
  --color-pink-400: oklch(71.8% 0.202 349.761);
  --color-pink-500: oklch(65.6% 0.241 354.308);
  --color-pink-600: oklch(59.2% 0.249 0.584);
  --color-pink-700: oklch(52.5% 0.223 3.958);
  --color-pink-800: oklch(45.9% 0.187 3.815);
  --color-pink-900: oklch(40.8% 0.153 2.432);
  --color-pink-950: oklch(28.4% 0.109 3.907);

  --color-rose-50: oklch(96.9% 0.015 12.422);
  --color-rose-100: oklch(94.1% 0.03 12.58);
  --color-rose-200: oklch(89.2% 0.058 10.001);
  --color-rose-300: oklch(81% 0.117 11.638);
  --color-rose-400: oklch(71.2% 0.194 13.428);
  --color-rose-500: oklch(64.5% 0.246 16.439);
  --color-rose-600: oklch(58.6% 0.253 17.585);
  --color-rose-700: oklch(51.4% 0.222 16.935);
  --color-rose-800: oklch(45.5% 0.188 13.697);
  --color-rose-900: oklch(41% 0.159 10.272);
  --color-rose-950: oklch(27.1% 0.105 12.094);

  --color-slate-50: oklch(98.4% 0.003 247.858);
  --color-slate-100: oklch(96.8% 0.007 247.896);
  --color-slate-200: oklch(92.9% 0.013 255.508);
  --color-slate-300: oklch(86.9% 0.022 252.894);
  --color-slate-400: oklch(70.4% 0.04 256.788);
  --color-slate-500: oklch(55.4% 0.046 257.417);
  --color-slate-600: oklch(44.6% 0.043 257.281);
  --color-slate-700: oklch(37.2% 0.044 257.287);
  --color-slate-800: oklch(27.9% 0.041 260.031);
  --color-slate-900: oklch(20.8% 0.042 265.755);
  --color-slate-950: oklch(12.9% 0.042 264.695);

  --color-gray-50: oklch(98.5% 0.002 247.839);
  --color-gray-100: oklch(96.7% 0.003 264.542);
  --color-gray-200: oklch(92.8% 0.006 264.531);
  --color-gray-300: oklch(87.2% 0.01 258.338);
  --color-gray-400: oklch(70.7% 0.022 261.325);
  --color-gray-500: oklch(55.1% 0.027 264.364);
  --color-gray-600: oklch(44.6% 0.03 256.802);
  --color-gray-700: oklch(37.3% 0.034 259.733);
  --color-gray-800: oklch(27.8% 0.033 256.848);
  --color-gray-900: oklch(21% 0.034 264.665);
  --color-gray-950: oklch(13% 0.028 261.692);

  --color-zinc-50: oklch(98.5% 0 0);
  --color-zinc-100: oklch(96.7% 0.001 286.375);
  --color-zinc-200: oklch(92% 0.004 286.32);
  --color-zinc-300: oklch(87.1% 0.006 286.286);
  --color-zinc-400: oklch(70.5% 0.015 286.067);
  --color-zinc-500: oklch(55.2% 0.016 285.938);
  --color-zinc-600: oklch(44.2% 0.017 285.786);
  --color-zinc-700: oklch(37% 0.013 285.805);
  --color-zinc-800: oklch(27.4% 0.006 286.033);
  --color-zinc-900: oklch(21% 0.006 285.885);
  --color-zinc-950: oklch(14.1% 0.005 285.823);

  --color-neutral-50: oklch(98.5% 0 0);
  --color-neutral-100: oklch(97% 0 0);
  --color-neutral-200: oklch(92.2% 0 0);
  --color-neutral-300: oklch(87% 0 0);
  --color-neutral-400: oklch(70.8% 0 0);
  --color-neutral-500: oklch(55.6% 0 0);
  --color-neutral-600: oklch(43.9% 0 0);
  --color-neutral-700: oklch(37.1% 0 0);
  --color-neutral-800: oklch(26.9% 0 0);
  --color-neutral-900: oklch(20.5% 0 0);
  --color-neutral-950: oklch(14.5% 0 0);

  --color-stone-50: oklch(98.5% 0.001 106.423);
  --color-stone-100: oklch(97% 0.001 106.424);
  --color-stone-200: oklch(92.3% 0.003 48.717);
  --color-stone-300: oklch(86.9% 0.005 56.366);
  --color-stone-400: oklch(70.9% 0.01 56.259);
  --color-stone-500: oklch(55.3% 0.013 58.071);
  --color-stone-600: oklch(44.4% 0.011 73.639);
  --color-stone-700: oklch(37.4% 0.01 67.558);
  --color-stone-800: oklch(26.8% 0.007 34.298);
  --color-stone-900: oklch(21.6% 0.006 56.043);
  --color-stone-950: oklch(14.7% 0.004 49.25);

  --color-mauve-50: oklch(98.5% 0 0);
  --color-mauve-100: oklch(96% 0.003 325.6);
  --color-mauve-200: oklch(92.2% 0.005 325.62);
  --color-mauve-300: oklch(86.5% 0.012 325.68);
  --color-mauve-400: oklch(71.1% 0.019 323.02);
  --color-mauve-500: oklch(54.2% 0.034 322.5);
  --color-mauve-600: oklch(43.5% 0.029 321.78);
  --color-mauve-700: oklch(36.4% 0.029 323.89);
  --color-mauve-800: oklch(26.3% 0.024 320.12);
  --color-mauve-900: oklch(21.2% 0.019 322.12);
  --color-mauve-950: oklch(14.5% 0.008 326);

  --color-olive-50: oklch(98.8% 0.003 106.5);
  --color-olive-100: oklch(96.6% 0.005 106.5);
  --color-olive-200: oklch(93% 0.007 106.5);
  --color-olive-300: oklch(88% 0.011 106.6);
  --color-olive-400: oklch(73.7% 0.021 106.9);
  --color-olive-500: oklch(58% 0.031 107.3);
  --color-olive-600: oklch(46.6% 0.025 107.3);
  --color-olive-700: oklch(39.4% 0.023 107.4);
  --color-olive-800: oklch(28.6% 0.016 107.4);
  --color-olive-900: oklch(22.8% 0.013 107.4);
  --color-olive-950: oklch(15.3% 0.006 107.1);

  --color-mist-50: oklch(98.7% 0.002 197.1);
  --color-mist-100: oklch(96.3% 0.002 197.1);
  --color-mist-200: oklch(92.5% 0.005 214.3);
  --color-mist-300: oklch(87.2% 0.007 219.6);
  --color-mist-400: oklch(72.3% 0.014 214.4);
  --color-mist-500: oklch(56% 0.021 213.5);
  --color-mist-600: oklch(45% 0.017 213.2);
  --color-mist-700: oklch(37.8% 0.015 216);
  --color-mist-800: oklch(27.5% 0.011 216.9);
  --color-mist-900: oklch(21.8% 0.008 223.9);
  --color-mist-950: oklch(14.8% 0.004 228.8);

  --color-taupe-50: oklch(98.6% 0.002 67.8);
  --color-taupe-100: oklch(96% 0.002 17.2);
  --color-taupe-200: oklch(92.2% 0.005 34.3);
  --color-taupe-300: oklch(86.8% 0.007 39.5);
  --color-taupe-400: oklch(71.4% 0.014 41.2);
  --color-taupe-500: oklch(54.7% 0.021 43.1);
  --color-taupe-600: oklch(43.8% 0.017 39.3);
  --color-taupe-700: oklch(36.7% 0.016 35.7);
  --color-taupe-800: oklch(26.8% 0.011 36.5);
  --color-taupe-900: oklch(21.4% 0.009 43.1);
  --color-taupe-950: oklch(14.7% 0.004 49.3);

  --color-black: #000;
  --color-white: #fff;

  --spacing: 0.25rem;

  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  --container-3xs: 16rem;
  --container-2xs: 18rem;
  --container-xs: 20rem;
  --container-sm: 24rem;
  --container-md: 28rem;
  --container-lg: 32rem;
  --container-xl: 36rem;
  --container-2xl: 42rem;
  --container-3xl: 48rem;
  --container-4xl: 56rem;
  --container-5xl: 64rem;
  --container-6xl: 72rem;
  --container-7xl: 80rem;

  --text-xs: 0.75rem;
  --text-xs--line-height: calc(1 / 0.75);
  --text-sm: 0.875rem;
  --text-sm--line-height: calc(1.25 / 0.875);
  --text-base: 1rem;
  --text-base--line-height: calc(1.5 / 1);
  --text-lg: 1.125rem;
  --text-lg--line-height: calc(1.75 / 1.125);
  --text-xl: 1.25rem;
  --text-xl--line-height: calc(1.75 / 1.25);
  --text-2xl: 1.5rem;
  --text-2xl--line-height: calc(2 / 1.5);
  --text-3xl: 1.875rem;
  --text-3xl--line-height: calc(2.25 / 1.875);
  --text-4xl: 2.25rem;
  --text-4xl--line-height: calc(2.5 / 2.25);
  --text-5xl: 3rem;
  --text-5xl--line-height: 1;
  --text-6xl: 3.75rem;
  --text-6xl--line-height: 1;
  --text-7xl: 4.5rem;
  --text-7xl--line-height: 1;
  --text-8xl: 6rem;
  --text-8xl--line-height: 1;
  --text-9xl: 8rem;
  --text-9xl--line-height: 1;

  --font-weight-thin: 100;
  --font-weight-extralight: 200;
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  --font-weight-black: 900;

  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --radius-4xl: 2rem;

  --shadow-2xs: 0 1px rgb(0 0 0 / 0.05);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

  --inset-shadow-2xs: inset 0 1px rgb(0 0 0 / 0.05);
  --inset-shadow-xs: inset 0 1px 1px rgb(0 0 0 / 0.05);
  --inset-shadow-sm: inset 0 2px 4px rgb(0 0 0 / 0.05);

  --drop-shadow-xs: 0 1px 1px rgb(0 0 0 / 0.05);
  --drop-shadow-sm: 0 1px 2px rgb(0 0 0 / 0.15);
  --drop-shadow-md: 0 3px 3px rgb(0 0 0 / 0.12);
  --drop-shadow-lg: 0 4px 4px rgb(0 0 0 / 0.15);
  --drop-shadow-xl: 0 9px 7px rgb(0 0 0 / 0.1);
  --drop-shadow-2xl: 0 25px 25px rgb(0 0 0 / 0.15);

  --text-shadow-2xs: 0px 1px 0px rgb(0 0 0 / 0.15);
  --text-shadow-xs: 0px 1px 1px rgb(0 0 0 / 0.2);
  --text-shadow-sm:
    0px 1px 0px rgb(0 0 0 / 0.075), 0px 1px 1px rgb(0 0 0 / 0.075), 0px 2px 2px rgb(0 0 0 / 0.075);
  --text-shadow-md:
    0px 1px 1px rgb(0 0 0 / 0.1), 0px 1px 2px rgb(0 0 0 / 0.1), 0px 2px 4px rgb(0 0 0 / 0.1);
  --text-shadow-lg:
    0px 1px 2px rgb(0 0 0 / 0.1), 0px 3px 2px rgb(0 0 0 / 0.1), 0px 4px 8px rgb(0 0 0 / 0.1);

  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  --animate-spin: spin 1s linear infinite;
  --animate-ping: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animate-bounce: bounce 1s infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes ping {
    75%,
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes pulse {
    50% {
      opacity: 0.5;
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(-25%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }

    50% {
      transform: none;
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }

  --blur-xs: 4px;
  --blur-sm: 8px;
  --blur-md: 12px;
  --blur-lg: 16px;
  --blur-xl: 24px;
  --blur-2xl: 40px;
  --blur-3xl: 64px;

  --perspective-dramatic: 100px;
  --perspective-near: 300px;
  --perspective-normal: 500px;
  --perspective-midrange: 800px;
  --perspective-distant: 1200px;

  --aspect-video: 16 / 9;

  --default-transition-duration: 150ms;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  --default-font-family: --theme(--font-sans, initial);
  --default-font-feature-settings: --theme(--font-sans--font-feature-settings, initial);
  --default-font-variation-settings: --theme(--font-sans--font-variation-settings, initial);
  --default-mono-font-family: --theme(--font-mono, initial);
  --default-mono-font-feature-settings: --theme(--font-mono--font-feature-settings, initial);
  --default-mono-font-variation-settings: --theme(--font-mono--font-variation-settings, initial);
}

/* Deprecated */
@theme default inline reference {
  --blur: 8px;
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
  --drop-shadow: 0 1px 2px rgb(0 0 0 / 0.1), 0 1px 1px rgb(0 0 0 / 0.06);
  --radius: 0.25rem;
  --max-width-prose: 65ch;
}
`;
export const PREFLIGHT_CSS = `
@layer theme, base, components, utilities;

@layer theme {
  :root, :host {
    --font-sans: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    --spacing: 0.25rem;
    --default-transition-duration: 150ms;
    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);

    --animate-spin: spin 1s linear infinite;
    --animate-ping: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
    --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    --animate-bounce: bounce 1s infinite;
  }
}

@layer base {
  *, ::after, ::before, ::backdrop {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: var(--color-gray-200, currentColor);
  }
  blockquote, dl, dd, h1, h2, h3, h4, h5, h6, hr, figure, p, pre { margin: 0; }
  h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }
  ol, ul { list-style: none; margin: 0; padding: 0; }
  img, svg, video, canvas, audio, iframe, embed, object { display: block; vertical-align: middle; }
  img, video { max-width: 100%; height: auto; }
  [hidden] { display: none; }
}
`;

const KEYFRAMES_CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
@keyframes pulse { 50% { opacity: 0.5; } }
@keyframes bounce {
  0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50% { transform: none; animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}
`;


// ============================================================================
// 2. CORE ENGINE (Types, Parser, CSS Generation)
// ============================================================================

// deno-lint-ignore-file no-explicit-any

export interface ASTNode {
  kind: 'declaration' | 'rule' | 'at-rule' | 'at-root';
  property?: string;
  value?: string;
  important?: boolean;
  selector?: string;
  nodes?: ASTNode[];
  name?: string;
  params?: string;
}

export interface ValueNode {
  kind: 'named' | 'arbitrary' | 'color';
  value: string;
}

export interface Candidate {
  kind: 'static' | 'functional' | 'arbitrary';
  root: string;
  value?: ValueNode;
  modifier?: ValueNode | null;
  property?: string; // For arbitrary properties [prop:val]
  variants: string[];
  important: boolean;
  negative: boolean;
  raw: string;
  hasSignal?: string;
}

export type CompileFn = (candidate: Candidate, ds: DesignSystem) => ASTNode[] | undefined;

interface Registry {
  static: Map<string, CompileFn[]>;
  functional: Map<string, { compileFn: CompileFn; options?: Record<string, unknown> }[]>;
}

interface VariantRegistry {
  static: Map<string, ASTNode[]>;
  functional: Map<string, { compileFn: CompileFn; options?: Record<string, unknown> }>;
  compound: Map<string, { root: string; variant: string; options?: Record<string, unknown> }>;
}

/**
 * DesignSystem — Native Singleton Engine mapping classes to AST nodes.
 * Explicitly avoids unifiedRef to prevent ZCZS serialization of functional handlers.
 */
export class DesignSystem {
  private _utilities: Registry = {
    static: new Map(),
    functional: new Map()
  };

  private _variants: VariantRegistry = {
    static: new Map(),
    functional: new Map(),
    compound: new Map()
  };

  static(this: DesignSystem, root: string, compileFn: CompileFn, _options?: Record<string, unknown>): void {
    this._utilities.static.set(root, (this._utilities.static.get(root) || []).concat([compileFn]));
  }

  functional(this: DesignSystem, root: string, compileFn: CompileFn, _options?: Record<string, unknown>): void {
    this._utilities.functional.set(root, (this._utilities.functional.get(root) || []).concat([{ compileFn, options: _options }]));
  }

  variant(name: string, definition: ASTNode[] | CompileFn) {
    if (typeof definition === 'function') {
      this._variants.functional.set(name, { compileFn: definition });
    } else {
      this._variants.static.set(name, definition);
    }
  }

  has(name: string, kind: 'static' | 'functional'): boolean {
    return kind === 'static' ? this._utilities.static.has(name) : this._utilities.functional.has(name);
  }

  getStatic(name: string) {
    return this._utilities.static.get(name) || [];
  }

  getFunctional(name: string) {
    return this._utilities.functional.get(name) || [];
  }

  parseVariant(name: string): ASTNode[] | null {
    if (this._variants.static.has(name)) return this._variants.static.get(name)!;
    if (this._variants.functional.has(name)) {
      return this._variants.functional.get(name)!.compileFn({ kind: 'static', root: name, variants: [], important: false, negative: false, raw: name }, this) || null;
    }
    return null;
  }

  *parseCandidate(raw: string): Generator<Candidate> {
    const variants: string[] = [];
    let important = false;
    let negative = false;
    let baseTerm = raw;

    if (baseTerm.endsWith('!')) {
       baseTerm = baseTerm.slice(0, -1);
       important = true;
    }
    
    const parts = baseTerm.split(':');
    baseTerm = parts.pop() || '';
    variants.push(...parts);

    if (baseTerm.startsWith('-')) {
       baseTerm = baseTerm.slice(1);
       negative = true;
    }

    // Arbitrary property [prop:value]
    if (baseTerm.startsWith('[') && baseTerm.endsWith(']')) {
      const content = baseTerm.slice(1, -1);
      const colonIndex = content.indexOf(':');
      if (colonIndex > 0) {
        yield {
          kind: 'arbitrary',
          root: '',
          property: content.slice(0, colonIndex),
          value: { kind: 'arbitrary', value: content.slice(colonIndex + 1).replace(/_/g, ' ') },
          variants,
          important,
          negative,
          raw
        };
        return;
      }
    }

    const slashParts = contextAwareSplit(baseTerm, '/');
    let term = slashParts[0];
    const modifierValue = slashParts[1] || null;

    // Fraction detection: w-1/2
    if (modifierValue && /^\d+$/.test(modifierValue)) {
      const lastDash = term.lastIndexOf('-');
      if (lastDash > 0) {
        const possibleNum = term.slice(lastDash + 1);
        if (/^\d+$/.test(possibleNum)) {
          term = term.slice(0, lastDash) + '-' + `${possibleNum}/${modifierValue}`;
        }
      }
    }

    // Bracket value functional match?
    let valNode: ValueNode | undefined = undefined;
    let hasSignal: string | undefined = undefined;
    if (term.includes('[') && term.endsWith(']')) {
       const bStart = term.indexOf('[');
       const inside = term.slice(bStart + 1, -1);
       if (/^[a-zA-Z_$][\w$]*$/.test(inside)) {
          hasSignal = inside;
          valNode = { kind: 'named', value: `var(--nx-${inside})` };
       } else {
          valNode = { kind: 'named', value: inside.replace(/_/g, ' ') };
       }
    }

    if (this.has(term, 'static')) {
      yield { kind: 'static', root: term, variants, important, negative, raw, hasSignal };
      return; 
    }

    // Functional parsing iterative lookup
    if (!valNode) {
      const parts = term.split('-');
      for (let i = parts.length; i >= 1; i--) {
        const root = parts.slice(0, i).join('-');
        const value = parts.slice(i).join('-');
        
        if (this.has(root, 'functional')) {
          yield {
            kind: 'functional',
            root,
            value: value ? { kind: 'named', value } : undefined,
            modifier: modifierValue ? { kind: 'named', value: modifierValue } : null,
            variants,
            important,
            negative,
            raw,
            hasSignal
          };
          if (value || i === parts.length) return; // Matched, and it's the longest root
        }
      }
    } else {
      const bIdx = term.indexOf('[');
      const root = bIdx > 0 ? (term[bIdx-1] === '-' ? term.slice(0, bIdx - 1) : term.slice(0, bIdx)) : term.slice(0, bIdx);
      if (this.has(root, 'functional')) {
        yield {
          kind: 'functional',
          root,
          value: valNode,
          modifier: modifierValue ? { kind: 'named', value: modifierValue } : null,
          variants,
          important,
          negative,
          raw,
          hasSignal
        };
      }
    }
  }

  generateCSS(candidate: Candidate): string {
    const nodes: ASTNode[] = [];
    
    if (candidate.kind === 'static') {
      const fns = this.getStatic(candidate.root);
      for (const fn of fns) {
        const result = fn(candidate, this);
        if (result) nodes.push(...result);
      }
    } else if (candidate.kind === 'functional') {
      const registry = this.getFunctional(candidate.root);
      for (const item of registry) {
        if (typeof item.compileFn !== 'function') {
          console.error(`[FATAL] JIT Crash on "${candidate.root}": item.compileFn is NOT a function! Item structure:`, item);
          console.error(`[FATAL] Full functional registry for ${candidate.root}:`, registry);
        }
        
        const result = item.compileFn(candidate, this);
        if (result) nodes.push(...result);
      }
    } else if (candidate.kind === 'arbitrary') {
      const v = typeof candidate.value === 'object' ? candidate.value.value : (candidate.value || '');
      nodes.push({
        kind: 'declaration',
        property: candidate.property,
        value: candidate.negative ? `calc(${v} * -1)` : v,
        important: candidate.important
      });
    }

    if (nodes.length === 0) return '';
    return serializeAST(nodes, candidate);
  }
}

function contextAwareSplit(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '[') depth++;
    else if (char === ']') depth--;
    if (char === delimiter && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) result.push(current);
  return result;
}



function serializeAST(nodes: ASTNode[], candidate: Candidate): string {
  let declarations = "";
  const escapedName = candidate.raw.replace(/([\[\]/!:#.])/g, '\\$1');
  let selectorTarget = `.${escapedName}`;

  let wrapperStart = "";
  let wrapperEnd = "";
  
  // Apply our variant transformations
  for (const variant of candidate.variants) {
    // Media queries
    if (variant === 'sm') { wrapperStart += '@media (min-width: 40rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'md') { wrapperStart += '@media (min-width: 48rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'lg') { wrapperStart += '@media (min-width: 64rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'xl') { wrapperStart += '@media (min-width: 80rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === '2xl') { wrapperStart += '@media (min-width: 96rem) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'dark') { wrapperStart += '@media (prefers-color-scheme: dark) { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    if (variant === 'print') { wrapperStart += '@media print { '; wrapperEnd = ' }' + wrapperEnd; continue; }
    
    // Group & Peer compound variants (simplified for native parity mapping)
    if (variant.startsWith('group-')) {
       const sub = variant.slice(6);
       selectorTarget = `.group:${sub === 'hover' ? 'hover' : sub === 'focus' ? 'focus' : sub} ${selectorTarget}`;
       continue;
    }
    if (variant.startsWith('peer-')) {
       const sub = variant.slice(5);
       selectorTarget = `.peer:${sub === 'hover' ? 'hover' : sub === 'focus' ? 'focus' : sub} ~ ${selectorTarget}`;
       continue;
    }
    
    // Arbitrary variants [&_p]:hover etc
    if (variant.startsWith('[') && variant.endsWith(']')) {
        const customSel = variant.slice(1, -1).replace(/_/g, ' ');
        if (customSel.includes('&')) {
            selectorTarget = customSel.replace(/&/g, selectorTarget);
        } else {
            wrapperStart += `@media ${customSel} { `; wrapperEnd = ' }' + wrapperEnd; 
        }
        continue;
    }
    
    // Map pseudos natively
    const pseudoMap: Record<string, string> = {
      first: ':first-child', last: ':last-child', even: ':nth-child(even)', odd: ':nth-child(odd)',
      hover: ':hover', focus: ':focus', 'focus-within': ':focus-within', 'focus-visible': ':focus-visible',
      active: ':active', disabled: ':disabled', checked: ':checked',
      'in-range': ':in-range', 'out-of-range': ':out-of-range',
      'placeholder-shown': ':placeholder-shown', autofill: ':autofill',
      'read-only': ':read-only', open: '[open]', empty: ':empty',
      target: ':target', 'first-of-type': ':first-of-type', 'last-of-type': ':last-of-type',
      'only-of-type': ':only-of-type', 'popover-open': ':popover-open',
      enabled: ':enabled', indeterminate: ':indeterminate', default: ':default',
      required: ':required', valid: ':valid', invalid: ':invalid'
    };
    
    if (pseudoMap[variant]) {
       selectorTarget += pseudoMap[variant];
    } else {
       // Passthrough valid custom state pseudos
       selectorTarget += `:${variant}`;
    }
  }
  
  // Deterministic Property Sort Order (Tailwind Parity)
  const PROPERTY_ORDER_MAP: Record<string, number> = {
    'appearance': 1, 'display': 2, 'position': 3, 'top': 4, 'right': 5, 'bottom': 6, 'left': 7, 'inset': 8,
    'flex': 10, 'flex-basis': 11, 'flex-direction': 12, 'flex-grow': 13, 'flex-shrink': 14, 'flex-wrap': 15,
    'grid': 20, 'grid-area': 21, 'gap': 25, 'align-content': 30, 'align-items': 31, 'align-self': 32,
    'justify-content': 35, 'justify-items': 36, 'justify-self': 37,
    'order': 40, 'float': 45, 'clear': 46,
    'width': 50, 'min-width': 51, 'max-width': 52, 'height': 53, 'min-height': 54, 'max-height': 55,
    'inline-size': 56, 'block-size': 57,
    'margin': 60, 'margin-top': 61, 'margin-right': 62, 'margin-bottom': 63, 'margin-left': 64,
    'padding': 70, 'padding-top': 71, 'padding-right': 72, 'padding-bottom': 73, 'padding-left': 74,
    'font-family': 80, 'font-size': 81, 'font-weight': 82, 'line-height': 83, 'letter-spacing': 84,
    'color': 90, 'text-align': 91, 'text-decoration': 92, 'text-transform': 93,
    'background': 100, 'background-color': 101, 'background-image': 102,
    'border': 110, 'border-width': 111, 'border-style': 112, 'border-color': 113, 'border-radius': 114,
    'outline': 120, 'outline-width': 121, 'outline-style': 122, 'outline-color': 123, 'outline-offset': 124,
    'opacity': 130, 'visibility': 131, 'z-index': 132, 'content': 133,
    'transition': 140, 'transition-property': 141, 'transition-duration': 142, 'transition-timing-function': 143,
    'transform': 150, 'animation': 151, 'filter': 152, 'backdrop-filter': 153
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.kind !== 'declaration' || b.kind !== 'declaration') return 0;
    const propA = a.property || "";
    const propB = b.property || "";
    const orderA = PROPERTY_ORDER_MAP[propA] || 999;
    const orderB = PROPERTY_ORDER_MAP[propB] || 999;
    if (orderA !== orderB) return orderA - orderB;
    return propA.localeCompare(propB);
  });

  let extraCSS = "";
  for (const node of sortedNodes) {
    if (node.kind === 'declaration') {
      declarations += `${node.property}: ${node.value}${node.important || candidate.important ? ' !important' : ''};`;
    } else if (node.kind === 'at-rule') {
      extraCSS += `@${node.name} ${node.params} { ${node.nodes ? node.nodes.map(n => `${n.property}: ${n.value};`).join(' ') : ''} } `;
    } else if (node.kind === 'at-root' && node.nodes) {
      for (const child of node.nodes) {
        if (child.kind === 'declaration') {
            declarations += `${child.property}: ${child.value};`;
        }
      }
    }
  }
  
  return `${extraCSS}${wrapperStart}${selectorTarget} { ${declarations} }${wrapperEnd}`;
}




// ============================================================================
// 3. UTILITY REGISTRY
// ============================================================================
/**
 * tailwind-utilities.ts — Complete Tailwind v4 utility registry
 * Ported from @tailwindcss/browser@4.2.2
 * ZCZS: Pure registration functions, zero heap allocation at runtime
 */
// Helper: create a declaration node (borrowing pattern — no allocation beyond the literal)
function d(property: string, value: string, important = false): ASTNode {
  return { kind: 'declaration', property, value, important };
}

// Helper: create an at-root node
function K(nodes: ASTNode[]): ASTNode {
  return { kind: 'at-root', nodes };
}

// Helper: register a batch of static name→declarations
function statics(ds: DesignSystem, entries: [string, [string, string][]][]) {
  for (const [name, decls] of entries) {
    ds.static(name, () => decls.map(([p, v]) => d(p, v)));
  }
}

// Helper: resolve spacing value from bare number or keyword
function resolveSpacing(val: string, negative = false): string {
  if (val === 'px') return negative ? '-1px' : '1px';
  if (val === 'auto') return 'auto';
  if (val === 'full') return negative ? '-100%' : '100%';
  if (val === 'screen') return '100vw';
  if (val.includes('var(')) return val;
  // Decimal support: 1.5 → calc(var(--spacing) * 1.5)
  const num = Number(val);
  if (!Number.isNaN(num)) {
    const expr = `calc(var(--spacing) * ${val})`;
    return negative ? `calc(${expr} * -1)` : expr;
  }
  return val;
}

function resolveThemeValue(key: string, v: string): string {
  if (v === 'none') return 'none';
  if (v.startsWith('[') || v.startsWith('#') || v.includes('(')) return v;
  // v4 convention: use theme variables for named keys
  return `var(--${key}-${v}, ${v})`;
}

// Helper: resolve color with optional opacity modifier
function resolveColor(val: string | ValueNode | undefined, modifier?: ValueNode | null): string {
  const v = (typeof val === 'string' ? val : val?.value) || '';
  if (v === 'transparent') return 'transparent';
  if (v === 'current') return 'currentcolor';
  if (v === 'inherit') return 'inherit';
  
  // v4 convention: if it starts with [ it is already resolved or arbitrary
  let color = v.startsWith('#') || v.includes('var(') || v.includes('(') || v.startsWith('[')
    ? v
    : `var(--color-${v})`;
    
  if (modifier?.value) {
    const op = Number.isNaN(Number(modifier.value)) ? modifier.value : `${modifier.value}%`;
    color = `color-mix(in oklab, ${color} ${op}, transparent)`;
  }
  return color;
}

export function populateStandardUtilities(ds: DesignSystem) {
  // ═══════════════════════════════════════════════════════
  // 1. DISPLAY & LAYOUT
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['block', [['display', 'block']]],
    ['inline-block', [['display', 'inline-block']]],
    ['inline', [['display', 'inline']]],
    ['flex', [['display', 'flex']]],
    ['inline-flex', [['display', 'inline-flex']]],
    ['grid', [['display', 'grid']]],
    ['inline-grid', [['display', 'inline-grid']]],
    ['hidden', [['display', 'none']]],
    ['contents', [['display', 'contents']]],
    ['flow-root', [['display', 'flow-root']]],
    ['list-item', [['display', 'list-item']]],
    ['table', [['display', 'table']]],
    ['inline-table', [['display', 'inline-table']]],
    ['table-caption', [['display', 'table-caption']]],
    ['table-cell', [['display', 'table-cell']]],
    ['table-column', [['display', 'table-column']]],
    ['table-column-group', [['display', 'table-column-group']]],
    ['table-footer-group', [['display', 'table-footer-group']]],
    ['table-header-group', [['display', 'table-header-group']]],
    ['table-row-group', [['display', 'table-row-group']]],
    ['table-row', [['display', 'table-row']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 2. POSITION
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['static', [['position', 'static']]],
    ['fixed', [['position', 'fixed']]],
    ['absolute', [['position', 'absolute']]],
    ['relative', [['position', 'relative']]],
    ['sticky', [['position', 'sticky']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 3. VISIBILITY
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['visible', [['visibility', 'visible']]],
    ['invisible', [['visibility', 'hidden']]],
    ['collapse', [['visibility', 'collapse']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 4. ISOLATION & Z-INDEX
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['isolate', [['isolation', 'isolate']]],
    ['isolation-auto', [['isolation', 'auto']]],
  ]);
  ds.functional('z', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'auto') return [d('z-index', 'auto')];
    return [d('z-index', c.negative ? `calc(${v} * -1)` : v)];
  });

  // ═══════════════════════════════════════════════════════
  // 5. FLEXBOX
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['flex-row', [['flex-direction', 'row']]],
    ['flex-row-reverse', [['flex-direction', 'row-reverse']]],
    ['flex-col', [['flex-direction', 'column']]],
    ['flex-col-reverse', [['flex-direction', 'column-reverse']]],
    ['flex-wrap', [['flex-wrap', 'wrap']]],
    ['flex-nowrap', [['flex-wrap', 'nowrap']]],
    ['flex-wrap-reverse', [['flex-wrap', 'wrap-reverse']]],
    ['flex-auto', [['flex', 'auto']]],
    ['flex-initial', [['flex', '0 auto']]],
    ['flex-none', [['flex', 'none']]],
  ]);
  // flex-{n} functional with fraction support
  ds.functional('flex', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'col') return [d('flex-direction', 'column')];
    if (v === 'row') return [d('flex-direction', 'row')];
    // Fraction: flex-1/2 → flex: calc(1/2 * 100%)
    if (v.includes('/')) {
      const [num, den] = v.split('/');
      if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
        return [d('flex', `calc(${num}/${den} * 100%)`)];
      }
    }
    if (/^\d+$/.test(v)) return [d('flex', `${v} ${v} 0%`)];
    return [d('flex', v)];
  });

  // grow / shrink
  ds.static('grow', () => [d('flex-grow', '1')]);
  ds.static('shrink', () => [d('flex-shrink', '1')]);
  ds.functional('grow', (c) => {
    if (!c.value) return [d('flex-grow', '1')];
    return [d('flex-grow', c.value.value)];
  });
  ds.functional('shrink', (c) => {
    if (!c.value) return [d('flex-shrink', '1')];
    return [d('flex-shrink', c.value.value)];
  });

  // basis
  ds.functional('basis', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'auto') return [d('flex-basis', 'auto')];
    if (v === 'full') return [d('flex-basis', '100%')];
    // Fraction: basis-1/2 → flex-basis: calc(1/2 * 100%)
    if (v.includes('/')) {
      const [num, den] = v.split('/');
      if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
        return [d('flex-basis', `calc(${num}/${den} * 100%)`)];
      }
    }
    return [d('flex-basis', resolveSpacing(v))];
  });

  // order
  ds.functional('order', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'first') return [d('order', '-9999')];
    if (v === 'last') return [d('order', '9999')];
    return [d('order', c.negative ? `calc(${v} * -1)` : v)];
  });

  // ═══════════════════════════════════════════════════════
  // 6. ALIGNMENT
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    // align-items
    ['items-center', [['align-items', 'center']]],
    ['items-start', [['align-items', 'flex-start']]],
    ['items-end', [['align-items', 'flex-end']]],
    ['items-baseline', [['align-items', 'baseline']]],
    ['items-stretch', [['align-items', 'stretch']]],
    // justify-content
    ['justify-normal', [['justify-content', 'normal']]],
    ['justify-center', [['justify-content', 'center']]],
    ['justify-start', [['justify-content', 'flex-start']]],
    ['justify-end', [['justify-content', 'flex-end']]],
    ['justify-between', [['justify-content', 'space-between']]],
    ['justify-around', [['justify-content', 'space-around']]],
    ['justify-evenly', [['justify-content', 'space-evenly']]],
    ['justify-stretch', [['justify-content', 'stretch']]],
    // justify-items
    ['justify-items-normal', [['justify-items', 'normal']]],
    ['justify-items-center', [['justify-items', 'center']]],
    ['justify-items-start', [['justify-items', 'start']]],
    ['justify-items-end', [['justify-items', 'end']]],
    ['justify-items-stretch', [['justify-items', 'stretch']]],
    // align-content
    ['content-normal', [['align-content', 'normal']]],
    ['content-center', [['align-content', 'center']]],
    ['content-start', [['align-content', 'flex-start']]],
    ['content-end', [['align-content', 'flex-end']]],
    ['content-between', [['align-content', 'space-between']]],
    ['content-around', [['align-content', 'space-around']]],
    ['content-evenly', [['align-content', 'space-evenly']]],
    ['content-stretch', [['align-content', 'stretch']]],
    // place-content
    ['place-content-center', [['place-content', 'center']]],
    ['place-content-start', [['place-content', 'start']]],
    ['place-content-end', [['place-content', 'end']]],
    ['place-content-between', [['place-content', 'space-between']]],
    ['place-content-around', [['place-content', 'space-around']]],
    ['place-content-evenly', [['place-content', 'space-evenly']]],
    ['place-content-stretch', [['place-content', 'stretch']]],
    // place-items
    ['place-items-center', [['place-items', 'center']]],
    ['place-items-start', [['place-items', 'start']]],
    ['place-items-end', [['place-items', 'end']]],
    ['place-items-baseline', [['place-items', 'baseline']]],
    ['place-items-stretch', [['place-items', 'stretch']]],
    // self
    ['self-auto', [['align-self', 'auto']]],
    ['self-start', [['align-self', 'flex-start']]],
    ['self-end', [['align-self', 'flex-end']]],
    ['self-center', [['align-self', 'center']]],
    ['self-stretch', [['align-self', 'stretch']]],
    ['self-baseline', [['align-self', 'baseline']]],
    // justify-self
    ['justify-self-auto', [['justify-self', 'auto']]],
    ['justify-self-start', [['justify-self', 'flex-start']]],
    ['justify-self-end', [['justify-self', 'flex-end']]],
    ['justify-self-center', [['justify-self', 'center']]],
    ['justify-self-stretch', [['justify-self', 'stretch']]],
    // place-self
    ['place-self-auto', [['place-self', 'auto']]],
    ['place-self-start', [['place-self', 'start']]],
    ['place-self-end', [['place-self', 'end']]],
    ['place-self-center', [['place-self', 'center']]],
    ['place-self-stretch', [['place-self', 'stretch']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 7. FLOAT & CLEAR
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['float-start', [['float', 'inline-start']]],
    ['float-end', [['float', 'inline-end']]],
    ['float-right', [['float', 'right']]],
    ['float-left', [['float', 'left']]],
    ['float-none', [['float', 'none']]],
    ['clear-start', [['clear', 'inline-start']]],
    ['clear-end', [['clear', 'inline-end']]],
    ['clear-right', [['clear', 'right']]],
    ['clear-left', [['clear', 'left']]],
    ['clear-both', [['clear', 'both']]],
    ['clear-none', [['clear', 'none']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 6. ASPECT RATIO
  // ═══════════════════════════════════════════════════════
  ds.functional('aspect', (c) => {
    if (!c.value) return;
    const val = c.value.value;
    if (val === 'auto') return [d('aspect-ratio', 'auto')];
    if (val === 'square') return [d('aspect-ratio', '1 / 1')];
    if (val === 'video') return [d('aspect-ratio', '16 / 9')];
    return [d('aspect-ratio', val.replace('_', ' / '))];
  });

  // ═══════════════════════════════════════════════════════
  // 7. BOX SIZING & OUTLINE
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['box-border', [['box-sizing', 'border-box']]],
    ['box-content', [['box-sizing', 'content-box']]],
    ['outline-none', [['outline', '2px solid transparent'], ['outline-offset', '2px']]],
    ['outline', [['outline-style', 'solid']]],
    ['outline-dashed', [['outline-style', 'dashed']]],
    ['outline-dotted', [['outline-style', 'dotted']]],
    ['outline-double', [['outline-style', 'double']]],
  ]);

  ds.functional('outline', (c) => {
    if (!c.value) return;
    const val = c.value.value;
    // Handle colors vs widths
    if (c.value.kind === 'color') {
        const color = resolveColor(c.value, c.modifier);
        return [d('outline-color', color)];
    }
    // Handle specific widths
    return [d('outline-width', resolveSpacing(val))];
  });

  ds.functional('outline-offset', (c) => {
    if (!c.value) return;
    return [d('outline-offset', resolveSpacing(c.value.value))];
  });

  // ═══════════════════════════════════════════════════════
  // 9. OVERFLOW
  // ═══════════════════════════════════════════════════════
  for (const v of ['auto', 'hidden', 'clip', 'visible', 'scroll']) {
    ds.static(`overflow-${v}`, () => [d('overflow', v)]);
    ds.static(`overflow-x-${v}`, () => [d('overflow-x', v)]);
    ds.static(`overflow-y-${v}`, () => [d('overflow-y', v)]);
  }
  for (const v of ['auto', 'contain', 'none']) {
    ds.static(`overscroll-${v}`, () => [d('overscroll-behavior', v)]);
    ds.static(`overscroll-x-${v}`, () => [d('overscroll-behavior-x', v)]);
    ds.static(`overscroll-y-${v}`, () => [d('overscroll-behavior-y', v)]);
  }

  // ═══════════════════════════════════════════════════════
  // 10. SPACING (margin & padding) — functional
  // ═══════════════════════════════════════════════════════
  const spacingMap: Record<string, string[]> = {
    m: ['margin'], mx: ['margin-inline'], my: ['margin-block'],
    ms: ['margin-inline-start'], me: ['margin-inline-end'],
    mbs: ['margin-block-start'], mbe: ['margin-block-end'],
    mt: ['margin-top'], mr: ['margin-right'], mb: ['margin-bottom'], ml: ['margin-left'],
    p: ['padding'], px: ['padding-inline'], py: ['padding-block'],
    ps: ['padding-inline-start'], pe: ['padding-inline-end'],
    pbs: ['padding-block-start'], pbe: ['padding-block-end'],
    pt: ['padding-top'], pr: ['padding-right'], pb: ['padding-bottom'], pl: ['padding-left'],
    gap: ['gap'], 'gap-x': ['column-gap'], 'gap-y': ['row-gap'],
  };
  for (const [root, props] of Object.entries(spacingMap)) {
    // static auto for margins
    if (root.startsWith('m')) {
      ds.static(`${root}-auto`, () => props.map(p => d(p, 'auto')));
    }
    ds.functional(root, (c) => {
      if (!c.value) return;
      const val = resolveSpacing(c.value.value, c.negative);
      return props.map(p => d(p, val));
    });
  }

  // ═══════════════════════════════════════════════════════
  // 11. SIZING (w, h, min-w, min-h, max-w, max-h, size)
  // ═══════════════════════════════════════════════════════
  // Width-specific keywords
  for (const [kw, val] of [['full', '100%'], ['min', 'min-content'], ['max', 'max-content'], ['fit', 'fit-content']] as const) {
    ds.static(`w-${kw}`, () => [d('width', val)]);
    ds.static(`h-${kw}`, () => [d('height', val)]);
    ds.static(`min-w-${kw}`, () => [d('min-width', val)]);
    ds.static(`min-h-${kw}`, () => [d('min-height', val)]);
    ds.static(`max-w-${kw}`, () => [d('max-width', val)]);
    ds.static(`max-h-${kw}`, () => [d('max-height', val)]);
    ds.static(`size-${kw}`, () => [d('width', val), d('height', val)]);
  }
  // Viewport units — width uses vw/svw/lvw/dvw, height uses vh/svh/lvh/dvh
  for (const [kw, wVal, hVal] of [
    ['screen', '100vw', '100vh'],
    ['svw', '100svw', '100svh'], ['lvw', '100lvw', '100lvh'], ['dvw', '100dvw', '100dvh'],
  ] as const) {
    ds.static(`w-${kw}`, () => [d('width', wVal)]);
    ds.static(`h-${kw}`, () => [d('height', hVal)]);
    ds.static(`min-w-${kw}`, () => [d('min-width', wVal)]);
    ds.static(`min-h-${kw}`, () => [d('min-height', hVal)]);
    ds.static(`max-w-${kw}`, () => [d('max-width', wVal)]);
    ds.static(`max-h-${kw}`, () => [d('max-height', hVal)]);
  }
  // dvh/svh/lvh as standalone (h-dvh, h-svh, h-lvh)
  ds.static('h-dvh', () => [d('height', '100dvh')]);
  ds.static('h-svh', () => [d('height', '100svh')]);
  ds.static('h-lvh', () => [d('height', '100lvh')]);
  ds.static('min-h-dvh', () => [d('min-height', '100dvh')]);
  ds.static('max-h-dvh', () => [d('max-height', '100dvh')]);
  statics(ds, [
    ['w-auto', [['width', 'auto']]], ['h-auto', [['height', 'auto']]],
    ['size-auto', [['width', 'auto'], ['height', 'auto']]],
    ['min-w-auto', [['min-width', 'auto']]], ['min-h-auto', [['min-height', 'auto']]],
    ['max-w-none', [['max-width', 'none']]], ['max-h-none', [['max-height', 'none']]],
    ['w-screen', [['width', '100vw']]], ['h-screen', [['height', '100vh']]],
    ['min-w-screen', [['min-width', '100vw']]], ['min-h-screen', [['min-height', '100vh']]],
    ['max-w-screen', [['max-width', '100vw']]], ['max-h-screen', [['max-height', '100vh']]],
    ['h-lh', [['height', '1lh']]], ['min-h-lh', [['min-height', '1lh']]], ['max-h-lh', [['max-height', '1lh']]],
  ]);

  const sizingMap: Record<string, string> = {
    w: 'width', h: 'height', 'min-w': 'min-width', 'min-h': 'min-height',
    'max-w': 'max-width', 'max-h': 'max-height',
    'inline': 'inline-size', 'min-inline': 'min-inline-size', 'max-inline': 'max-inline-size',
    'block': 'block-size', 'min-block': 'min-block-size', 'max-block': 'max-block-size',
  };
  for (const [root, prop] of Object.entries(sizingMap)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      // Fraction support: w-1/2 → width: calc(1/2 * 100%)
      if (v.includes('/')) {
        const [num, den] = v.split('/');
        if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
          return [d(prop, `calc(${num}/${den} * 100%)`)];
        }
      }
      return [d(prop, resolveSpacing(v, c.negative))];
    });
  }
  ds.functional('size', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    // Fraction support
    if (v.includes('/')) {
      const [num, den] = v.split('/');
      if (num && den && !Number.isNaN(Number(num)) && !Number.isNaN(Number(den))) {
        const pct = `calc(${num}/${den} * 100%)`;
        return [d('width', pct), d('height', pct)];
      }
    }
    const resolved = resolveSpacing(v, c.negative);
    return [d('width', resolved), d('height', resolved)];
  });

  // ═══════════════════════════════════════════════════════
  // 12. INSET (top, right, bottom, left, inset)
  // ═══════════════════════════════════════════════════════
  const insetMap: Record<string, string[]> = {
    inset: ['inset'], 'inset-x': ['inset-inline'], 'inset-y': ['inset-block'],
    'inset-s': ['inset-inline-start'], 'inset-e': ['inset-inline-end'],
    'inset-bs': ['inset-block-start'], 'inset-be': ['inset-block-end'],
    top: ['top'], right: ['right'], bottom: ['bottom'], left: ['left'],
  };
  for (const [root, props] of Object.entries(insetMap)) {
    ds.static(`${root}-auto`, () => props.map(p => d(p, 'auto')));
    ds.static(`${root}-full`, () => props.map(p => d(p, '100%')));
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      return props.map(p => d(p, resolveSpacing(v, c.negative)));
    });
  }

  // ═══════════════════════════════════════════════════════
  // 13. COLORS (bg, text, border, outline, fill, stroke, accent, caret, divide)
  // ═══════════════════════════════════════════════════════
  const colorRoots: [string, string][] = [
    ['bg', 'background-color'], 
    ['border', 'border-color'],
    ['fill', 'fill'], ['stroke', 'stroke'],
    ['accent', 'accent-color'], ['caret', 'caret-color'],
  ];
  for (const [root, prop] of colorRoots) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const color = resolveColor(c.value, c.modifier);
      return [d(prop, color)];
    });
  }
  statics(ds, [
    ['bg-none', [['background-image', 'none']]],
    ['fill-none', [['fill', 'none']]],
    ['stroke-none', [['stroke', 'none']]],
    ['accent-auto', [['accent-color', 'auto']]],
  ]);

  // ═══════════════════════════════════════════════════════
  // 14. TYPOGRAPHY
  // ═══════════════════════════════════════════════════════
  ds.functional('text', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v.startsWith('#') || v.startsWith('okl') || v.startsWith('rgb')) {
      return [d('color', resolveColor(c.value, c.modifier))];
    }
    // Typography extraction parity (v4 refined metrics)
    const metrics: Record<string, {s: string, lh: string}> = {
      'xs': {s: '0.75rem', lh: '1rem'},
      'sm': {s: '0.875rem', lh: '1.25rem'},
      'base': {s: '1rem', lh: '1.5rem'},
      'lg': {s: '1.125rem', lh: '1.75rem'},
      'xl': {s: '1.25rem', lh: '1.75rem'},
      '2xl': {s: '1.5rem', lh: '2rem'}
    };
    if (metrics[v]) {
      return [
        d('font-size', `var(--text-${v}, ${metrics[v].s})`),
        d('line-height', `var(--text-${v}--line-height, ${metrics[v].lh})`)
      ];
    }
    if (v.includes('.')) {
       return [d('font-size', v), d('line-height', '1.5')];
    }
    return [d('color', resolveColor(c.value, c.modifier))];
  });

  statics(ds, [
    ['text-left', [['text-align', 'left']]],
    ['text-center', [['text-align', 'center']]],
    ['text-right', [['text-align', 'right']]],
    ['text-justify', [['text-align', 'justify']]],
    ['text-start', [['text-align', 'start']]],
    ['text-end', [['text-align', 'end']]],
    ['text-wrap', [['text-wrap', 'wrap']]],
    ['text-nowrap', [['text-wrap', 'nowrap']]],
    ['text-balance', [['text-wrap', 'balance']]],
    ['text-pretty', [['text-wrap', 'pretty']]],
    ['text-ellipsis', [['text-overflow', 'ellipsis']]],
    ['text-clip', [['text-overflow', 'clip']]],
    ['uppercase', [['text-transform', 'uppercase']]],
    ['lowercase', [['text-transform', 'lowercase']]],
    ['capitalize', [['text-transform', 'capitalize']]],
    ['normal-case', [['text-transform', 'none']]],
    ['italic', [['font-style', 'italic']]],
    ['not-italic', [['font-style', 'normal']]],
    ['underline', [['text-decoration-line', 'underline']]],
    ['overline', [['text-decoration-line', 'overline']]],
    ['line-through', [['text-decoration-line', 'line-through']]],
    ['no-underline', [['text-decoration-line', 'none']]],
    ['antialiased', [['-webkit-font-smoothing', 'antialiased'], ['-moz-osx-font-smoothing', 'grayscale']]],
    ['subpixel-antialiased', [['-webkit-font-smoothing', 'auto'], ['-moz-osx-font-smoothing', 'auto']]],
    ['truncate', [['overflow', 'hidden'], ['text-overflow', 'ellipsis'], ['white-space', 'nowrap']]],
    ['break-normal', [['overflow-wrap', 'normal'], ['word-break', 'normal']]],
    ['break-all', [['word-break', 'break-all']]],
    ['break-keep', [['word-break', 'keep-all']]],
    ['wrap-anywhere', [['overflow-wrap', 'anywhere']]],
    ['wrap-break-word', [['overflow-wrap', 'break-word']]],
    ['wrap-normal', [['overflow-wrap', 'normal']]],
  ]);
  // whitespace
  for (const v of ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']) {
    ds.static(`whitespace-${v}`, () => [d('white-space', v)]);
  }
  // font-sans / font-mono / font-serif as static
  ds.static('font-sans', () => [d('font-family', 'var(--font-sans, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji")')]);
  ds.static('font-serif', () => [d('font-family', 'var(--font-serif, ui-serif, Georgia, Cambria, "Times New Roman", Times, serif)')]);
  ds.static('font-mono', () => [d('font-family', 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)')]);
  // font-{weight} functional
  ds.functional('font', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    // Named font families handled by statics above
    if (v === 'sans' || v === 'serif' || v === 'mono') return;
    // Font weights
    const weights: Record<string, string> = {
      thin: '100', extralight: '200', light: '300', normal: '400',
      medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900'
    };
    const w = weights[v] || v;
    return [d('font-weight', w)];
  });
  // leading (line-height)
  ds.functional('leading', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    const leadings: Record<string, string> = {
      'none': '1', 'tight': '1.25', 'snug': '1.375', 'normal': '1.5', 'relaxed': '1.625', 'loose': '2'
    };
    return [d('line-height', leadings[v] || resolveSpacing(v))];
  });
  // tracking (letter-spacing)
  ds.functional('tracking', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    return [d('letter-spacing', v.includes('var(') ? v : `var(--tracking-${v}, ${v})`)];
  });
  // indent
  ds.functional('indent', (c) => {
    if (!c.value) return;
    return [d('text-indent', resolveSpacing(c.value.value, c.negative))];
  });

  // ═══════════════════════════════════════════════════════
  // 15. BORDERS & ROUNDED (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['border-solid', [['border-style', 'solid']]],
    ['border-dashed', [['border-style', 'dashed']]],
    ['border-dotted', [['border-style', 'dotted']]],
    ['border-double', [['border-style', 'double']]],
    ['border-hidden', [['border-style', 'hidden']]],
    ['border-none', [['border-style', 'none']]],
    ['border-collapse', [['border-collapse', 'collapse']]],
    ['border-separate', [['border-collapse', 'separate']]],
  ]);

  const borderWidthMap: Record<string, string[]> = {
    border: ['border-width'],
    'border-x': ['border-inline-width'], 'border-y': ['border-block-width'],
    'border-t': ['border-top-width'], 'border-r': ['border-right-width'],
    'border-b': ['border-bottom-width'], 'border-l': ['border-left-width'],
    'border-s': ['border-inline-start-width'], 'border-e': ['border-inline-end-width'],
  };

  for (const [root, props] of Object.entries(borderWidthMap)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      if (v === 'transparent' || v === 'current' || v === 'inherit' || v.includes('-') || v.startsWith('#')) {
        const color = resolveColor(v, c.modifier);
        return props.map(p => d(p.replace('-width', '-color'), color));
      }
      const width = /^\d+$/.test(v) ? `${v}px` : v;
      return [...props.map(p => d(p, width)), d('border-style', 'solid')];
    });
  }

  const radiusMap: Record<string, string[]> = {
    rounded: ['border-radius'],
    'rounded-t': ['border-top-left-radius', 'border-top-right-radius'],
    'rounded-r': ['border-top-right-radius', 'border-bottom-right-radius'],
    'rounded-b': ['border-bottom-right-radius', 'border-bottom-left-radius'],
    'rounded-l': ['border-top-left-radius', 'border-bottom-left-radius'],
    'rounded-tl': ['border-top-left-radius'], 'rounded-tr': ['border-top-right-radius'],
    'rounded-br': ['border-bottom-right-radius'], 'rounded-bl': ['border-bottom-left-radius'],
    'rounded-s': ['border-start-start-radius', 'border-end-start-radius'],
    'rounded-e': ['border-start-end-radius', 'border-end-end-radius'],
    'rounded-ss': ['border-start-start-radius'], 'rounded-se': ['border-start-end-radius'],
    'rounded-ee': ['border-end-end-radius'], 'rounded-es': ['border-end-start-radius'],
  };

  for (const [root, props] of Object.entries(radiusMap)) {
    ds.static(`${root}-none`, () => props.map(p => d(p, '0')));
    ds.static(`${root}-full`, () => props.map(p => d(p, 'calc(infinity * 1px)')));
    ds.functional(root, (c) => {
      if (!c.value) return;
      const v = c.value.value;
      return props.map(p => d(p, v.includes('var(') ? v : `var(--radius-${v}, ${v})`));
    });
  }

  // ═══════════════════════════════════════════════════════
  // 16. OPACITY
  // ═══════════════════════════════════════════════════════
  ds.functional('opacity', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    const num = Number(v);
    return [d('opacity', !Number.isNaN(num) && num >= 0 && num <= 100 ? `${v}%` : v)];
  });

  // ═══════════════════════════════════════════════════════
  // 17. SHADOWS & RING (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  const shadowValue = 'var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000)';
  
  ds.functional('shadow', (c) => {
    if (!c.value) return [d('--tw-shadow', '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'), d('box-shadow', shadowValue)];
    const v = c.value.value;
    if (v === 'none') return [d('box-shadow', 'none')];
    
    // Improved color detection: if it's not a known shadow size, treat as color
    const sizes = ['sm', 'md', 'lg', 'xl', '2xl', 'inner'];
    if (!sizes.includes(v) && !/^\d/.test(v)) {
      return [d('--tw-shadow-color', resolveColor(c.value, c.modifier)), d('box-shadow', shadowValue)];
    }
    
    return [d('--tw-shadow', `var(--shadow-${v}, ${v})`), d('box-shadow', shadowValue)];
  });

  ds.functional('ring', (c) => {
    if (!c.value) return [d('--tw-ring-shadow', 'var(--tw-ring-inset, ) 0 0 0 calc(3px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, currentColor)'), d('box-shadow', shadowValue)];
    const v = c.value.value;
    
    // If it's a color (not a number/spacing)
    if (!/^\d/.test(v) && v !== 'auto' && v !== 'px') {
      return [d('--tw-ring-color', resolveColor(c.value, c.modifier)), d('box-shadow', shadowValue)];
    }
    
    // v4 Parity: ring-<number> is pixels, not spacing scale
    const width = /^\d+$/.test(v) ? `${v}px` : resolveSpacing(v);
    return [d('--tw-ring-shadow', `var(--tw-ring-inset, ) 0 0 0 calc(${width} + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, currentColor)`), d('box-shadow', shadowValue)];
  });

  // ═══════════════════════════════════════════════════════
  // 17b. TYPOGRAPHY ENHANCEMENTS
  // ═══════════════════════════════════════════════════════
  ds.functional('font', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'sans' || v === 'serif' || v === 'mono') return;
    
    // Check for font-size (text-xs, text-sm etc are handled by 'text' functional)
    // But font-size can also be numeric weights or var()
    if (/^\d{3}$/.test(v)) return [d('font-weight', v)];
    
    const weights: Record<string, string> = {
      thin: '100', extralight: '200', light: '300', normal: '400',
      medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900'
    };
    if (weights[v]) return [d('font-weight', weights[v])];
    
    return [d('font-family', v.includes('-') ? `var(--font-${v})` : v)];
  });
  statics(ds, [
    ['transform-none', [['transform', 'none']]],
    ['transform-gpu', [['transform', 'translateZ(0)']]],
    ['backface-visible', [['backface-visibility', 'visible']]],
    ['backface-hidden', [['backface-visibility', 'hidden']]],
  ]);
  // Compositing helper for transforms
  const tpl = () => K([
    d('--tw-scale-x', '1'), d('--tw-scale-y', '1'), d('--tw-scale-z', '1'),
    d('--tw-rotate-x', '0deg'), d('--tw-rotate-y', '0deg'), d('--tw-rotate-z', '0deg'),
    d('--tw-translate-x', '0'), d('--tw-translate-y', '0'), d('--tw-translate-z', '0'),
    d('--tw-skew-x', '0deg'), d('--tw-skew-y', '0deg')
  ]);
  const transformStr = 'var(--tw-rotate-x) var(--tw-rotate-y) var(--tw-rotate-z) var(--tw-skew-x) var(--tw-skew-y)';

  ds.functional('scale', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}%` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [tpl(), d('--tw-scale-x', val), d('--tw-scale-y', val), d('--tw-scale-z', val), d('scale', 'var(--tw-scale-x) var(--tw-scale-y)')];
  });
  ['x', 'y', 'z'].forEach(axis => {
    ds.functional(`scale-${axis}`, (c) => {
      if (!c.value) return;
      const v = /^\d+$/.test(c.value.value) ? `${c.value.value}%` : c.value.value;
      const val = c.negative ? `calc(${v} * -1)` : v;
      return [tpl(), d(`--tw-scale-${axis}`, val), d('scale', 'var(--tw-scale-x) var(--tw-scale-y)' + (axis === 'z' ? ' var(--tw-scale-z)' : ''))];
    });
  });

  ds.functional('rotate', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [d('rotate', val)];
  });
  ['x', 'y', 'z'].forEach(axis => {
    ds.functional(`rotate-${axis}`, (c) => {
      if (!c.value) return;
      const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
      const val = c.negative ? `calc(${v} * -1)` : v;
      return [K([d(`--tw-rotate-${axis}`, '0deg'), d('--tw-rotate-x', ' '), d('--tw-rotate-y', ' '), d('--tw-rotate-z', ' ')]), 
              d(`--tw-rotate-${axis}`, `rotate${axis.toUpperCase()}(${val})`), 
              d('transform', transformStr)];
    });
  });

  ds.functional('translate', (c) => {
    if (!c.value) return;
    const v = resolveSpacing(c.value.value, c.negative);
    return [tpl(), d('--tw-translate-x', v), d('--tw-translate-y', v), d('translate', 'var(--tw-translate-x) var(--tw-translate-y)')];
  });
  ['x', 'y', 'z'].forEach(axis => {
    ds.functional(`translate-${axis}`, (c) => {
      if (!c.value) return;
      const v = resolveSpacing(c.value.value, c.negative);
      return [tpl(), d(`--tw-translate-${axis}`, v), 
              d('translate', axis === 'z' ? 'var(--tw-translate-x) var(--tw-translate-y) var(--tw-translate-z)' : 'var(--tw-translate-x) var(--tw-translate-y)')];
    });
  });

  ds.functional('skew-x', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [K([d('--tw-skew-x', '0deg'), d('--tw-skew-y', '0deg')]), d('--tw-skew-x', `skewX(${val})`), d('transform', transformStr)];
  });
  ds.functional('skew-y', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}deg` : c.value.value;
    const val = c.negative ? `calc(${v} * -1)` : v;
    return [K([d('--tw-skew-x', '0deg'), d('--tw-skew-y', '0deg')]), d('--tw-skew-y', `skewY(${val})`), d('transform', transformStr)];
  });

  // ═══════════════════════════════════════════════════════
  // 19. FILTERS & BACKDROP FILTERS (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  const filterVars = () => K([
    d('--tw-blur', ' '), d('--tw-brightness', ' '), d('--tw-contrast', ' '),
    d('--tw-grayscale', ' '), d('--tw-hue-rotate', ' '), d('--tw-invert', ' '),
    d('--tw-saturate', ' '), d('--tw-sepia', ' '), d('--tw-drop-shadow', ' ')
  ]);
  const filterStr = 'var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)';

  ds.functional('filter', (c) => {
    if (!c.value) return [filterVars(), d('filter', filterStr)];
    if (c.value.value === 'none') return [d('filter', 'none')];
  });

  const filters: Record<string, string> = {
    blur: '--tw-blur', brightness: '--tw-brightness', contrast: '--tw-contrast',
    grayscale: '--tw-grayscale', 'hue-rotate': '--tw-hue-rotate', invert: '--tw-invert',
    saturate: '--tw-saturate', sepia: '--tw-sepia'
  };

  for (const [root, varName] of Object.entries(filters)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      let val = c.value.value;
      if (root === 'blur') val = /^\d/.test(val) ? resolveSpacing(val) : resolveThemeValue('blur', val);
      else if (root === 'hue-rotate') val = /^\d+$/.test(val) ? `${val}deg` : val;
      else if (/^\d+$/.test(val)) val = `${val}%`;
      else val = resolveThemeValue(root, val);

      const res = `${root}(${c.negative ? `calc(${val} * -1)` : val})`;
      return [filterVars(), d(varName, res), d('filter', filterStr)];
    });
  }

  // Backdrop Filters
  const backdropVars = () => K([
    d('--tw-backdrop-blur', ' '), d('--tw-backdrop-brightness', ' '), d('--tw-backdrop-contrast', ' '),
    d('--tw-backdrop-grayscale', ' '), d('--tw-backdrop-hue-rotate', ' '), d('--tw-backdrop-invert', ' '),
    d('--tw-backdrop-opacity', ' '), d('--tw-backdrop-saturate', ' '), d('--tw-backdrop-sepia', ' ')
  ]);

  const backdropStr = 'var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)';

  ds.functional('backdrop-filter', (c) => {
    if (!c.value) return [backdropVars(), d('-webkit-backdrop-filter', backdropStr), d('backdrop-filter', backdropStr)];
    if (c.value.value === 'none') return [d('-webkit-backdrop-filter', 'none'), d('backdrop-filter', 'none')];
  });

  for (const [root] of Object.entries(filters)) {
    ds.functional(`backdrop-${root}`, (c) => {
      if (!c.value) return;
      let val = c.value.value;
      if (root === 'blur') val = /^\d/.test(val) ? resolveSpacing(val) : resolveThemeValue('blur', val);
      else if (root === 'hue-rotate') val = /^\d+$/.test(val) ? `${val}deg` : val;
      else if (/^\d+$/.test(val)) val = `${val}%`;
      else val = resolveThemeValue(root, val);

      const res = `${root}(${c.negative ? `calc(${val} * -1)` : val})`;
      return [backdropVars(), d(`--tw-backdrop-${root}`, res), d('-webkit-backdrop-filter', backdropStr), d('backdrop-filter', backdropStr)];
    });
  }
  ds.functional('backdrop-opacity', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}%` : c.value.value;
    return [backdropVars(), d('--tw-backdrop-opacity', `opacity(${v})`), d('-webkit-backdrop-filter', backdropStr), d('backdrop-filter', backdropStr)];
  });

  // Masks
  ds.functional('mask', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    return [
      d('mask-image', v.startsWith('url') ? v : `url(${v})`),
      d('-webkit-mask-image', v.startsWith('url') ? v : `url(${v})`)
    ];
  });
  // ═══════════════════════════════════════════════════════
  // 19. TRANSITIONS & ANIMATIONS (Consolidated)
  // ═══════════════════════════════════════════════════════
  ds.functional('transition', (c) => {
    const prop = c.value?.value || 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter';
    const v = prop === 'none' ? 'none' : (prop === 'all' ? 'all' : (prop === 'colors' ? 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke' : (prop === 'shadow' ? 'box-shadow' : (prop === 'transform' ? 'transform, translate, scale, rotate' : prop))));
    
    return [
      d('transition-property', v),
      d('transition-timing-function', 'var(--tw-ease, ease)'),
      d('transition-duration', 'var(--tw-duration, 150ms)'),
    ];
  });
  ds.functional('duration', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}ms` : c.value.value;
    return [d('--tw-duration', v), d('transition-duration', v), d('animation-duration', v)];
  });
  ds.functional('delay', (c) => {
    if (!c.value) return;
    const v = /^\d+$/.test(c.value.value) ? `${c.value.value}ms` : c.value.value;
    return [d('transition-delay', v), d('animation-delay', v)];
  });
  ds.functional('ease', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    return [d('--tw-ease', v), d('transition-timing-function', v), d('animation-timing-function', v)];
  });
  ds.functional('animate', (c) => {
    if (!c.value) return;
    if (c.value.value === 'none') return [d('animation', 'none')];
    const v = c.value.value;
    const val = v.startsWith('[') ? v.slice(1, -1).replace(/_/g, ' ') : `var(--animate-${v}, ${v})`;
    return [d('animation', val)];
  });

  // ═══════════════════════════════════════════════════════
  // 20. GRID & LAYOUT
  // ═══════════════════════════════════════════════════════
  ds.functional('grid-cols', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'none') return [d('grid-template-columns', 'none')];
    if (v === 'subgrid') return [d('grid-template-columns', 'subgrid')];
    if (/^\d+$/.test(v)) return [d('grid-template-columns', `repeat(${v}, minmax(0, 1fr))`)];
    return [d('grid-template-columns', v)];
  });
  ds.functional('grid-rows', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'none') return [d('grid-template-rows', 'none')];
    if (v === 'subgrid') return [d('grid-template-rows', 'subgrid')];
    if (/^\d+$/.test(v)) return [d('grid-template-rows', `repeat(${v}, minmax(0, 1fr))`)];
    return [d('grid-template-rows', v)];
  });
  ds.functional('col-span', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'full') return [d('grid-column', '1 / -1')];
    return [d('grid-column', `span ${v} / span ${v}`)];
  });
  ds.functional('row-span', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'full') return [d('grid-row', '1 / -1')];
    return [d('grid-row', `span ${v} / span ${v}`)];
  });

  // aspect-ratio with fraction support
  ds.functional('aspect', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'auto') return [d('aspect-ratio', 'auto')];
    if (v === 'square') return [d('aspect-ratio', '1 / 1')];
    if (v === 'video') return [d('aspect-ratio', '16 / 9')];
    return [d('aspect-ratio', v)];
  });

  // ═══════════════════════════════════════════════════════
  // 21. CURSORS & POINTER EVENTS
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['pointer-events-none', [['pointer-events', 'none']]],
    ['pointer-events-auto', [['pointer-events', 'auto']]],
  ]);
  const cursors = ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text', 'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 'zoom-in', 'zoom-out'];
  cursors.forEach(v => ds.static(`cursor-${v}`, () => [d('cursor', v)]));

  // Insets




  // Additional Insets (Logical Properties)
  const insets: Record<string, string[]> = {
    'inset-inline': ['inset-inline-start', 'inset-inline-end'],
    'inset-block': ['inset-block-start', 'inset-block-end'],
    'inset-is': ['inset-inline-start'],
    'inset-ie': ['inset-inline-end'],
    'inset-bs': ['inset-block-start'],
    'inset-be': ['inset-block-end'],
  };
  Object.entries(insets).forEach(([root, props]) => {
    ds.functional(root, (c) => {
      if (!c.value) return;
      const val = resolveSpacing(c.value.value, c.negative);
      return props.map(p => d(p, val));
    });
  });

  // ═══════════════════════════════════════════════════════
  // 24. SCROLL SPACING
  // ═══════════════════════════════════════════════════════
  const scrollSpacing: Record<string, string> = {
    'scroll-m': 'scroll-margin', 'scroll-mx': 'scroll-margin-inline', 'scroll-my': 'scroll-margin-block',
    'scroll-mt': 'scroll-margin-top', 'scroll-mr': 'scroll-margin-right',
    'scroll-mb': 'scroll-margin-bottom', 'scroll-ml': 'scroll-margin-left',
    'scroll-p': 'scroll-padding', 'scroll-px': 'scroll-padding-inline', 'scroll-py': 'scroll-padding-block',
    'scroll-pt': 'scroll-padding-top', 'scroll-pr': 'scroll-padding-right',
    'scroll-pb': 'scroll-padding-bottom', 'scroll-pl': 'scroll-padding-left',
  };
  for (const [root, prop] of Object.entries(scrollSpacing)) {
    ds.functional(root, (c) => {
      if (!c.value) return;
      return [d(prop, resolveSpacing(c.value.value, c.negative))];
    });
  }

  // ═══════════════════════════════════════════════════════
  // 23. MISC & SNAP (OFFICIAL v4 PARITY)
  // ═══════════════════════════════════════════════════════
  statics(ds, [
    ['snap-x', [['scroll-snap-type', 'x var(--tw-scroll-snap-strictness, proximity)']]],
    ['snap-y', [['scroll-snap-type', 'y var(--tw-scroll-snap-strictness, proximity)']]],
    ['snap-mandatory', [['--tw-scroll-snap-strictness', 'mandatory']]],
    ['snap-proximity', [['--tw-scroll-snap-strictness', 'proximity']]],
  ]);

  ds.functional('scroll-m', (c) => {
    if (!c.value) return;
    return [d('scroll-margin', resolveSpacing(c.value.value, c.negative))];
  });
  ds.functional('scroll-p', (c) => {
    if (!c.value) return;
    return [d('scroll-padding', resolveSpacing(c.value.value))];
  });

  ds.functional('bg-linear', (c) => {
    if (c.value?.kind === 'named') {
      return [{ kind: 'declaration', property: 'background-image', value: `linear-gradient(${c.value.value}, var(--tw-gradient-stops))` }];
    }
  });

  ds.functional('from', (c) => {
    if (c.value?.kind === 'named') {
      const color = resolveColor(c.value, c.modifier);
      return [
        { kind: 'declaration', property: '--tw-gradient-from', value: color },
        { kind: 'declaration', property: '--tw-gradient-stops', value: `var(--tw-gradient-from), var(--tw-gradient-to, transparent)` }
      ];
    }
  });

  ds.functional('mask', (c) => {
    if (c.value?.kind === 'named') {
      return [
        { kind: 'declaration', property: 'mask-image', value: c.value.value },
        { kind: 'declaration', property: '-webkit-mask-image', value: c.value.value }
      ];
    }
  });

  ds.functional('outline', (c) => {
    if (!c.value) return;
    const v = c.value.value;
    if (v === 'none') return [d('outline', 'none')];
    const color = resolveColor(c.value, c.modifier);
    if (color && !/^\d/.test(v)) {
      return [d('--tw-outline-color', color), d('outline', 'var(--tw-outline-style, solid) var(--tw-outline-width, 1px) var(--tw-outline-color, currentColor)')];
    }
    return [d('--tw-outline-width', resolveSpacing(v)), d('outline', 'var(--tw-outline-style, solid) var(--tw-outline-width, 1px) var(--tw-outline-color, currentColor)')];
  });
}

// ═══════════════════════════════════════════════════════
// 25. COMPOSITING @PROPERTY REGISTRATIONS
// ═══════════════════════════════════════════════════════
const COMPOSITING_VARS = [
  { name: '--tw-blur', initial: ' ', syntax: '*' },
  { name: '--tw-brightness', initial: ' ', syntax: '*' },
  { name: '--tw-contrast', initial: ' ', syntax: '*' },
  { name: '--tw-grayscale', initial: ' ', syntax: '*' },
  { name: '--tw-hue-rotate', initial: ' ', syntax: '*' },
  { name: '--tw-invert', initial: ' ', syntax: '*' },
  { name: '--tw-saturate', initial: ' ', syntax: '*' },
  { name: '--tw-sepia', initial: ' ', syntax: '*' },
  { name: '--tw-drop-shadow', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-blur', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-brightness', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-contrast', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-grayscale', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-hue-rotate', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-invert', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-opacity', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-saturate', initial: ' ', syntax: '*' },
  { name: '--tw-backdrop-sepia', initial: ' ', syntax: '*' },
  { name: '--tw-scale-x', initial: '1', syntax: '<number>' },
  { name: '--tw-scale-y', initial: '1', syntax: '<number>' },
  { name: '--tw-scale-z', initial: '1', syntax: '<number>' },
  { name: '--tw-rotate-x', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-rotate-y', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-rotate-z', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-translate-x', initial: '0', syntax: '*' },
  { name: '--tw-translate-y', initial: '0', syntax: '*' },
  { name: '--tw-translate-z', initial: '0', syntax: '*' },
  { name: '--tw-skew-x', initial: '0deg', syntax: '<angle>' },
  { name: '--tw-skew-y', initial: '0deg', syntax: '<angle>' },
];

function registerCompositingProperties() {
  let css = '';
  for (const v of COMPOSITING_VARS) {
    css += `@property ${v.name} { syntax: "${v.syntax}"; inherits: false; initial-value: ${v.initial}; }\n`;
  }
  return css;
}


// ============================================================================
// 4. STYLESHEET MANAGER (DOM Injection)
// ============================================================================


class StyleSheetManager {
  private _adoptedSheets: Map<string, CSSStyleSheet> = new Map();
  private _jitSheet: CSSStyleSheet | null = null;
  private _knownClasses: Set<string> = new Set();
  private _nextId = 0;
  private _preflightEmitted = false;

  private _getJitSheet(): CSSStyleSheet {
    if (!this._jitSheet) {
      if ('CSSStyleSheet' in globalThis) {
        this._jitSheet = new CSSStyleSheet();
        if ('document' in globalThis) {
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, this._jitSheet];
        }
      } else {
        // Fallback for extremely niche environments if necessary, but Nexus-UX mandates modern APIs
        throw new Error("Nexus-UX: CSSStyleSheet (AdoptedStyleSheets) is required for JIT.");
      }
    }
    return this._jitSheet;
  }

  emitPreflightAndTheme(): void {
    if (this._preflightEmitted) return;
    
    // 1. Base Framework Styles (Preflight)
    this.adoptCSSSync(PREFLIGHT_CSS, 'nexus-preflight');
    
    // 2. Framework Keyframes (Animations)
    this.adoptCSSSync(KEYFRAMES_CSS, 'nexus-keyframes');

    // 3. Theme Orchestration
    const rootTheme = THEME_CSS.replace(/^@theme\s+default\s*\{/, ':root {');
    const compositingCSS = registerCompositingProperties();
    this.adoptCSSSync(rootTheme + '\n' + compositingCSS, 'nexus-theme');

    this._preflightEmitted = true;
  }

  /**
   * Synchronous adoption for immediate framework boot.
   */
  adoptCSSSync(cssText: string, id?: string): () => void {
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    
    if (existing) {
      existing.replaceSync(cssText);
      return () => this.removeSheet(sheetId);
    }

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    this._adoptedSheets.set(sheetId, sheet);
    
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  async adoptCSS(cssText: string, id?: string): Promise<() => void> {
    const sheetId = id || `_auto_${this._nextId++}`;
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(cssText);
      return () => this.removeSheet(sheetId);
    }

    const sheet = new CSSStyleSheet();
    await sheet.replace(cssText);
    this._adoptedSheets.set(sheetId, sheet);
    if ('document' in globalThis) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    return () => this.removeSheet(sheetId);
  }

  adoptClass(className: string, el?: HTMLElement, runtime?: RuntimeContext): void {
    if (!className || className.trim() === '') return;
    if (this._knownClasses.has(className)) return;

    try {
      this._knownClasses.add(className);
      const candidates = Array.from(designSystem.parseCandidate(className));
      for (const candidate of candidates) {
        const cssRules = designSystem.generateCSS(candidate);
        if (cssRules) {
          const sheet = this._getJitSheet();
          sheet.insertRule(cssRules, sheet.cssRules.length);

          if (candidate.hasSignal && el && runtime) {
            this.adoptSignalBinding(el, candidate.hasSignal, runtime);
          }
        }
      }
    } catch (err) {
      console.warn(`Nexus-UX: Failed to JIT compile class "${className}":`, err);
    }
  }

  adoptSignalBinding(el: HTMLElement, signalName: string, runtime: RuntimeContext) {
    if (!el.hasAttribute('data-class')) {
       const currentBindings = (el as HTMLElement & { _signalBindings?: string[] })._signalBindings || [];
       if (!currentBindings.includes(signalName)) {
           currentBindings.push(signalName);
           (el as HTMLElement & { _signalBindings?: string[] })._signalBindings = currentBindings;
           
           runtime.effect(() => {
              const val = runtime.evaluate(el, signalName);
              el.style.setProperty(`--nx-${signalName}`, String(val !== undefined ? val : ''));
           });
       }
    }
  }

  ensureRule(className: string, cssText: string): void {
    if (this._knownClasses.has(className)) return;
    const sheet = this._getJitSheet();
    try {
      sheet.insertRule(cssText, sheet.cssRules.length);
      this._knownClasses.add(className);
    } catch (_e) {
      /* ignore */
    }
  }

  collectRules(): string {
    const sheets: string[] = [];
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) rules.push(rule.cssText);
      } catch (_e) {
      /* ignore */
    }
      if (rules.length) sheets.push(rules.join('\n'));
    });

    if (this._jitSheet) {
      const rules: string[] = [];
      try {
        for (const rule of this._jitSheet.cssRules) rules.push(rule.cssText);
      } catch (_e) {
      /* ignore */
    }
      if (rules.length) sheets.push(rules.join('\n'));
    }
    return sheets.join('\n\n');
  }

  removeSheet(id: string): void {
    const sheet = this._adoptedSheets.get(id);
    if (!sheet) return;
    if ('document' in globalThis) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
    }
    this._adoptedSheets.delete(id);
  }

  dispose(): void {
    this._adoptedSheets.forEach((_sheet, id) => this.removeSheet(id));
    this._adoptedSheets.clear();
    if (this._jitSheet && 'document' in globalThis) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== this._jitSheet);
      this._jitSheet = null;
    }
    this._knownClasses.clear();
    this._nextId = 0;
  }
}




// ============================================================================
// 5. INITIALIZATION & EXPORTS
// ============================================================================

export const designSystem = new DesignSystem();

populateStandardUtilities(designSystem);
populateStandardVariants(designSystem);


export function populateStandardVariants(ds: DesignSystem) {
  // ═══════════════════════════════════════════════════════
  // PHASE 2 ADDITIONS (48 MISSING VARIANTS)
  // ═══════════════════════════════════════════════════════

  // 2A. Pseudo-classes
  const pseudos = [
    'enabled', 'indeterminate', 'default', 'required', 'valid', 'invalid',
    'in-range', 'out-of-range', 'placeholder-shown', 'autofill', 'read-only',
    'open', 'empty', 'target', 'even', 'odd', 'first', 'last', 'only',
    'first-of-type', 'last-of-type', 'only-of-type', 'popover-open', 'inert',
    'starting'
  ];
  
  pseudos.forEach(p => ds.variant(p, (_c) => [])); // The serializeAST handles pseudo generation for static variants
  
  // NOTE: Our JIT engine serialization handles mapping these strings to actual pseudo-selectors. 
  // We just need to register them so the parser doesn't reject them as invalid.

  // 2B. Parametric Variants
  const parametric = ['nth', 'nth-of-type', 'nth-last-of-type', 'has', 'not', 'is', 'where'];
  parametric.forEach(p => {
    ds.functional(p, (_c) => []); // Registered as functional roots but in variant context
  });

  // 2D. Accessibility
  ds.variant('contrast-more', (_c) => []); 
  ds.variant('contrast-less', (_c) => []);
  ds.variant('forced-colors', (_c) => []);

  // 2E. Misc
  ds.variant('file', (_c) => []);
  ds.variant('backdrop', (_c) => []);
  ds.variant('screen', (_c) => []);
  ds.variant('any', (_c) => []);
  ds.variant('aria', (_c) => []);
  ds.variant('data', (_c) => []);
  ds.variant('supports', (_c) => []);
  ds.variant('container', (_c) => []);
  ds.variant('min', (_c) => []);
  ds.variant('max', (_c) => []);
  
  // Update: 'group' and 'peer' compound variants
  ds.variant('group', (_c) => []);
  ds.variant('peer', (_c) => []);
}

export const stylesheet = new StyleSheetManager();

