'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getAvailableStock() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_items')
    .select('*, serial_numbers(*)')
    .gt('quantity', 0)

  if (error) return { error: error.message }

  // Filter serial numbers to only those in warehouse status
  const formattedData = data.map(item => ({
    ...item,
    serial_numbers: item.serial_numbers?.filter((sn: any) => sn.status === 'warehouse') || []
  }))

  return { stockItems: formattedData }
}

export async function getTechnicians() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'Technician')
    .eq('status', 'active')

  if (error) return { error: error.message }
  return { technicians: data }
}

export async function createAllocation(data: {
  technician_id: string;
  items: {
    stock_item_id: string;
    quantity: number;
    serial_number_ids?: string[];
  }[];
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // We need to use a transaction-like approach via RPC if possible,
  // but since we don't have RPC set up in schema.sql, we'll do sequential updates
  // In a real app, you'd want a Postgres function for this to ensure atomicity.

  for (const item of data.items) {
    // 1. Create Allocation record
    const { data: allocation, error: allocError } = await supabase
      .from('allocations')
      .insert({
        admin_id: user.id,
        technician_id: data.technician_id,
        stock_item_id: item.stock_item_id,
        quantity: item.quantity,
        status: 'pending_confirmation'
      })
      .select()
      .single()

    if (allocError) return { error: allocError.message }

    // 2. Decrement stock quantity
    const { data: currentStock, error: stockFetchError } = await supabase
      .from('stock_items')
      .select('quantity')
      .eq('id', item.stock_item_id)
      .single()

    if (stockFetchError) return { error: stockFetchError.message }

    await supabase
      .from('stock_items')
      .update({ quantity: currentStock.quantity - item.quantity })
      .eq('id', item.stock_item_id)

    // 3. Handle Serials
    if (item.serial_number_ids && item.serial_number_ids.length > 0) {
      // Link serials
      const serialLinks = item.serial_number_ids.map(snId => ({
        allocation_id: allocation.id,
        serial_number_id: snId
      }))
      await supabase.from('allocation_serials').insert(serialLinks)

      // Update serial status
      await supabase
        .from('serial_numbers')
        .update({ status: 'allocated' })
        .in('id', item.serial_number_ids)
    }

    // 4. Audit Log
    await supabase.from('audit_logs').insert({
      action: 'EQUIPMENT_ALLOCATED',
      user_id: user.id,
      details: {
        allocation_id: allocation.id,
        technician_id: data.technician_id,
        stock_item_id: item.stock_item_id,
        quantity: item.quantity
      }
    })
  }

  revalidatePath('/admin/allocations')
  revalidatePath('/admin/dashboard')

  return { success: true }
}
