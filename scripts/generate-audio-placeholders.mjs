import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve("public", "audio");

const files = [
  { name: "music/segadors.wav", freq: 392, duration: 0.8 },
  { name: "music/santa-espina.wav", freq: 330, duration: 0.8 },
  { name: "music/estaca.wav", freq: 262, duration: 0.8 },
  { name: "music/flabiol.wav", freq: 494, duration: 0.8 },
  { name: "music/rumba.wav", freq: 370, duration: 0.8 },
  { name: "sfx/click-1.wav", freq: 880, duration: 0.12 },
  { name: "sfx/click-2.wav", freq: 988, duration: 0.12 },
  { name: "sfx/click-3.wav", freq: 1046, duration: 0.12 },
  { name: "sfx/submit-1.wav", freq: 740, duration: 0.16 },
  { name: "sfx/submit-2.wav", freq: 784, duration: 0.16 },
  { name: "sfx/correct-1.wav", freq: 640, duration: 0.18 },
  { name: "sfx/correct-2.wav", freq: 720, duration: 0.18 },
  { name: "sfx/repeat-1.wav", freq: 240, duration: 0.16 },
  { name: "sfx/repeat-2.wav", freq: 200, duration: 0.16 },
  { name: "sfx/neutral-1.wav", freq: 420, duration: 0.14 },
  { name: "sfx/neutral-2.wav", freq: 460, duration: 0.14 },
  { name: "sfx/error-1.wav", freq: 180, duration: 0.2 },
  { name: "sfx/error-2.wav", freq: 140, duration: 0.2 },
  { name: "sfx/win-1.wav", freq: 660, duration: 0.24 },
  { name: "sfx/win-2.wav", freq: 784, duration: 0.24 },
  { name: "sfx/countdown-1.wav", freq: 520, duration: 0.1 },
  { name: "sfx/countdown-2.wav", freq: 580, duration: 0.1 },
  { name: "sfx/countdown-3.wav", freq: 640, duration: 0.1 },
  { name: "sfx/toggle-1.wav", freq: 460, duration: 0.12 },
  { name: "sfx/toggle-2.wav", freq: 520, duration: 0.12 },
  { name: "sfx/open-1.wav", freq: 500, duration: 0.15 },
  { name: "sfx/open-2.wav", freq: 560, duration: 0.15 },
  { name: "sfx/close-1.wav", freq: 360, duration: 0.15 },
  { name: "sfx/close-2.wav", freq: 320, duration: 0.15 },
  { name: "sfx/powerup-1.wav", freq: 900, duration: 0.2 },
  { name: "sfx/powerup-2.wav", freq: 1040, duration: 0.2 }
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeWav({ filePath, freq, duration }) {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * duration);
  const amplitude = 0.3;
  const data = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * amplitude;
    const int16 = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    data.writeInt16LE(int16, i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  const out = Buffer.concat([header, data]);
  fs.writeFileSync(filePath, out);
}

files.forEach((entry) => {
  const filePath = path.join(OUTPUT_DIR, entry.name);
  ensureDir(filePath);
  writeWav({ filePath, freq: entry.freq, duration: entry.duration });
});

console.log("Audio placeholders generated.");
