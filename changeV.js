const sharp = require('sharp');

// ==================== CONFIGURAÇÃO ====================
const INPUT_PATH = './input/image.png';
const OUTPUT_PATH = './output/resultado_alterado.png';

// Defina aqui quanto quer mudar no Brilho (V). 
// Valores positivos aumentam o brilho, valores negativos escurecem.
// Exemplo: 30, -50, 15, etc.
const DELTA_V = -3; 
// ======================================================

// Funções auxiliares de conversão matemática
function rgbParaHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0; // acromático
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, v]; // H e S entre 0 e 1, V entre 0 e 1
}

function hsvParaRgb(h, s, v) {
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

async function alterarBrilhoHSV() {
  try {
    // 1. Carrega os pixels brutos da imagem
    const { data, info } = await sharp(INPUT_PATH)
      .removeAlpha() // Remove canal alpha se existir
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const outputBuffer = Buffer.alloc(width * height * 3); // RGB (3 bytes por pixel)

    // Normaliza o delta para a escala de 0 a 1
    const deltaVNormalizado = DELTA_V / 255;

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 2. Converte para HSV
      let [h, s, v] = rgbParaHsv(r, g, b);

      // 3. Aplica a alteração no canal V
      v += deltaVNormalizado;

      // Garante que o brilho não saia dos limites [0, 1]
      if (v > 1) v = 1;
      if (v < 0) v = 0;

      // 4. Converte de volta para RGB
      const [novoR, novoG, novoB] = hsvParaRgb(h, s, v);

      // 5. Salva no buffer de saída
      outputBuffer[i] = novoR;
      outputBuffer[i + 1] = novoG;
      outputBuffer[i + 2] = novoB;
    }

    // 6. Salva a nova imagem
    await sharp(outputBuffer, { raw: { width, height, channels: 3 } })
      .png() // Salva como PNG (ou .jpeg() se preferir)
      .toFile(OUTPUT_PATH);

    console.log(`Sucesso! Brilho alterado em ${DELTA_V}. Imagem salva em: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Erro ao processar a imagem:', error);
  }
}

alterarBrilhoHSV();