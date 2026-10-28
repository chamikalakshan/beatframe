// Signal processing for the basic analyzer: spectral flux, tempo, beat tracking, peaks and hits.
// The beat tracker follows Ellis (2007), "Beat Tracking by Dynamic Programming", as librosa does.

export const SR = 22050;
export const HOP = 512;
export const NFFT = 2048;
export const FPS = SR / HOP;

const tables = new Map();
function twiddles(n) {
  if (!tables.has(n)) {
    const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k++) { cos[k] = Math.cos(-2 * Math.PI * k / n); sin[k] = Math.sin(-2 * Math.PI * k / n); }
    tables.set(n, { cos, sin });
  }
  return tables.get(n);
}

// In-place radix-2 FFT; n must be a power of two.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  const { cos, sin } = twiddles(n);
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step], wi = sin[k * step], a = i + k, b = a + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
}

// Per-frame features, frames centred on i * HOP:
// flux = full-band log spectral flux, low = flux below 150 Hz (kick-ish), db = frame loudness.
// The low band uses much gentler log compression: strong compression would magnify the faint
// low-frequency leftovers of hi-hats and snares until they look like kicks.
export function features(y) {
  const n = Math.floor(y.length / HOP) + 1, half = NFFT / 2, bins = half + 1;
  const win = new Float64Array(NFFT);
  for (let k = 0; k < NFFT; k++) win[k] = 0.5 - 0.5 * Math.cos(2 * Math.PI * k / NFFT);
  const binHz = SR / NFFT;
  const maxBin = Math.min(half, Math.round(11000 / binHz)), lowBin = Math.max(2, Math.round(150 / binHz));
  const flux = new Float32Array(n), low = new Float32Array(n), db = new Float32Array(n);
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  let prev = new Float64Array(bins), cur = new Float64Array(bins);
  let prevLow = new Float64Array(lowBin + 1), curLow = new Float64Array(lowBin + 1);
  for (let i = 0; i < n; i++) {
    const start = i * HOP - half;
    let sq = 0;
    for (let k = 0; k < NFFT; k++) {
      const s = y[start + k] ?? 0;
      sq += s * s; re[k] = s * win[k]; im[k] = 0;
    }
    db[i] = 20 * Math.log10(Math.max(Math.sqrt(sq / NFFT), 1e-5));
    fft(re, im);
    for (let b = 1; b <= maxBin; b++) {
      const m = Math.hypot(re[b], im[b]) / (NFFT / 4);
      cur[b] = Math.log1p(1000 * m);
      if (b <= lowBin) curLow[b] = Math.log1p(10 * m);
    }
    if (i > 0) {
      let f = 0, l = 0;
      for (let b = 1; b <= maxBin; b++) { const d = cur[b] - prev[b]; if (d > 0) f += d; }
      for (let b = 1; b <= lowBin; b++) { const d = curLow[b] - prevLow[b]; if (d > 0) l += d; }
      flux[i] = f / maxBin; low[i] = l / lowBin;
    }
    [prev, cur] = [cur, prev];
    [prevLow, curLow] = [curLow, prevLow];
  }
  return { flux, low, db };
}

function prefix(x) {
  const p = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) p[i + 1] = p[i] + x[i];
  return p;
}
const meanOf = (p, a, b) => (p[b] - p[a]) / Math.max(1, b - a); // mean of x[a, b)

// Onset strength: flux minus its local mean, positive part, scaled to unit standard deviation.
export function onsetEnvelope(flux, radius = Math.round(0.25 * FPS)) {
  const n = flux.length, p = prefix(flux), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(0, flux[i] - meanOf(p, Math.max(0, i - radius), Math.min(n, i + radius + 1)));
  return normalizeStd(out);
}

export function normalizeStd(x) {
  let m = 0;
  for (const v of x) m += v;
  m /= x.length || 1;
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  s = Math.sqrt(s / (x.length || 1));
  return s > 0 ? x.map(v => v / s) : x;
}

// Global tempo from autocorrelation of the onset envelope, weighted towards `center` BPM
// (log-normal prior, one octave wide). Envelopes are blurred because onset peaks are one frame
// wide, and the winning lag is refined by parabolic interpolation, since a beat period rarely
// falls on a whole number of frames.
// Octave check against the low band (kicks, bass), which usually marks the beat itself:
// - eighth-note hi-hats can make full-band onsets look twice as fast, so if the low band barely
//   repeats at the chosen period but strongly at double it (and the full mix is undecided), the slower tempo wins;
// - a snare on 2 and 4 makes full-band onsets repeat most strongly every two beats, so if the low
//   band also repeats strongly at half the period, the faster tempo wins.
export function estimateTempo(env, lowEnv, { min = 60, max = 200, center = 120 } = {}) {
  const [full, low] = [env, lowEnv].map(x => { const b = blur(x, 2); let m = 0; for (const v of b) m += v; m /= b.length || 1; return b.map(v => v - m); });
  const lagMin = Math.max(2, Math.floor(FPS * 60 / max)), lagMax = Math.ceil(FPS * 60 / min);
  const acF = autocorr(full, 2 * lagMax + 4), acL = autocorr(low, 2 * lagMax + 4);
  const score = lag => acF[lag] * Math.exp(-0.5 * Math.log2(60 * FPS / lag / center) ** 2);
  let best = lagMin;
  for (let lag = lagMin; lag <= lagMax; lag++) if (score(lag) > score(best)) best = lag;
  let lag = refine(acF, best);
  const peakNear = target => {
    let k = Math.max(lagMin, Math.floor(target) - 1);
    for (let j = k; j <= Math.ceil(target) + 1 && j < acL.length - 1; j++) if (acL[j] > acL[k]) k = j;
    return k;
  };
  const here = Math.max(0, acL[Math.round(lag)]);
  if (2 * lag <= lagMax) {
    const k = peakNear(2 * lag);
    // Only when the full mix doesn't clearly prefer the faster tempo: in half-time grooves the kick
    // lands on every other beat, so the low band alone would halve a song the mix plays at full speed.
    if (acL[k] > 2 * here && acF[k] >= 0.8 * acF[Math.round(lag)]) return 60 * FPS / refine(acL, k);
  }
  if (lag / 2 >= lagMin) {
    const k = peakNear(lag / 2);
    if (acL[k] >= 0.5 * here && here > 0) lag = refine(acL, k);
  }
  return 60 * FPS / lag;
}

function autocorr(x, maxLag) {
  const n = x.length, ac = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag && lag < n; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += x[i] * x[i + lag];
    ac[lag] = s / (n - lag);
  }
  return ac;
}

// Peak position between whole lags, from a parabola through the peak and its neighbours.
function refine(ac, k) {
  const a = ac[k - 1] ?? ac[k], b = ac[k], c = ac[k + 1] ?? ac[k], d = a - 2 * b + c;
  return d < 0 ? k + Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / d)) : k;
}

function blur(x, sigma) {
  const r = Math.ceil(3 * sigma), w = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-0.5 * (k / sigma) ** 2));
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += (x[i + k] ?? 0) * w[k + r];
    out[i] = s;
  }
  return out;
}

// Dynamic-programming beat tracker. Returns beat positions in frames.
// Tightness is higher than librosa's 100: most songs for these videos hold a steady tempo, and a
// stiff grid stops quiet intros from locking onto offbeat hi-hats.
export function trackBeats(env, bpm, tightness = 400) {
  const n = env.length, period = 60 * FPS / bpm;
  const half = Math.round(period), w = [];
  for (let k = -half; k <= half; k++) w.push(Math.exp(-0.5 * (k * 32 / period) ** 2));
  const local = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -half; k <= half; k++) { const j = i + k; if (j >= 0 && j < n) s += env[j] * w[k + half]; }
    local[i] = s;
  }
  const maxLocal = Math.max(...local), cum = new Float64Array(n), back = new Int32Array(n).fill(-1);
  const far = Math.round(2 * period), near = Math.max(1, Math.round(period / 2));
  let started = false;
  for (let i = 0; i < n; i++) {
    let best = -Infinity, arg = -1;
    for (let p = Math.max(0, i - far); p <= i - near; p++) {
      const s = cum[p] - tightness * Math.log((i - p) / period) ** 2;
      if (s > best) { best = s; arg = p; }
    }
    if (started && arg >= 0) { cum[i] = local[i] + best; back[i] = arg; } else cum[i] = local[i];
    if (!started && local[i] > 0.01 * maxLocal) started = true;
  }
  // Last beat: the last local maximum of the cumulative score above half the median of all maxima.
  const peaks = [];
  for (let i = 1; i < n - 1; i++) if (cum[i] > cum[i - 1] && cum[i] >= cum[i + 1]) peaks.push(i);
  if (!peaks.length) return [];
  const sorted = peaks.map(i => cum[i]).sort((a, b) => a - b), median = sorted[sorted.length >> 1];
  let last = peaks[peaks.length - 1];
  for (let k = peaks.length - 1; k >= 0; k--) if (cum[peaks[k]] >= 0.5 * median) { last = peaks[k]; break; }
  const beats = [];
  for (let i = last; i >= 0; i = back[i]) beats.unshift(i);
  return beats;
}

// Drop beats at the start and end that sit in silence (more than 45 dB below the loudest part).
// Unlike librosa's trim this keeps quiet intros and outros, which still need beats to sync to.
export function trimSilentBeats(beats, db) {
  let top = -Infinity;
  for (const v of db) top = Math.max(top, v);
  const loudAround = f => { let m = -Infinity; for (let k = -4; k <= 4; k++) m = Math.max(m, db[f + k] ?? -Infinity); return m; };
  let a = 0, b = beats.length;
  while (a < b && loudAround(beats[a]) < top - 45) a++;
  while (b > a && loudAround(beats[b - 1]) < top - 45) b--;
  return beats.slice(a, b);
}

// Which beat of the bar is "1": the phase whose beats carry the most low-end attack (kicks and
// bass notes tend to land on the one; full-band onsets would pick the snare on 2 and 4 instead).
// This is a guess; analyze.mjs --first-bar overrides it.
export function downbeatPhase(beats, low, meter) {
  const at = (x, f) => { let m = 0; for (let k = -2; k <= 2; k++) m = Math.max(m, x[f + k] ?? 0); return m; };
  let best = 0, bestScore = -Infinity;
  for (let phase = 0; phase < meter; phase++) {
    let s = 0, c = 0;
    for (let i = phase; i < beats.length; i += meter) { s += at(low, beats[i]); c++; }
    if (c && s / c > bestScore) { bestScore = s / c; best = phase; }
  }
  return best;
}

// Local maxima that rise `delta` above the surrounding mean, at least `wait` frames apart.
export function pickPeaks(x, { pre = 3, post = 3, avg = 10, delta = 0.5, wait = 3 } = {}) {
  const n = x.length, p = prefix(x), out = [];
  let last = -Infinity;
  for (let i = 0; i < n; i++) {
    let isMax = true;
    for (let k = Math.max(0, i - pre); k <= Math.min(n - 1, i + post); k++) if (x[k] > x[i]) { isMax = false; break; }
    if (!isMax || x[i] <= 0) continue;
    if (x[i] < meanOf(p, Math.max(0, i - avg), Math.min(n, i + avg + 1)) + delta) continue;
    if (i - last <= wait) continue;
    out.push(i); last = i;
  }
  return out;
}

// Big loudness rises (drops, choruses kicking in): mean dB over the next second minus the previous second.
export function findHits(db, beatTimes, duration, { max, minGap = 4, minRise = 3 } = {}) {
  max ??= Math.min(12, Math.max(3, Math.round(duration / 20)));
  const n = db.length, w = Math.round(FPS), floor = db.map(v => Math.max(v, -50)), p = prefix(floor);
  const rise = new Float64Array(n);
  for (let i = Math.round(w / 2); i < n - Math.round(w / 2); i++) {
    rise[i] = meanOf(p, i, Math.min(n, i + w)) - meanOf(p, Math.max(0, i - w), i);
  }
  const cands = [];
  // The jump out of silence at the very start is not a hit; `start` already covers it.
  for (let i = Math.round(1.5 * FPS); i < n - 1; i++) {
    if (rise[i] < minRise) continue;
    let isMax = true;
    for (let k = Math.max(0, i - w); k <= Math.min(n - 1, i + w); k++) if (rise[k] > rise[i]) { isMax = false; break; }
    if (isMax) cands.push(i);
  }
  cands.sort((a, b) => rise[b] - rise[a]);
  const picked = [];
  for (const i of cands) {
    const t = i / FPS;
    if (picked.every(h => Math.abs(h.t - t) >= minGap)) picked.push({ t, strength: rise[i] });
    if (picked.length === max) break;
  }
  for (const h of picked) {
    const near = nearest(beatTimes, h.t);
    if (near !== null && Math.abs(near - h.t) < 0.2) h.t = near;
  }
  return picked.sort((a, b) => a.t - b.t);
}

function nearest(sorted, t) {
  let best = null;
  for (const v of sorted) if (best === null || Math.abs(v - t) < Math.abs(best - t)) best = v;
  return best;
}

// 0..1 loudness curve at `rate` values per second (10th percentile of non-silent frames maps to 0).
export function energyCurve(db, duration, rate = 10) {
  const loud = Array.from(db).filter(v => v > -70).sort((a, b) => a - b);
  const lo = loud.length ? loud[Math.floor(loud.length * 0.1)] : -70, hi = loud.length ? loud[loud.length - 1] : 0;
  const count = Math.ceil(duration * rate), values = [];
  for (let k = 0; k < count; k++) {
    const a = Math.floor(k / rate * FPS), b = Math.max(a + 1, Math.floor((k + 1) / rate * FPS));
    let s = 0, c = 0;
    for (let i = a; i < b && i < db.length; i++) { s += db[i]; c++; }
    const v = c ? (s / c - lo) / Math.max(1e-6, hi - lo) : 0;
    values.push(Math.round(Math.min(1, Math.max(0, v)) * 100) / 100);
  }
  return values;
}
