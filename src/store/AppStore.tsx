import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider, isCloudConfigured } from '../lib/firebase'
import {
  createCloudBackend,
  createLocalBackend,
  type Backend,
} from '../lib/backend'
import { COLLECTIONS, type CollectionName, type Schema } from '../lib/types'

type DataState = {
  [K in CollectionName]: Schema[K][]
}

const emptyData: DataState = {
  todos: [],
  projects: [],
  milestones: [],
  sprints: [],
  reports: [],
  kpts: [],
  habits: [],
  weeklyNotes: [],
  timeblocks: [],
  timeCategories: [],
}

interface AppContextValue {
  mode: 'local' | 'cloud'
  cloudConfigured: boolean
  authReady: boolean
  user: User | null
  data: DataState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  save: <K extends CollectionName>(name: K, item: Schema[K]) => Promise<void>
  remove: (name: CollectionName, id: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!isCloudConfigured)
  const [data, setData] = useState<DataState>(emptyData)
  const backendRef = useRef<Backend | null>(null)

  // Track auth state (cloud) or fall straight through (local).
  useEffect(() => {
    if (!isCloudConfigured || !auth) {
      backendRef.current = createLocalBackend()
      setAuthReady(true)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      backendRef.current = u ? createCloudBackend(u.uid) : null
      setAuthReady(true)
    })
  }, [])

  // (Re)subscribe to every collection whenever the active backend changes.
  const backendKey = isCloudConfigured ? (user ? user.uid : 'none') : 'local'
  useEffect(() => {
    const backend = backendRef.current
    if (!backend) {
      setData(emptyData)
      return
    }
    const unsubs = COLLECTIONS.map((name) =>
      backend.subscribe(name, (items) =>
        setData((prev) => ({ ...prev, [name]: items })),
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [backendKey])

  const signIn = useCallback(async () => {
    if (auth) await signInWithPopup(auth, googleProvider)
  }, [])

  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth)
  }, [])

  const save = useCallback(
    async <K extends CollectionName>(name: K, item: Schema[K]) => {
      await backendRef.current?.put(name, item)
    },
    [],
  )

  const remove = useCallback(async (name: CollectionName, id: string) => {
    await backendRef.current?.remove(name, id)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      mode: isCloudConfigured ? 'cloud' : 'local',
      cloudConfigured: isCloudConfigured,
      authReady,
      user,
      data,
      signIn,
      signOut,
      save,
      remove,
    }),
    [authReady, user, data, signIn, signOut, save, remove],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within <AppProvider>')
  return ctx
}
