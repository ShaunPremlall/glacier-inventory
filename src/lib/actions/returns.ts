'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getPendingReturns() {
  const supabase = await createClient()

  // We are using audit_logs where action = 'RETURN_INITIATED' to find pending returns
  // In a real system, we'd have a returns table. Let's fetch these logs.
  // We need to fetch the allocation details for context.

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('id, user_id, details, created_at, profiles(email)')
    .eq('action', 'RETURN_INITIATED')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  // For each log, fetch the allocation context if needed.
  // But wait, if an admin processes a return, we need to mark it as processed so it doesn't show up again.
  // Since we are using audit_logs, there's no "status" field on the log.
  // We can add a new audit_log 'RETURN_ACCEPTED' and filter out initiated returns that have a corresponding accepted log.

  const { data: acceptedLogs } = await supabase
    .from('audit_logs')
    .select('details')
    .eq('action', 'RETURN_ACCEPTED')

  const acceptedReturnLogIds = acceptedLogs?.map(log => log.details.original_log_id) || []

  const pendingReturns = logs.filter(log => !acceptedReturnLogIds.includes(log.id))

  return { returns: pendingReturns }
}

export async function acceptReturn(returnLogId: string, details: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Extract necessary details
  const { allocation_id, reason, quantity, serial_ids } = details

  // 1. Fetch the original allocation
  const { data: allocation, error: allocError } = await supabase
    .from('allocations')
    .select('*')
    .eq('id', allocation_id)
    .single()

  if (allocError) return { error: allocError.message }

  // 2. Logic based on reason
  if (reason === 'Unused') {
    // Add back to warehouse
    const { data: currentStock } = await supabase
      .from('stock_items')
      .select('quantity')
      .eq('id', allocation.stock_item_id)
      .single()

    await supabase
      .from('stock_items')
      .update({ quantity: currentStock!.quantity + quantity })
      .eq('id', allocation.stock_item_id)

    if (serial_ids && serial_ids.length > 0) {
      await supabase
        .from('serial_numbers')
        .update({ status: 'warehouse' })
        .in('id', serial_ids)
    }
  } else if (reason === 'Damaged' || reason === 'Faulty') {
    // Quarantine/Repair status, do NOT add quantity back to available stock
    if (serial_ids && serial_ids.length > 0) {
      await supabase
        .from('serial_numbers')
        .update({ status: reason === 'Damaged' ? 'quarantine' : 'faulty' })
        .in('id', serial_ids)
    }
    // If it's not serialized, we'd ideally have a separate tracking for damaged generic items,
    // but for now, we just don't add it back to available `quantity`.
  }

  // 3. Update allocation status
  // If returning partial quantity, this logic is more complex. For now, we assume returning the whole allocation or marking the allocation as returned.
  // A better approach is to reduce allocation quantity, but let's just mark it 'returned' for simplicity if the whole qty is returned.
  if (quantity === allocation.quantity) {
     await supabase
       .from('allocations')
       .update({ status: 'returned' })
       .eq('id', allocation_id)
  } else {
     // Partial return. Subtract quantity from allocation.
     await supabase
       .from('allocations')
       .update({ quantity: allocation.quantity - quantity })
       .eq('id', allocation_id)
  }

  // 4. Log the acceptance
  await supabase.from('audit_logs').insert({
    action: 'RETURN_ACCEPTED',
    user_id: user.id,
    details: {
      original_log_id: returnLogId,
      allocation_id,
      reason,
      quantity_returned: quantity,
      serial_ids
    }
  })

  revalidatePath('/admin/returns')
  revalidatePath('/admin/stock')
  return { success: true }
}
