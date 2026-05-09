'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMonthlyUsageData(year: number, month: number) {
  const supabase = await createClient()

  // Calculate start and end dates
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

  // 1. Total units issued (from audit_logs EQUIPMENT_ALLOCATED)
  const { data: allocations, error: allocError } = await supabase
    .from('audit_logs')
    .select('details')
    .eq('action', 'EQUIPMENT_ALLOCATED')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (allocError) return { error: allocError.message }

  const totalUnitsIssued = allocations?.reduce((sum, log) => {
    return sum + (log.details.quantity || 0)
  }, 0) || 0

  // 2. Total units installed (We don't have an exact 'installed' flow,
  // but let's assume 'confirmed' allocations represent units in the field.
  // A real app would likely have another status for 'installed' vs 'held in van'.)
  // Let's use confirmed allocations in this month.
  const { data: confirmed, error: confError } = await supabase
    .from('allocations')
    .select('quantity')
    .eq('status', 'confirmed')
    .gte('updated_at', startDate)
    .lte('updated_at', endDate)

  if (confError) return { error: confError.message }

  const totalUnitsInstalled = confirmed?.reduce((sum, item) => sum + item.quantity, 0) || 0

  // 3. Stock-on-Hand
  const { data: stock, error: stockError } = await supabase
    .from('stock_items')
    .select('name, quantity, category')

  if (stockError) return { error: stockError.message }

  const totalStockOnHand = stock?.reduce((sum, item) => sum + item.quantity, 0) || 0

  return {
    data: {
      totalUnitsIssued,
      totalUnitsInstalled,
      totalStockOnHand,
      stockDetails: stock
    }
  }
}
