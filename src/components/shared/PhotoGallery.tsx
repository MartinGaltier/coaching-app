'use client'

import { useState, useEffect, useCallback } from 'react'
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MAX_VISIBLE = 5

interface Photo {
  id: string
  signedUrl: string
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const visible = photos.slice(0, MAX_VISIBLE)
  const hiddenCount = photos.length - MAX_VISIBLE

  const close = useCallback(() => setLightboxIndex(null), [])

  const prev = useCallback(() =>
    setLightboxIndex(i => (i === null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  )

  const next = useCallback(() =>
    setLightboxIndex(i => (i === null ? null : (i + 1) % photos.length)),
    [photos.length],
  )

  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     close()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, close, prev, next])

  if (photos.length === 0) {
    return (
      <div
        data-testid="photo-gallery"
        className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6 text-muted-foreground"
      >
        <Camera className="size-6 opacity-40" />
        <p className="text-xs">Aucune photo pour ce bilan</p>
      </div>
    )
  }

  return (
    <div data-testid="photo-gallery">
      {/* Thumbnails */}
      <div className="flex flex-wrap gap-2">
        {visible.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(idx)}
            className="relative size-16 overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-20"
          >
            <img
              src={photo.signedUrl}
              alt={`Photo ${idx + 1}`}
              className="size-full object-cover"
            />
          </button>
        ))}

        {hiddenCount > 0 && (
          <button
            onClick={() => setLightboxIndex(MAX_VISIBLE)}
            className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-20"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={close}
        >
          {/* Fermer */}
          <button
            onClick={e => { e.stopPropagation(); close() }}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                aria-label="Photo suivante"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={photos[lightboxIndex].signedUrl}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />

          {/* Compteur */}
          <span className="absolute bottom-4 text-xs text-white/60">
            {lightboxIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  )
}
