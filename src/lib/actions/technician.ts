'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Keep existing getTechnicianDashboardData, confirmAllocation, reportAllocationIssue
export async function getTechnicianDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pending, error: pendingError } = await supabase
    .from('allocations')
    .select('*, stock_item:stock_items(*), allocation_serials(serial_number:serial_numbers(*))')
    .eq('technician_id', user.id)
    .eq('status', 'pending_confirmation')
    .order('created_at', { ascending: false })

  const { data: held, error: heldError } = await supabase
    .from('allocations')
    .select('*, stock_item:stock_items(*), allocation_serials(serial_number:serial_numbers(*))')
    .eq('technician_id', user.id)
    .in('status', ['confirmed', 'return_pending'])
    .order('created_at', { ascending: false })

  if (pendingError || heldError) {
    return { error: pendingError?.message || heldError?.message }
  }

  return {
    pending: pending || [],
    held: held || []
  }
}

export async function confirmAllocation(allocationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('allocations')
    .update({ status: 'confirmed' })
    .eq('id', allocationId)

  if (error) return { error: error.message }

  revalidatePath('/technician/dashboard')
  return { success: true }
}

export async function reportAllocationIssue(allocationId: string, issueDetails: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('audit_logs').insert({
    action: 'ALLOCATION_ISSUE_REPORTED',
    user_id: user.id,
    details: {
      allocation_id: allocationId,
      issue: issueDetails
    }
  })

  revalidatePath('/technician/dashboard')
  return { success: true }
}

export async function initiateReturn(allocationId: string, returnData: { reason: string; quantity: number; serial_ids?: string[] }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Create a return record or update the allocation
  // Since we don't have a dedicated `returns` table in schema.sql,
  // we will handle this by creating an audit log and updating allocation status.
  // In a real app, a `returns` table is better. Let's use `allocations` status 'returned' but it's an admin action.
  // Let's create an audit log to notify admins, and perhaps change allocation status to 'return_pending'
  // Wait, 'return_pending' is not in our AllocationStatus type constraint: 'pending_confirmation', 'confirmed', 'returned'
  // So we will just leave it 'confirmed' but log the intent, or if it's the full amount, maybe just log it.

  // For simplicity and since we must use the existing schema, we will record the return request in `audit_logs`
  await supabase.from('audit_logs').insert({
    action: 'RETURN_INITIATED',
    user_id: user.id,
    details: {
      allocation_id: allocationId,
      ...returnData
    }
  })

  // Optionally, if we had a status 'return_pending', we'd update it.
  // For now, let's just use the audit log to populate the Admin Returns view.

  revalidatePath('/technician/dashboard')
  revalidatePath('/admin/returns')
  return { success: true }
}
