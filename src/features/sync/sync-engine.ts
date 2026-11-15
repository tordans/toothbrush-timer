import { familyStore } from '@/features/family/family-store'
import { mergeFamilyStates, sameFamilyState } from '@/features/family/merge'
import { parseFamilyState, type FamilyState } from '@/features/family/schema'
import { photoStore } from '@/features/photos/photo-store'
import { fetchRemoteState, pushRemoteState, type RemoteState } from './api'

const PUSH_DELAY_MS = 800
const POLL_MS = 60_000
const RETRY_MS = 20_000
const MAX_CONFLICT_ROUNDS = 4

let running = false
let again = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined

function remoteFamily(remote: RemoteState): FamilyState | null {
  return remote.data == null ? null : parseFamilyState(remote.data)
}

/**
 * One sync round: fetch the server state, merge it with the local state record by record, and
 * push the merge if the server lacks something. A 409 means another phone saved in between:
 * merge its state and try again.
 */
async function syncOnce(): Promise<void> {
  const key = familyStore.getState().familyKey
  if (!key) return
  const { setSyncStatus, reconcile } = familyStore.getState().actions
  setSyncStatus('syncing')

  const fetched = await fetchRemoteState(key)
  if (fetched.kind === 'unauthorized') return setSyncStatus('unauthorized')
  if (fetched.kind !== 'ok') return offline()

  let remote = fetched.value
  for (let round = 0; round < MAX_CONFLICT_ROUNDS; round++) {
    const local = familyStore.getState().family
    const server = remoteFamily(remote)
    // Data from a newer app version (or repaired by hand) that this version cannot read:
    // never overwrite it. Keep everything local and ask for a reload.
    if (remote.data != null && !server) return setSyncStatus('incompatible')
    const merged = server ? mergeFamilyStates(local, server) : local

    if (server && sameFamilyState(merged, server)) {
      // Server already has everything; take it over unless the user changed something meanwhile.
      finish(local, merged, remote.version)
      return
    }

    const pushed = await pushRemoteState(key, merged, remote.version)
    if (pushed.kind === 'ok') {
      finish(local, merged, pushed.value.version)
      return
    }
    if (pushed.kind === 'unauthorized') return setSyncStatus('unauthorized')
    if (pushed.kind === 'offline') return offline()
    remote = pushed.remote
  }
  offline()

  function finish(before: FamilyState, merged: FamilyState, version: number) {
    const now = familyStore.getState().family
    // Local edits made while the request was running are kept and pushed next round.
    const changedMeanwhile = now !== before
    reconcile(changedMeanwhile ? mergeFamilyStates(merged, now) : merged, version, changedMeanwhile)
    if (changedMeanwhile) schedulePush()
  }
}

function offline() {
  familyStore.getState().actions.setSyncStatus('offline')
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => void syncNow(), RETRY_MS)
}

export async function syncNow(): Promise<void> {
  if (running) {
    again = true
    return
  }
  running = true
  try {
    do {
      again = false
      await syncOnce()
    } while (again)
    // The photo list changes rarely (parents upload on one phone); load it along with the state.
    const key = familyStore.getState().familyKey
    if (key && familyStore.getState().syncStatus === 'synced') {
      void photoStore.getState().actions.refresh(key)
    }
  } finally {
    running = false
  }
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void syncNow(), PUSH_DELAY_MS)
}

/** Reads `#key=…` from the link, stores it and removes it from the address bar. */
function takeKeyFromLocation() {
  const match = /(?:^#|&)key=([^&]+)/.exec(window.location.hash)
  if (!match?.[1]) return
  const key = decodeURIComponent(match[1])
  const current = familyStore.getState().familyKey
  // A Home Screen icon starts with the key from the day it was added (see public/home-screen.js).
  // Once the app there has a key, that old one must not replace a newer family link.
  const homeScreenApp = window.matchMedia('(display-mode: standalone)').matches
  if (current !== key && !(homeScreenApp && current)) familyStore.getState().actions.connect(key)
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function startSync() {
  takeKeyFromLocation()
  window.addEventListener('hashchange', () => {
    takeKeyFromLocation()
    void syncNow()
  })

  familyStore.subscribe((state, prev) => {
    if (state.familyKey && state.familyKey !== prev.familyKey) void syncNow()
    else if (state.familyKey && state.dirty && state.family !== prev.family) schedulePush()
  })

  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, POLL_MS)

  void syncNow()
}
