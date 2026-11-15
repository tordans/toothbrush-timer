import { useEffect, useState } from 'react'
import { useFamilyKey } from '@/features/family/family-store'
import { photoUrl } from './api'

/** A `blob:` URL for a family photo; null while loading or when it cannot be loaded. */
export function usePhotoUrl(id: string | undefined): string | null {
  const key = useFamilyKey()
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!key || !id) return
    let current = true
    void photoUrl(key, id).then((url) => {
      if (current) setLoaded({ id, url })
    })
    return () => {
      current = false
    }
  }, [key, id])
  return loaded && loaded.id === id ? loaded.url : null
}
