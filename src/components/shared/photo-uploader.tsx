'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { X, Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProgressPhotoWithUrl } from '@/types'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024  // 10 MB

function getExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function isValidFile(file: File): string | null {
  const ext = getExtension(file)
  const isImage = file.type.startsWith('image/') || ALLOWED_EXTENSIONS.has(ext)
  if (!isImage) return `Format non supporté (JPG, PNG, WebP, HEIC).`
  if (file.size > MAX_SIZE_BYTES) return `Trop volumineux (max 10 MB).`
  return null
}

// ─── PhotoThumb ───────────────────────────────────────────────

function PhotoThumb({
  src,
  alt,
  badge,
  onRemove,
}: {
  src: string
  alt: string
  badge?: string
  onRemove?: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      {imgError ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
          <ImageIcon className="size-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground leading-tight break-all">{alt}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
      {badge && (
        <span className="absolute bottom-1 left-1 rounded-sm bg-background/80 px-1 text-[9px] text-muted-foreground">
          {badge}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Supprimer"
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-background/90 shadow transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

// ─── PhotoUploader ────────────────────────────────────────────

interface PhotoUploaderProps {
  existingPhotos: ProgressPhotoWithUrl[]
  pendingFiles: File[]
  onAdd:            (files: File[]) => void
  onRemovePending:  (index: number) => void
  onRemoveExisting: (photo: ProgressPhotoWithUrl) => void
  maxPhotos?: number
  disabled?: boolean
}

export function PhotoUploader({
  existingPhotos,
  pendingFiles,
  onAdd,
  onRemovePending,
  onRemoveExisting,
  maxPhotos = 5,
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])

  // Stable object URL map — crée une URL par File, la révoque quand le fichier disparaît
  const urlMapRef = useRef(new Map<File, string>())

  useEffect(() => {
    const currentFiles = new Set(pendingFiles)
    for (const [file, url] of urlMapRef.current) {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url)
        urlMapRef.current.delete(file)
      }
    }
  }, [pendingFiles])

  // Nettoyage complet au démontage
  useEffect(() => {
    return () => {
      for (const url of urlMapRef.current.values()) URL.revokeObjectURL(url)
    }
  }, [])

  function getPreviewUrl(file: File): string {
    if (!urlMapRef.current.has(file)) {
      urlMapRef.current.set(file, URL.createObjectURL(file))
    }
    return urlMapRef.current.get(file)!
  }

  function processFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList)
    const remaining = maxPhotos - existingPhotos.length - pendingFiles.length
    const errors: string[] = []
    const valid: File[] = []

    for (const file of arr) {
      if (valid.length >= remaining) {
        errors.push(`Maximum ${maxPhotos} photos autorisées.`)
        break
      }
      const err = isValidFile(file)
      if (err) { errors.push(`${file.name} : ${err}`); continue }
      valid.push(file)
    }

    setFileErrors(errors)
    if (valid.length > 0) onAdd(valid)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) processFiles(e.dataTransfer.files)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, existingPhotos.length, pendingFiles.length, maxPhotos])

  const totalCount = existingPhotos.length + pendingFiles.length
  const remaining  = maxPhotos - totalCount

  return (
    <div className="flex flex-col gap-3">
      {/* Zone d'upload (masquée quand quota atteint) */}
      {remaining > 0 && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Ajouter des photos"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <Upload className="size-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Ajouter des photos</p>
            <p className="text-xs text-muted-foreground">
              Glisse-dépose, clique, ou utilise ta galerie / appareil photo
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG · PNG · WebP · HEIC — max 10 MB —{' '}
              {remaining} photo{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Input "image/*" : ouvre galerie + caméra sur iOS/Android */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-hidden="true"
            disabled={disabled}
            onChange={e => {
              if (e.target.files) processFiles(e.target.files)
              // Reset value so le même fichier peut être re-sélectionné
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Messages d'erreur de validation */}
      {fileErrors.length > 0 && (
        <ul className="space-y-1">
          {fileErrors.map((err, i) => (
            <li key={i} className="text-xs text-destructive">{err}</li>
          ))}
        </ul>
      )}

      {/* Grille de miniatures */}
      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {existingPhotos.map(photo => (
            <PhotoThumb
              key={photo.id}
              src={photo.signedUrl}
              alt="Photo de progression"
              onRemove={disabled ? undefined : () => onRemoveExisting(photo)}
            />
          ))}
          {pendingFiles.map((file, i) => (
            <PhotoThumb
              key={`pending-${i}-${file.name}`}
              src={getPreviewUrl(file)}
              alt={file.name}
              badge="En attente"
              onRemove={disabled ? undefined : () => onRemovePending(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
