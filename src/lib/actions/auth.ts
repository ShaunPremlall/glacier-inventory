'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { adminAuth, db } from '@/lib/firebase/server'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

// Session duration (5 days)
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000

export async function createSessionCookie(idToken: string) {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN })
    const cookieStore = await cookies()
    cookieStore.set('session', sessionCookie, {
      maxAge: SESSION_EXPIRES_IN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    // Client SDK is needed to sign in and get the ID token
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    // Fetch profile to check active status before creating session
    const profileRef = await db.collection('profiles').doc(userCredential.user.uid).get()
    const profile = profileRef.data()

    if (!profile) {
      return { error: 'Profile not found.' }
    }

    if (profile.status !== 'active') {
       // Sign out immediately if not active
       await auth.signOut()
       return { error: 'Account is pending approval. Please wait for an administrator to activate your account.' }
    }

    const idToken = await userCredential.user.getIdToken()
    const sessionResult = await createSessionCookie(idToken)
    if (sessionResult.error) {
       return { error: sessionResult.error }
    }
  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/technician/dashboard') // Redirecting to safe route, layout will redirect admin if needed
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create Profile Document
    await db.collection('profiles').doc(user.uid).set({
      email: user.email,
      role: 'Technician', // Default
      status: 'inactive', // Default
      created_at: new Date().toISOString()
    })

    const idToken = await user.getIdToken()
    const sessionResult = await createSessionCookie(idToken)
    if (sessionResult.error) {
       return { error: sessionResult.error }
    }
  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/pending')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('session')

  try {
    await auth.signOut()
  } catch (e) {
    // ignore
  }

  redirect('/auth/sign-in')
}

export async function getUserSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) return null

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    return decodedClaims
  } catch (error) {
    return null
  }
}
