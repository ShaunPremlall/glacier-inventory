'use server'

import { db } from '@/lib/firebase/server'
import { getUserSession } from '@/lib/actions/auth'

export async function getDashboardData() {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  try {
    // 1. Low Stock Items
    const stockSnap = await db.collection('stock_items')
      .where('quantity', '<=', 5)
      .orderBy('quantity', 'asc')
      .limit(5)
      .get()

    const lowStock = stockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // 2. Usage Trend (Last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const auditLogsSnap = await db.collection('audit_logs')
      .where('action', '==', 'EQUIPMENT_ALLOCATED')
      .where('created_at', '>=', thirtyDaysAgo.toISOString())
      .get()

    // Aggregate by date
    const trendMap: Record<string, number> = {}

    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      trendMap[dateStr] = 0
    }

    auditLogsSnap.forEach(doc => {
      const data = doc.data()
      const dateStr = data.created_at.split('T')[0]
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr] += (data.details.quantity || 0)
      }
    })

    const usageTrend = Object.keys(trendMap).map(date => ({
      date: date.substring(5), // MM-DD
      allocations: trendMap[date]
    }))

    // 3. Technician Leaderboard
    const allocationsSnap = await db.collection('allocations').get()
    const leaderMap: Record<string, { email: string, count: number }> = {}

    // Fetch all profiles to map technician IDs to emails
    const profilesSnap = await db.collection('profiles').get()
    const profilesMap: Record<string, string> = {}
    profilesSnap.forEach(doc => {
      profilesMap[doc.id] = doc.data().email || 'Unknown'
    })

    allocationsSnap.forEach(doc => {
      const data = doc.data()
      const email = profilesMap[data.technician_id] || 'Unknown'

      if (!leaderMap[data.technician_id]) {
        leaderMap[data.technician_id] = { email, count: 0 }
      }
      leaderMap[data.technician_id].count += data.quantity
    })

    const leaderboard = Object.values(leaderMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      lowStock,
      usageTrend,
      leaderboard
    }
  } catch (error: any) {
    return { error: error.message }
  }
}
