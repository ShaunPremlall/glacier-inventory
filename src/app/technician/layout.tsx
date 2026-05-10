import { redirect } from 'next/navigation'
import { getUserSession } from '@/lib/actions/auth'
import { db } from '@/lib/firebase/server'
import { Profile } from '@/types'

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/auth/sign-in')
  }

  const profileRef = await db.collection('profiles').doc(session.uid).get()
  const profile = profileRef.data() as Profile | undefined

  if (!profile || profile.status !== 'active') {
    redirect('/auth/pending')
  }

  // Both Admins and Technicians might want to see the technician dashboard for testing,
  // but strictly, it's for Technicians. We'll allow Admins as well just in case.
  if (profile.role !== 'Technician' && profile.role !== 'Admin') {
    redirect('/auth/sign-in')
  }

  return <>{children}</>
}
