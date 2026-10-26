// Decodes any audio file ffmpeg can read into mono float samples.
import { spawn } from 'node:child_process';

export function decode(file, sampleRate) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', 'pipe:1']);
    const chunks = [];
    let err = '';
    ff.stdout.on('data', c => chunks.push(c));
    ff.stderr.on('data', c => { err += c; });
    ff.on('error', e => reject(e.code === 'ENOENT'
      ? new Error('ffmpeg not found. Install it first (macOS: brew install ffmpeg, Windows: winget install ffmpeg, Linux: apt install ffmpeg).')
      : e));
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg could not read ${file}: ${err.trim()}`));
      const buf = Buffer.concat(chunks);
      const usable = buf.length - (buf.length % 4);
      resolve(new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + usable)));
    });
  });
}
