import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { deletePhoto, listPhotos, uploadPhoto, type Photo } from './api'
import { resizeImage } from './resize-image'

type UploadProgress = { done: number; total: number; failed: number; tooMany: boolean }

type PhotoStore = {
  /** The family's photos on the server, oldest first. Null until the first successful load. */
  photos: Photo[] | null
  upload: UploadProgress | null
  actions: {
    refresh: (key: string) => Promise<void>
    /** Shrinks and uploads the files one after another. */
    add: (key: string, files: File[]) => Promise<void>
    remove: (key: string, id: string) => Promise<boolean>
  }
}

const byAge = (a: Photo, b: Photo) => (a.created_at < b.created_at ? -1 : 1)

// Persisted, so the forest knows about the photo of the week while offline.
const usePhotoStore = create<PhotoStore>()(
  persist(
    (set, get) => ({
      photos: null,
      upload: null,
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
          }
          set({ upload: { ...progress } })
          for (const file of files) {
            const resized = await resizeImage(file)
            const result = resized ? await uploadPhoto(key, resized.blob) : null
            if (result?.kind === 'ok') {
              set({ photos: [...(get().photos ?? []), result.photo].sort(byAge) })
            } else {
              progress.failed++
              if (result?.kind === 'too_many') progress.tooMany = true
            }
            progress.done++
            set({ upload: { ...progress } })
          }
          // Keep the summary visible until the next upload starts.
        },
        remove: async (key, id) => {
          const ok = await deletePhoto(key, id)
          if (ok) set({ photos: (get().photos ?? []).filter((p) => p.id !== id) })
          return ok
        },
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
export const useUploadProgress = () => usePhotoStore((s) => s.upload)
export const usePhotoActions = () => usePhotoStore((s) => s.actions)
export const photoStore = usePhotoStore
