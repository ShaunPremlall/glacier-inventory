'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase/server'
import { getUserSession } from '@/lib/actions/auth'

export async function getPendingReturns() {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  try {
    const logsSnapshot = await db.collection('audit_logs')
      .where('action', '==', 'RETURN_INITIATED')
      .orderBy('created_at', 'desc')
      .get()

    const acceptedLogsSnapshot = await db.collection('audit_logs')
      .where('action', '==', 'RETURN_ACCEPTED')
      .get()

    const acceptedReturnLogIds = acceptedLogsSnapshot.docs.map(doc => doc.data().details.original_log_id)

    const pendingReturns: any[] = []

    for (const doc of logsSnapshot.docs) {
      if (!acceptedReturnLogIds.includes(doc.id)) {
        const data = doc.data()
        // Fetch user profile for email
        let email = 'Unknown User'
        if (data.user_id) {
           const profileDoc = await db.collection('profiles').doc(data.user_id).get()
           if (profileDoc.exists) email = profileDoc.data()?.email || email
        }

        pendingReturns.push({
          id: doc.id,
          user_id: data.user_id,
          profiles: { email },
          details: data.details,
          created_at: data.created_at
        })
      }
    }

    return { returns: pendingReturns }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function acceptReturn(returnLogId: string, details: any) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  const { allocation_id, reason, quantity, serial_ids } = details

  try {
    await db.runTransaction(async (t) => {
      // 1. Fetch the original allocation
      const allocationRef = db.collection('allocations').doc(allocation_id)
      const allocationDoc = await t.get(allocationRef)

      if (!allocationDoc.exists) throw new Error('Allocation not found')
      const allocation = allocationDoc.data()!

      // 2. Logic based on reason
      if (reason === 'Unused') {
        const stockRef = db.collection('stock_items').doc(allocation.stock_item_id)
        const stockDoc = await t.get(stockRef)
        if (stockDoc.exists) {
          t.update(stockRef, { quantity: stockDoc.data()!.quantity + quantity })
        }

        if (serial_ids && serial_ids.length > 0) {
          serial_ids.forEach((id: string) => {
            t.update(db.collection('serial_numbers').doc(id), { status: 'warehouse' })
          })
        }
      } else if (reason === 'Damaged' || reason === 'Faulty') {
        if (serial_ids && serial_ids.length > 0) {
          serial_ids.forEach((id: string) => {
            t.update(db.collection('serial_numbers').doc(id), {
              status: reason === 'Damaged' ? 'quarantine' : 'faulty'
            })
          })
        }
      }

      // 3. Update allocation status
      if (quantity === allocation.quantity) {
         t.update(allocationRef, { status: 'returned' })
      } else {
         t.update(allocationRef, { quantity: allocation.quantity - quantity })
      }

      // 4. Log the acceptance
      const auditRef = db.collection('audit_logs').doc()
      t.set(auditRef, {
        action: 'RETURN_ACCEPTED',
        user_id: session.uid,
        details: {
          original_log_id: returnLogId,
          allocation_id,
          reason,
          quantity_returned: quantity,
          serial_ids
        },
        created_at: new Date().toISOString()
      })
    })

    revalidatePath('/admin/returns')
    revalidatePath('/admin/stock')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
