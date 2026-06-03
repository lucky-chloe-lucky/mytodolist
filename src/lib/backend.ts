import {
  collection as fsCollection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { CollectionName, Schema } from './types'

// A record always has an `id`. Each backend stores/streams records by id.
type Rec = { id: string }
type Listener<T> = (items: T[]) => void

export interface Backend {
  readonly mode: 'local' | 'cloud'
  subscribe<K extends CollectionName>(
    name: K,
    cb: Listener<Schema[K]>,
  ): () => void
  put<K extends CollectionName>(name: K, item: Schema[K]): Promise<void>
  remove(name: CollectionName, id: string): Promise<void>
}

// ── Local backend: browser localStorage, single device, no login ─────
class LocalBackend implements Backend {
  readonly mode = 'local' as const
  private listeners = new Map<string, Set<Listener<Rec>>>()

  private key(name: string) {
    return `flow:${name}`
  }

  private read<T extends Rec>(name: CollectionName): T[] {
    try {
      const raw = localStorage.getItem(this.key(name))
      return raw ? (JSON.parse(raw) as T[]) : []
    } catch {
      return []
    }
  }

  private write<T extends Rec>(name: CollectionName, items: T[]) {
    localStorage.setItem(this.key(name), JSON.stringify(items))
    const set = this.listeners.get(name)
    if (set) set.forEach((cb) => cb(items))
  }

  subscribe<K extends CollectionName>(name: K, cb: Listener<Schema[K]>) {
    const listener = cb as Listener<Rec>
    const set = this.listeners.get(name) ?? new Set<Listener<Rec>>()
    set.add(listener)
    this.listeners.set(name, set)
    // Emit current value immediately.
    cb(this.read<Schema[K]>(name))
    return () => set.delete(listener)
  }

  async put<K extends CollectionName>(name: K, item: Schema[K]) {
    const items = this.read<Schema[K]>(name)
    const idx = items.findIndex((i) => i.id === item.id)
    if (idx >= 0) items[idx] = item
    else items.push(item)
    this.write(name, items)
  }

  async remove(name: CollectionName, id: string) {
    const items = this.read(name).filter((i) => i.id !== id)
    this.write(name, items)
  }
}

// ── Cloud backend: Firestore under users/{uid}/{collection} ──────────
class CloudBackend implements Backend {
  readonly mode = 'cloud' as const
  private uid: string

  constructor(uid: string) {
    this.uid = uid
  }

  private path(name: string) {
    return `users/${this.uid}/${name}`
  }

  subscribe<K extends CollectionName>(name: K, cb: Listener<Schema[K]>) {
    const ref = fsCollection(db!, this.path(name))
    return onSnapshot(ref, (snap) => {
      cb(snap.docs.map((d) => d.data() as Schema[K]))
    })
  }

  async put<K extends CollectionName>(name: K, item: Schema[K]) {
    await setDoc(doc(db!, this.path(name), item.id), item)
  }

  async remove(name: CollectionName, id: string) {
    await deleteDoc(doc(db!, this.path(name), id))
  }
}

export function createLocalBackend(): Backend {
  return new LocalBackend()
}

export function createCloudBackend(uid: string): Backend {
  return new CloudBackend(uid)
}

// Random id helper (crypto when available).
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
