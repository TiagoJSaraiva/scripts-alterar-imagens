const sharp = require('sharp');

const INPUT_PATH = './input/image.png';
const OUTPUT_PATH = './output/image_alpha_corrigido.png';

async function corrigirAlpha() {
  try {
    const { data, info } = await sharp(INPUT_PATH)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const output = Buffer.from(data);

    for (let i = 0; i < output.length; i += 4) {
      const alpha = output[i + 3];

      if (alpha > 0) {
        output[i + 3] = 255;
      }
    }

    await sharp(output, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png()
      .toFile(OUTPUT_PATH);

    console.log('Alpha corrigido com sucesso.');
  } catch (err) {
    console.error(err);
  }
}

corrigirAlpha();