const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

// ==================== CONFIGURAÇÃO ====================
const INPUT_PATH = './input/image.png';
const INPUT_FOLDER = './input';
const OUTPUT_FOLDER = './output';

const OUTPUT_PATH = './output/resultado_alterado.png';

const DELTA_V = 50;
const DELTA_S = 30;
// ======================================================

const processarTodas = process.argv.includes('all-images');

function limitarValor(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

function rgbParaHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h;
  let s;
  const v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, v];
}

function hsvParaRgb(h, s, v) {
  let r;
  let g;
  let b;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;

  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      r = v; g = t; b = p;
      break;
    case 1:
      r = q; g = v; b = p;
      break;
    case 2:
      r = p; g = v; b = t;
      break;
    case 3:
      r = p; g = q; b = v;
      break;
    case 4:
      r = t; g = p; b = v;
      break;
    case 5:
      r = v; g = p; b = q;
      break;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

async function alterarImagemHSV(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  const outputBuffer = Buffer.alloc(width * height * 3);

  const deltaVNormalizado = DELTA_V / 255;
  const deltaSNormalizado = DELTA_S / 255;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let [h, s, v] = rgbParaHsv(r, g, b);

    if (DELTA_V !== 0) {
      v = limitarValor(v + deltaVNormalizado, 0, 1);
    }

    if (DELTA_S !== 0) {
      s = limitarValor(s + deltaSNormalizado, 0, 1);
    }

    const [novoR, novoG, novoB] = hsvParaRgb(h, s, v);

    outputBuffer[i] = novoR;
    outputBuffer[i + 1] = novoG;
    outputBuffer[i + 2] = novoB;
  }

  await sharp(outputBuffer, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png()
    .toFile(outputPath);
}

async function processarImagemUnica() {
  await fs.mkdir(OUTPUT_FOLDER, { recursive: true });

  await alterarImagemHSV(INPUT_PATH, OUTPUT_PATH);

  console.log('Sucesso!');
  console.log(`Imagem salva em: ${OUTPUT_PATH}`);
}

async function processarTodasImagens() {
  await fs.mkdir(OUTPUT_FOLDER, { recursive: true });

  const arquivos = await fs.readdir(INPUT_FOLDER);

  const extensoesPermitidas = ['.png', '.jpg', '.jpeg', '.webp'];

  const imagens = arquivos.filter((arquivo) =>
    extensoesPermitidas.includes(path.extname(arquivo).toLowerCase())
  );

  if (imagens.length === 0) {
    console.log('Nenhuma imagem encontrada na pasta input.');
    return;
  }

  for (const imagem of imagens) {
    const inputPath = path.join(INPUT_FOLDER, imagem);

    const nomeSemExtensao = path.parse(imagem).name;
    const outputPath = path.join(
      OUTPUT_FOLDER,
      `${nomeSemExtensao}_alterado.png`
    );

    await alterarImagemHSV(inputPath, outputPath);

    console.log(`Processado: ${imagem} -> ${outputPath}`);
  }

  console.log('Todas as imagens foram processadas!');
}

async function main() {
  try {
    if (processarTodas) {
      await processarTodasImagens();
    } else {
      await processarImagemUnica();
    }

    console.log(`Brilho alterado em: ${DELTA_V}`);
    console.log(`Saturação alterada em: ${DELTA_S}`);
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
  }
}

main();