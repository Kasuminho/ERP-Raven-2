'use client';

import { useEffect, useState } from 'react';

type PreviewImage = {
  src: string;
  alt: string;
};

export function ImageLightbox() {
  const [image, setImage] = useState<PreviewImage | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const img = target.closest('img');

      if (!(img instanceof HTMLImageElement) || img.dataset.imagePreview === 'false') {
        return;
      }

      const src = img.currentSrc || img.src;

      if (!src) {
        return;
      }

      event.preventDefault();
      setImage({
        src,
        alt: img.alt || 'Imagem ampliada',
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImage(null);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!image) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizacao ampliada de imagem"
      onClick={() => setImage(null)}
    >
      <div className="relative max-h-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <button
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 text-lg font-bold text-white shadow-lg hover:bg-black"
          type="button"
          aria-label="Fechar imagem"
          onClick={() => setImage(null)}
        >
          X
        </button>
        <img
          className="max-h-[88vh] max-w-[92vw] rounded-lg border border-white/15 bg-background object-contain shadow-2xl"
          src={image.src}
          alt={image.alt}
          data-image-preview="false"
        />
      </div>
    </div>
  );
}
