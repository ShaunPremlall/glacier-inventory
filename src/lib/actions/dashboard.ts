'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData() {
  const supabase = await createClient()

  // 1. Low Stock Items
  const { data: lowStock } = await supabase
    .from('stock_items')
    .select('id, name, quantity, category')
    // Define a threshold, e.g., 5
    .lte('quantity', 5)
    .order('quantity', { ascending: true })
    .limit(5)

  // 2. Usage Trend (Last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('created_at, details')
    .eq('action', 'EQUIPMENT_ALLOCATED')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Aggregate by date
  const trendMap: Record<string, number> = {}

  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    trendMap[dateStr] = 0
  }

  auditLogs?.forEach(log => {
    const dateStr = log.created_at.split('T')[0]
    if (trendMap[dateStr] !== undefined) {
      trendMap[dateStr] += (log.details.quantity || 0)
    }
  })

  const usageTrend = Object.keys(trendMap).map(date => ({
    date: date.substring(5), // MM-DD
    allocations: trendMap[date]
  }))

  // 3. Technician Leaderboard
  const { data: allocations } = await supabase
    .from('allocations')
    .select('technician_id, profiles(email), quantity')

  const leaderMap: Record<string, { email: string, count: number }> = {}

  allocations?.forEach(alloc => {
    // Handling possible array return from Supabase join
    const profileData = Array.isArray(alloc.profiles) ? alloc.profiles[0] : alloc.profiles
    const email = profileData?.email || 'Unknown'
    if (!leaderMap[alloc.technician_id]) {
      leaderMap[alloc.technician_id] = { email, count: 0 }
    }
    leaderMap[alloc.technician_id].count += alloc.quantity
  })

  const leaderboard = Object.values(leaderMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    lowStock: lowStock || [],
    usageTrend,
    leaderboard
  }
}
