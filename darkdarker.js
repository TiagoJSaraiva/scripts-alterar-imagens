const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ==================== CONFIGURAÇÃO ====================
const INPUT_PATH = "./input/image.png";
const OUTPUT_PATH = "./output/image.png";

// Quanto menor, mais seletivo.
// Para essa imagem, algo entre 12 e 25 deve funcionar bem.
const BLACK_THRESHOLD = 100;

// Garante que só pixels realmente escuros sejam alterados.
// Se algum detalhe do título for afetado, diminua isso também.
const MAX_CHANNEL_THRESHOLD = 45;

// 0 = vira preto absoluto
// 0.25 = escurece bastante
// 0.5 = escurece moderadamente
const DARKEN_FACTOR = 0.0;
// ======================================================

function getLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const image = sharp(INPUT_PATH).ensureAlpha();

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignora pixels totalmente transparentes, caso existam
    if (a === 0) continue;

    const luminance = getLuminance(r, g, b);
    const maxChannel = Math.max(r, g, b);

    const isVeryBlack =
      luminance <= BLACK_THRESHOLD &&
      maxChannel <= MAX_CHANNEL_THRESHOLD;

    if (isVeryBlack) {
      data[i] = Math.round(r * DARKEN_FACTOR);
      data[i + 1] = Math.round(g * DARKEN_FACTOR);
      data[i + 2] = Math.round(b * DARKEN_FACTOR);
      // Alpha preservado
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toFile(OUTPUT_PATH);

  console.log("Imagem gerada em:", OUTPUT_PATH);
}

main().catch(console.error);