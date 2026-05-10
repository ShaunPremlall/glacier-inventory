'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase/server'
import { Role, UserStatus, Profile } from '@/types'
import { getUserSession } from '@/lib/actions/auth'

export async function getUsers() {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }

  const profileRef = await db.collection('profiles').doc(session.uid).get()
  const profile = profileRef.data() as Profile | undefined

  if (profile?.role !== 'Admin') {
    return { error: 'Unauthorized' }
  }

  try {
    const snapshot = await db.collection('profiles').orderBy('created_at', 'desc').get()
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile))
    return { users }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateUser(userId: string, updates: { role?: Role; status?: UserStatus }) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }

  const profileRef = await db.collection('profiles').doc(session.uid).get()
  const profile = profileRef.data() as Profile | undefined

  if (profile?.role !== 'Admin') {
    return { error: 'Unauthorized' }
  }

  try {
    await db.collection('profiles').doc(userId).update(updates)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
