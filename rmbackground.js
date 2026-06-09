const sharp = require('sharp');

async function removerFundoPreto() {
  const inputPath = './input/image.png';
  const outputPath = './output/resultado_sem_fundo.png';
  
  // Limiar para o canal V (Brilho). No padrão de 0 a 255.
  // Pixels com brilho abaixo disso viram transparência.
  const limiarV = 1; 

  try {
    // 1. Carrega a imagem e obtém os metadados e os pixels puros (RGB)
    const { data, info } = await sharp(inputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    
    // 2. Cria um novo Buffer para a imagem de saída (RGBA -> 4 bytes por pixel)
    const outputBuffer = Buffer.alloc(width * height * 4);

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 3. Extrai o valor 'V' (Value/Brilho) do modelo HSV
      // O valor V é simplesmente o maior valor entre R, G e B
      const v = Math.max(r, g, b);

      // Índice correspondente na imagem RGBA de saída
      const targetIndex = (i / 3) * 4;

      outputBuffer[targetIndex] = r;     // R
      outputBuffer[targetIndex + 1] = g; // G
      outputBuffer[targetIndex + 2] = b; // B

      // 4. Se o brilho for menor que o limiar, define a opacidade (Alpha) como 0 (transparente)
      if (v < limiarV) {
        outputBuffer[targetIndex + 3] = 0;   // Transparente
      } else {
        outputBuffer[targetIndex + 3] = 255; // Opaco
      }
    }

    // 5. Salva o buffer processado como um arquivo PNG
    await sharp(outputBuffer, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(outputPath);

    console.log(`Sucesso! Imagem salva em: ${outputPath}`);
  } catch (error) {
    console.error('Erro ao processar a imagem:', error);
  }
}

removerFundoPreto();