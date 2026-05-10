import { redirect } from 'next/navigation'
import { getUserSession } from '@/lib/actions/auth'
import { db } from '@/lib/firebase/server'
import { Profile } from '@/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/auth/sign-in')
  }

  const profileRef = await db.collection('profiles').doc(session.uid).get()
  const profile = profileRef.data() as Profile | undefined

  if (!profile || profile.status !== 'active') {
    redirect('/auth/pending')
  }

  if (profile.role !== 'Admin') {
    redirect('/technician/dashboard')
  }

  return <>{children}</>
}
