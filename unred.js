const sharp = require("sharp");

const INPUT = "./input/image.png";
const OUTPUT = "./output/output.png";

// pega vermelhos, laranjas e amarelos quentes
const WARM_HUE_MIN = 0;
const WARM_HUE_MAX = 65;

// quanto dessaturar os tons quentes
const DESATURATION = 0.65;

// opcional: puxa um pouco a matiz para marrom/frio neutro
const TARGET_HUE = 35;
const HUE_SHIFT_STRENGTH = 1;

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;

  let r, g, b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

function isWarmHue(h) {
  return h >= WARM_HUE_MIN && h <= WARM_HUE_MAX;
}

async function main() {
  const image = sharp(INPUT).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    const hsv = rgbToHsv(r, g, b);

    if (!isWarmHue(hsv.h)) continue;

    // ignora pixels quase pretos/cinza para não sujar contornos
    if (hsv.v < 0.08 || hsv.s < 0.08) continue;

    const newH = lerpAngle(hsv.h, TARGET_HUE, HUE_SHIFT_STRENGTH);

    // aqui está a "desvermelhização" real
    const newS = lerp(hsv.s, 0, DESATURATION);

    // V é preservado
    const newV = hsv.v;

    const rgb = hsvToRgb(newH, newS, newV);

    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toFile(OUTPUT);

  console.log(`Imagem salva em ${OUTPUT}`);
}

main().catch(console.error);