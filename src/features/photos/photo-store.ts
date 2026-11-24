import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { deletePhoto, listPhotos, uploadPhoto, type Photo, type UploadResult } from './api'
import { resizeImage } from './resize-image'

type UploadProgress = {
  done: number
  total: number
  failed: number
  tooMany: boolean
  /** The photo being worked on, 1-based; 0 right after choosing, before the first one starts. */
  current: number
  stage: 'resize' | 'upload'
}

type PhotoStore = {
  /** The family's photos on the server, oldest first. Null until the first successful load. */
  photos: Photo[] | null
  upload: UploadProgress | null
  /** Photos of the last upload that brought any, until the parents hide them. Not persisted. */
  recent: string[]
  actions: {
    refresh: (key: string) => Promise<void>
    /**
     * Shrinks and uploads the files one after another. Returns the photos that arrived on the
     * server, in the order of `files`; the caller pins them to a week if it wants to.
     */
    add: (key: string, files: File[]) => Promise<Photo[]>
    remove: (key: string, id: string) => Promise<boolean>
    clearRecent: () => void
  }
}

const byAge = (a: Photo, b: Photo) => (a.created_at < b.created_at ? -1 : 1)

// Persisted, so the forest knows about the photo of the week while offline.
const usePhotoStore = create<PhotoStore>()(
  persist(
    (set, get) => ({
      photos: null,
      upload: null,
      recent: [],
      actions: {
        refresh: async (key) => {
          const photos = await listPhotos(key)
          if (photos) set({ photos: [...photos].sort(byAge) })
        },
        add: async (key, files) => {
          const progress: UploadProgress = {
            done: 0,
            total: files.length,
            failed: 0,
            tooMany: false,
            current: 0,
            stage: 'resize',
          }
          // Shows "N Fotos ausgewählt" for a moment, so a choice is visible at once.
          set({ upload: { ...progress } })
          await new Promise((resolve) => setTimeout(resolve, 60))
          const added: Photo[] = []
          for (const [index, file] of files.entries()) {
            progress.current = index + 1
            progress.stage = 'resize'
            set({ upload: { ...progress } })
            const resized = await resizeImage(file).catch(() => null)
            let result: UploadResult | null = null
            if (resized) {
              progress.stage = 'upload'
              set({ upload: { ...progress } })
              result = await uploadPhoto(key, resized.blob)
            }
            if (result?.kind === 'ok') {
              added.push(result.photo)
              set({ photos: [...(get().photos ?? []), result.photo].sort(byAge) })
            } else {
              progress.failed++
              if (result?.kind === 'too_many') progress.tooMany = true
            }
            progress.done++
            set({ upload: { ...progress } })
          }
          // Keep the summary visible until the next upload starts.
          if (added.length > 0) set({ recent: added.map((p) => p.id) })
          return added
        },
        remove: async (key, id) => {
          const ok = await deletePhoto(key, id)
          if (ok) set({ photos: (get().photos ?? []).filter((p) => p.id !== id) })
          return ok
        },
        clearRecent: () => set({ recent: [] }),
      },
    }),
    {
      name: 'brushing-sparks-photos',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ photos: s.photos }),
    },
  ),
)

export const usePhotos = () => usePhotoStore((s) => s.photos)
export const useRecentPhotoIds = () => usePhotoStore((s) => s.recent)
export const useUploadProgress = () => usePhotoStore((s) => s.upload)
export const usePhotoActions = () => usePhotoStore((s) => s.actions)
export const photoStore = usePhotoStore
