import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Helper to get formatted private key
function getPrivateKey() {
  const pk = process.env.FIREBASE_PRIVATE_KEY
  if (!pk) return undefined
  return pk.replace(/\\n/g, '\n')
}

// In a real production app, ensure these are loaded securely
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: getPrivateKey(),
}

let app

if (!getApps().length) {
  // Only initialize if we have the credentials, otherwise some local dev flows might break
  // if not fully mocked, but for Next.js server actions, this is required.
  if (firebaseAdminConfig.privateKey) {
    app = initializeApp({
      credential: cert(firebaseAdminConfig),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    })
  } else {
    // Fallback for completely local / unconfigured environments
    app = initializeApp({ projectId: firebaseAdminConfig.projectId || 'demo-project' })
  }
} else {
  app = getApp()
}

const adminAuth = getAuth(app)
const db = getFirestore(app)
const adminStorage = getStorage(app)

export { app as adminApp, adminAuth, db, adminStorage }
