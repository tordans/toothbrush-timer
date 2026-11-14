import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { newId, nowIso } from '@/lib/id'
import { brushingsFor } from './queries'
import {
  emptyFamilyState,
  parseFamilyState,
  type Animal,
  type FamilyState,
  type Settings,
  type Slot,
} from './schema'

export type SyncStatus =
  | 'local'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'unauthorized'
  | 'incompatible'

type FamilyStore = {
  family: FamilyState
  activeKidId: string | null
  /** Family key from the link; null means this device only stores locally. */
  familyKey: string | null
  /** Server version the local state was last reconciled with. */
  serverVersion: number
  /** Local changes not yet confirmed by the server. */
  dirty: boolean
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  actions: {
    addKid: (name: string, animal: Animal) => string
    updateKid: (id: string, patch: { name?: string; animal?: Animal }) => void
    deleteKid: (id: string) => void
    setActiveKid: (id: string) => void
    recordBrushing: (input: { kidId: string; date: string; slot: Slot; seconds: number }) => void
    setBrushed: (kidId: string, date: string, slot: Slot, brushed: boolean) => void
    updateSettings: (patch: Partial<Omit<Settings, 'updatedAt'>>) => void
    connect: (familyKey: string) => void
    disconnect: () => void
    /** Used by the sync engine only. */
    reconcile: (family: FamilyState, serverVersion: number, stillDirty: boolean) => void
    setSyncStatus: (status: SyncStatus) => void
  }
}

const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => {
      const change = (recipe: (family: FamilyState) => FamilyState) =>
        set((s) => ({ family: recipe(s.family), dirty: true }))

      return {
        family: emptyFamilyState(),
        activeKidId: null,
        familyKey: null,
        serverVersion: 0,
        dirty: false,
        syncStatus: 'local',
        lastSyncedAt: null,
        actions: {
          addKid: (name, animal) => {
            const id = newId()
            const now = nowIso()
            change((f) => ({
              ...f,
              kids: { ...f.kids, [id]: { id, name, animal, createdAt: now, updatedAt: now } },
            }))
            set({ activeKidId: id })
            return id
          },
          updateKid: (id, patch) =>
            change((f) => {
              const kid = f.kids[id]
              if (!kid) return f
              return { ...f, kids: { ...f.kids, [id]: { ...kid, ...patch, updatedAt: nowIso() } } }
            }),
          deleteKid: (id) => {
            change((f) => {
              const kid = f.kids[id]
              if (!kid) return f
              return {
                ...f,
                kids: { ...f.kids, [id]: { ...kid, deleted: true, updatedAt: nowIso() } },
              }
            })
            if (get().activeKidId === id) set({ activeKidId: null })
          },
          setActiveKid: (id) => set({ activeKidId: id }),
          recordBrushing: ({ kidId, date, slot, seconds }) => {
            const id = newId()
            const now = nowIso()
            change((f) => ({
              ...f,
              brushings: {
                ...f.brushings,
                [id]: { id, kidId, date, slot, seconds, at: now, source: 'timer', updatedAt: now },
              },
            }))
          },
          setBrushed: (kidId, date, slot, brushed) =>
            change((f) => {
              const existing = brushingsFor(f, kidId, date, slot)
              const now = nowIso()
              if (brushed) {
                if (existing.length > 0) return f
                const id = newId()
                return {
                  ...f,
                  brushings: {
                    ...f.brushings,
                    [id]: {
                      id,
                      kidId,
                      date,
                      slot,
                      seconds: 0,
                      at: now,
                      source: 'manual',
                      updatedAt: now,
                    },
                  },
                }
              }
              const brushings = { ...f.brushings }
              for (const b of existing) brushings[b.id] = { ...b, deleted: true, updatedAt: now }
              return { ...f, brushings }
            }),
          updateSettings: (patch) =>
            change((f) => ({ ...f, settings: { ...f.settings, ...patch, updatedAt: nowIso() } })),
          connect: (familyKey) =>
            // dirty: the local data is pushed (merged) on the first sync with the server
            set({ familyKey, serverVersion: 0, dirty: true, syncStatus: 'syncing' }),
          // Signing out removes the family from this device; it stays on the server.
          disconnect: () =>
            set({
              familyKey: null,
              family: emptyFamilyState(),
              activeKidId: null,
              serverVersion: 0,
              dirty: false,
              syncStatus: 'local',
              lastSyncedAt: null,
            }),
          reconcile: (family, serverVersion, stillDirty) =>
            set({
              family,
              serverVersion,
              dirty: stillDirty,
              syncStatus: 'synced',
              lastSyncedAt: nowIso(),
            }),
          setSyncStatus: (syncStatus) => set({ syncStatus }),
        },
      }
    },
    {
      // Storage key from the first version; kept so existing phones keep their data.
      name: 'brushing-sparks',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        family: s.family,
        activeKidId: s.activeKidId,
        familyKey: s.familyKey,
        serverVersion: s.serverVersion,
        dirty: s.dirty,
        lastSyncedAt: s.lastSyncedAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FamilyStore>
        return {
          ...current,
          ...p,
          family: parseFamilyState(p.family) ?? current.family,
          syncStatus: p.familyKey ? 'syncing' : 'local',
        }
      },
    },
  ),
)

export const familyStore = useFamilyStore

export const useFamily = () => useFamilyStore((s) => s.family)
export const useActiveKidId = () => useFamilyStore((s) => s.activeKidId)
export const useFamilyKey = () => useFamilyStore((s) => s.familyKey)
export const useSyncStatus = () => useFamilyStore((s) => s.syncStatus)
export const useLastSyncedAt = () => useFamilyStore((s) => s.lastSyncedAt)
export const useFamilyActions = () => useFamilyStore((s) => s.actions)
