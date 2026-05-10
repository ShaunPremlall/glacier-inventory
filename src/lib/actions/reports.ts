'use server'

import { db } from '@/lib/firebase/server'
import { getUserSession } from '@/lib/actions/auth'

export async function getMonthlyUsageData(year: number, month: number) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  try {
    // Calculate start and end dates
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

    // 1. Total units issued (from audit_logs EQUIPMENT_ALLOCATED)
    const allocationsSnap = await db.collection('audit_logs')
      .where('action', '==', 'EQUIPMENT_ALLOCATED')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .get()

    let totalUnitsIssued = 0
    allocationsSnap.forEach(doc => {
       totalUnitsIssued += (doc.data().details.quantity || 0)
    })

    // 2. Total units installed (using confirmed allocations)
    const confirmedSnap = await db.collection('allocations')
      .where('status', '==', 'confirmed')
      .where('updated_at', '>=', startDate)
      .where('updated_at', '<=', endDate)
      .get()

    let totalUnitsInstalled = 0
    confirmedSnap.forEach(doc => {
       totalUnitsInstalled += (doc.data().quantity || 0)
    })

    // 3. Stock-on-Hand
    const stockSnap = await db.collection('stock_items').get()

    let totalStockOnHand = 0
    const stockDetails: any[] = []

    stockSnap.forEach(doc => {
       const data = doc.data()
       totalStockOnHand += (data.quantity || 0)
       stockDetails.push({
         name: data.name,
         quantity: data.quantity,
         category: data.category
       })
    })

    return {
      data: {
        totalUnitsIssued,
        totalUnitsInstalled,
        totalStockOnHand,
        stockDetails
      }
    }
  } catch (error: any) {
    return { error: error.message }
  }
}
