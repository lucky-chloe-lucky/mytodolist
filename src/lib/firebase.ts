import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig, isCloudConfigured } from './firebaseConfig'

// Initialized once, only when cloud mode is configured.
let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined

if (isCloudConfigured) {
  app = initializeApp(firebaseConfig)
  authInstance = getAuth(app)
  // ignoreUndefinedProperties: optional fields left as `undefined` are dropped
  // instead of throwing "Unsupported field value: undefined" on write.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true })
}

export const auth = authInstance
export const db = dbInstance
export const googleProvider = new GoogleAuthProvider()
export { isCloudConfigured }
