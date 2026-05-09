'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Role, UserStatus } from '@/types'

export async function getUsers() {
  const supabase = await createClient()

  // First verify the current user is an admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'Admin') {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { users: data }
}

export async function updateUser(userId: string, updates: { role?: Role; status?: UserStatus }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'Admin') {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
