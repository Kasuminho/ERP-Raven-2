/**
 * Otimiza e comprime uma imagem no navegador antes do upload para a API.
 * Reduz prints pesados de jogos (ex: PNGs de 5MB a 15MB em 1080p/1440p/4K)
 * para JPEG otimizado (~90% de qualidade e resolução máxima de 2560px),
 * evitando timeout de rede e cancelamento de requisições.
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension = 2560,
  quality = 0.90,
): Promise<File> {
  // Se não estiver no browser ou não for arquivo de imagem, retorna o original
  if (typeof window === 'undefined' || !file || !file.type?.startsWith('image/')) {
    return file;
  }

  // Não comprime SVGs ou GIFs animados
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // Se a imagem já for pequena (< 1.5 MB) e em formato comum, envia direto sem gastar CPU
  if (
    file.size <= 1.5 * 1024 * 1024 &&
    (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')
  ) {
    return file;
  }

  try {
    return await new Promise<File>((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      };

      img.onload = () => {
        cleanup();

        let { width, height } = img;
        if (!width || !height) {
          resolve(file);
          return;
        }

        // Redimensionar proporcionalmente se exceder a dimensão máxima (ex: 4K)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Fundo preto para evitar problemas em PNGs com canal alfa ao converter para JPEG
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Preserva nome base trocando extensão para .jpg
            const baseName = file.name.replace(/\.[^/.]+$/, '') || 'print';
            const optimizedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            // Se por algum motivo o blob resultante ficou maior que o arquivo original, usa o original
            if (optimizedFile.size >= file.size) {
              resolve(file);
              return;
            }

            resolve(optimizedFile);
          },
          'image/jpeg',
          quality,
        );
      };

      img.onerror = () => {
        cleanup();
        resolve(file);
      };

      img.src = objectUrl;
    });
  } catch {
    // Fallback resiliente: em qualquer erro de ambiente, devolve o arquivo original
    return file;
  }
}
