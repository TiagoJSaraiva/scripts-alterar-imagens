const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const inputPath = "./input/imagem.png";
const outputDir = "./output";
const outputPath = path.join(outputDir, "imagem_recolorida.png");

// Matiz desejada: 0 a 360
const TARGET_HUE = 0;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h >= 0 && h < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (h >= 60 && h < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (h >= 120 && h < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (h >= 180 && h < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

async function changeImageHue() {
  const image = sharp(inputPath).ensureAlpha();

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Mantém pixels completamente transparentes como estão
    if (a === 0) continue;

    const hsv = rgbToHsv(r, g, b);

    // Pixels sem saturação são cinza/branco/preto.
    // Neles, mudar matiz não faz diferença visual.
    if (hsv.s === 0) continue;

    const newRgb = hsvToRgb(TARGET_HUE, hsv.s, hsv.v);

    data[i] = newRgb.r;
    data[i + 1] = newRgb.g;
    data[i + 2] = newRgb.b;
    data[i + 3] = a;
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels,
    },
  })
    .png()
    .toFile(outputPath);

  console.log("Imagem gerada em:", outputPath);
}

changeImageHue().catch(console.error);