const sharp = require('sharp');

// ==================== CONFIGURAÇÃO ====================
const INPUT_PATH = './input/image.png';
const OUTPUT_PATH = './output/resultado_alterado.png';

// Defina aqui quanto quer mudar no Brilho (V).
// Valores positivos aumentam o brilho, valores negativos escurecem.
// Exemplo: 30, -50, 15, etc.
const DELTA_V = 50;

// Defina aqui quanto quer mudar na Saturação (S).
// Valores positivos aumentam a saturação, valores negativos reduzem.
// Use 0 para não alterar a saturação.
// Exemplo: 30, -50, 15, etc.
const DELTA_S = 30;
// ======================================================

function limitarValor(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

// Funções auxiliares de conversão matemática
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
    h = 0; // acromático
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

  return [h, s, v]; // H, S e V entre 0 e 1
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
      r = v;
      g = t;
      b = p;
      break;

    case 1:
      r = q;
      g = v;
      b = p;
      break;

    case 2:
      r = p;
      g = v;
      b = t;
      break;

    case 3:
      r = p;
      g = q;
      b = v;
      break;

    case 4:
      r = t;
      g = p;
      b = v;
      break;

    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

async function alterarImagemHSV() {
  try {
    // 1. Carrega os pixels brutos da imagem
    const { data, info } = await sharp(INPUT_PATH)
      .removeAlpha() // Remove canal alpha se existir
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    const outputBuffer = Buffer.alloc(width * height * 3); // RGB

    // Normaliza os deltas para a escala de 0 a 1
    const deltaVNormalizado = DELTA_V / 255;
    const deltaSNormalizado = DELTA_S / 255;

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 2. Converte para HSV
      let [h, s, v] = rgbParaHsv(r, g, b);

      // 3. Aplica alteração no brilho, se indicado
      if (DELTA_V !== 0) {
        v += deltaVNormalizado;
        v = limitarValor(v, 0, 1);
      }

      // 4. Aplica alteração na saturação, se indicado
      if (DELTA_S !== 0) {
        s += deltaSNormalizado;
        s = limitarValor(s, 0, 1);
      }

      // 5. Converte de volta para RGB
      const [novoR, novoG, novoB] = hsvParaRgb(h, s, v);

      // 6. Salva no buffer de saída
      outputBuffer[i] = novoR;
      outputBuffer[i + 1] = novoG;
      outputBuffer[i + 2] = novoB;
    }

    // 7. Salva a nova imagem
    await sharp(outputBuffer, {
      raw: {
        width,
        height,
        channels: 3,
      },
    })
      .png()
      .toFile(OUTPUT_PATH);

    console.log(`Sucesso!`);
    console.log(`Brilho alterado em: ${DELTA_V}`);
    console.log(`Saturação alterada em: ${DELTA_S}`);
    console.log(`Imagem salva em: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Erro ao processar a imagem:', error);
  }
}

alterarImagemHSV();