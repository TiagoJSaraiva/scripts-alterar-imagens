const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ==================== CONFIGURAÇÃO ====================
const INPUT_PATH = "./input/image.png";
const OUTPUT_PATH = "./output/sem_fundo.png";

// O quão neutro o pixel precisa ser.
// Quanto menor, mais rígido.
const MAX_CHANNEL_SPREAD = 20;

// Quão claro o pixel precisa ser para ser considerado fundo.
const MIN_LUMINANCE = 205;

// Tolerância de distância de cor para os 2 tons do checkerboard.
// Se estiver removendo pouco, aumente.
// Se estiver removendo parte do título, diminua.
const BG_COLOR_DISTANCE = 24;

// Se true, pixels quase-fundo ficam com alpha parcial,
// melhorando a borda. Se false, só remove os que baterem no critério.
const SOFT_EDGES = true;

// Tolerância extra para soft edge
const SOFT_EDGE_DISTANCE = 38;
// ======================================================

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistanceSq(r, g, b, c) {
  const dr = r - c.r;
  const dg = g - c.g;
  const db = b - c.b;
  return dr * dr + dg * dg + db * db;
}

function meanColor(samples) {
  if (samples.length === 0) {
    return { r: 240, g: 240, b: 240 };
  }

  let sr = 0, sg = 0, sb = 0;
  for (const s of samples) {
    sr += s.r;
    sg += s.g;
    sb += s.b;
  }

  return {
    r: Math.round(sr / samples.length),
    g: Math.round(sg / samples.length),
    b: Math.round(sb / samples.length),
  };
}

function isNeutral(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= MAX_CHANNEL_SPREAD;
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const { data, info } = await sharp(INPUT_PATH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error("Esperava imagem RGBA (4 canais).");
  }

  // ======================================================
  // 1) AMOSTRA DAS BORDAS PARA DESCOBRIR AS CORES DO FUNDO
  // ======================================================
  const borderSamples = [];

  function collectPixel(x, y) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) return;

    const lum = luminance(r, g, b);
    if (lum >= MIN_LUMINANCE && isNeutral(r, g, b)) {
      borderSamples.push({ r, g, b, lum });
    }
  }

  // topo e base
  for (let x = 0; x < width; x++) {
    collectPixel(x, 0);
    collectPixel(x, height - 1);
  }

  // esquerda e direita
  for (let y = 1; y < height - 1; y++) {
    collectPixel(0, y);
    collectPixel(width - 1, y);
  }

  if (borderSamples.length === 0) {
    throw new Error("Não foi possível amostrar o fundo nas bordas.");
  }

  // Divide as amostras em 2 grupos: claro e cinza-claro
  borderSamples.sort((a, b) => a.lum - b.lum);
  const midLum = borderSamples[Math.floor(borderSamples.length / 2)].lum;

  const darkGroup = borderSamples.filter(p => p.lum <= midLum);
  const lightGroup = borderSamples.filter(p => p.lum > midLum);

  const bg1 = meanColor(darkGroup);   // cinza-claro
  const bg2 = meanColor(lightGroup);  // quase branco

  console.log("Cor de fundo 1 (cinza):", bg1);
  console.log("Cor de fundo 2 (claro):", bg2);

  const hardThresholdSq = BG_COLOR_DISTANCE * BG_COLOR_DISTANCE;
  const softThresholdSq = SOFT_EDGE_DISTANCE * SOFT_EDGE_DISTANCE;

  // ======================================================
  // 2) REMOVE PIXELS QUE PARECEM COM O FUNDO
  // ======================================================
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    const lum = luminance(r, g, b);
    if (lum < MIN_LUMINANCE) continue;
    if (!isNeutral(r, g, b)) continue;

    const d1 = colorDistanceSq(r, g, b, bg1);
    const d2 = colorDistanceSq(r, g, b, bg2);
    const minDistSq = Math.min(d1, d2);

    // Match forte: vira totalmente transparente
    if (minDistSq <= hardThresholdSq) {
      data[i + 3] = 0;
      continue;
    }

    // Match aproximado: reduz alpha parcialmente (suaviza borda)
    if (SOFT_EDGES && minDistSq <= softThresholdSq) {
      const minDist = Math.sqrt(minDistSq);
      const t = (minDist - BG_COLOR_DISTANCE) / (SOFT_EDGE_DISTANCE - BG_COLOR_DISTANCE);
      const clamped = Math.max(0, Math.min(1, t));

      // Quanto mais perto do fundo, menor o alpha
      data[i + 3] = Math.round(a * clamped);
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(OUTPUT_PATH);

  console.log("Imagem salva em:", OUTPUT_PATH);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});