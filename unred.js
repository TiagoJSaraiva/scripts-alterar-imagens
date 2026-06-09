const sharp = require("sharp");

const INPUT = "./input/image.png";
const OUTPUT = "./output/image.png";

// ajuste fino
const RED_RANGE = 28;        // quanto maior, mais tons próximos do vermelho pega
const TARGET_HUE = 28;       // matiz puxada para marrom/cinza quente
const STRENGTH = 0.75;       // 0 a 1: força da alteração

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;

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

  let r = 0, g = 0, b = 0;

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

function hueDistance(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
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

    const isNearRed =
      hueDistance(hsv.h, 0) <= RED_RANGE ||
      hueDistance(hsv.h, 360) <= RED_RANGE;

    if (!isNearRed) continue;

    const distance = hueDistance(hsv.h, 0);
    const falloff = 1 - Math.min(distance / RED_RANGE, 1);
    const amount = STRENGTH * falloff;

    const newHue = lerpAngle(hsv.h, TARGET_HUE, amount);

    // mantém S e V iguais
    const rgb = hsvToRgb(newHue, hsv.s, hsv.v);

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
  }).png().toFile(OUTPUT);

  console.log(`Imagem salva em ${OUTPUT}`);
}

main().catch(console.error);