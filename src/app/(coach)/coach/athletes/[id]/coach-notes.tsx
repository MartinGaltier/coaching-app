'use client'

import { useRef, useState, useTransition } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addNote, deleteNote } from './actions'
import type { CoachNote } from '@/types'

interface CoachNotesProps {
  notes: CoachNote[]
  athleteId: string
}

export function CoachNotes({ notes, athleteId }: CoachNotesProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleAdd() {
    const content = textareaRef.current?.value ?? ''
    if (!content.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addNote(athleteId, content)
      if (result.error) {
        setError(result.error)
      } else if (textareaRef.current) {
        textareaRef.current.value = ''
      }
    })
  }

  function handleDelete(noteId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteNote(noteId, athleteId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Liste des notes */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note pour cet athlète.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map(note => (
            <li key={note.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(note.id)}
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Formulaire d'ajout */}
      <div className="flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          placeholder="Ajouter une note…"
          rows={3}
          className="text-sm resize-none"
          disabled={isPending}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          size="sm"
          className="self-end gap-1.5"
          onClick={handleAdd}
          disabled={isPending}
        >
          <Plus className="size-3.5" />
          Ajouter une note
        </Button>
      </div>
    </div>
  )
}
