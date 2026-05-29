# change-hue

Script Node.js para recolorir uma imagem PNG alterando sua **matiz (hue)** para um valor fixo.

Ele usa a biblioteca `sharp` e processa pixel a pixel, preservando transparência e brilho/saturação originais.

## O que este script faz

- Lê a imagem de entrada em `./input/imagem.png`.
- Converte cada pixel de RGB para HSV.
- Troca apenas a matiz pelo valor definido em `TARGET_HUE`.
- Mantém saturação e valor (brilho) de cada pixel.
- Mantém o canal alpha (transparência).
- Ignora:
	- pixels totalmente transparentes (`alpha = 0`)
	- pixels sem saturação (`s = 0`, como cinza/preto/branco), porque mudar matiz neles não altera visualmente.
- Salva o resultado em `./output/imagem_recolorida.png`.

## Pré-requisitos

- Node.js instalado
- Dependência `sharp`

Instale a dependência na pasta do script:

```bash
cd scripts/change-hue
npm install sharp
```

## Estrutura esperada

```text
scripts/change-hue/
	change-hue.js
	input/
		imagem.png
	output/
```

Se a pasta `output` não existir, o script cria automaticamente.

## Como usar

1. Coloque sua imagem PNG de entrada em `scripts/change-hue/input/imagem.png`.
2. No terminal, entre na pasta do script:

```bash
cd scripts/change-hue
```

3. Execute:

```bash
node change-hue.js
```

4. O arquivo final será gerado em:

```text
scripts/change-hue/output/imagem_recolorida.png
```

## Ajustando a cor final

No arquivo `change-hue.js`, altere o valor:

```js
const TARGET_HUE = 220;
```

Faixa válida: `0` a `360`.

Exemplos aproximados:

- `0` -> vermelho
- `60` -> amarelo
- `120` -> verde
- `180` -> ciano
- `240` -> azul
- `300` -> magenta

## Observações

- O script está com nomes de arquivo fixos (`imagem.png` e `imagem_recolorida.png`).
- Para processar outros nomes, altere `inputPath` e/ou `outputPath` no código.
