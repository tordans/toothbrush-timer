import { create } from 'zustand'

/** Portrait and landscape have different SVG coordinate systems, so each has its own list. */
type MeadowLayout = 'portrait' | 'landscape'
type PlantKind = 'grass' | 'flower' | 'mushroom'
type Plant = { id: number; x: number; y: number; kind: PlantKind }

const MAX_PLANTS_PER_LAYOUT = 200

// Module-level counter: crypto.randomUUID is missing on Chrome 87.
let lastPlantId = 0

function pickKind(): PlantKind {
  const r = Math.random()
  if (r < 0.6) return 'grass'
  if (r < 0.85) return 'flower'
  return 'mushroom'
}

type MeadowStore = {
  plants: Record<MeadowLayout, Plant[]>
  actions: {
    /** Grows a plant at (x, y) in the viewBox of the given layout; drops the oldest beyond the limit. */
    addPlant: (layout: MeadowLayout, x: number, y: number) => void
  }
}

// No persist: the plants stay while the app is open and are gone after a reload.
const useMeadowStore = create<MeadowStore>()((set) => ({
  plants: { portrait: [], landscape: [] },
  actions: {
    addPlant: (layout, x, y) => {
      lastPlantId += 1
      const plant: Plant = { id: lastPlantId, x, y, kind: pickKind() }
      set((s) => ({
        plants: {
          ...s.plants,
          [layout]: [...s.plants[layout], plant].slice(-MAX_PLANTS_PER_LAYOUT),
        },
      }))
    },
  },
}))

export const useMeadowPlants = (layout: MeadowLayout) => useMeadowStore((s) => s.plants[layout])
export const useMeadowActions = () => useMeadowStore((s) => s.actions)
