'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase/server'
import { getUserSession } from '@/lib/actions/auth'

export async function getAvailableStock() {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  try {
    const stockSnapshot = await db.collection('stock_items').where('quantity', '>', 0).get()
    const stockItems: any[] = []

    for (const doc of stockSnapshot.docs) {
      const itemData = { id: doc.id, ...doc.data() } as any

      let serialsData: any[] = []
      if (itemData.is_serialized) {
        const serialsSnapshot = await db.collection('serial_numbers')
          .where('stock_item_id', '==', doc.id)
          .where('status', '==', 'warehouse')
          .get()
        serialsData = serialsSnapshot.docs.map(s => ({ id: s.id, ...s.data() }))
      }

      stockItems.push({
        ...itemData,
        serial_numbers: serialsData
      })
    }

    return { stockItems }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getTechnicians() {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  try {
    const snapshot = await db.collection('profiles')
      .where('role', '==', 'Technician')
      .where('status', '==', 'active')
      .get()

    const technicians = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { technicians }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function createAllocation(data: {
  technician_id: string;
  items: {
    stock_item_id: string;
    quantity: number;
    serial_number_ids?: string[];
  }[];
}) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  try {
    // In Firestore, we can use a transaction or batch to ensure atomic updates across documents.
    await db.runTransaction(async (t) => {
      // First, read all necessary stock items to ensure we have enough quantity before making any changes.
      const stockItemRefs = data.items.map(item => db.collection('stock_items').doc(item.stock_item_id))
      const stockDocs = await t.getAll(...stockItemRefs)

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        const stockDoc = stockDocs[i]

        if (!stockDoc.exists) throw new Error(`Stock item ${item.stock_item_id} does not exist`)
        const currentQty = stockDoc.data()?.quantity || 0

        if (currentQty < item.quantity) {
           throw new Error(`Not enough quantity for item ${stockDoc.data()?.name}`)
        }

        // 1. Decrement stock quantity
        t.update(stockDoc.ref, { quantity: currentQty - item.quantity })

        // 2. Create Allocation record
        const allocationRef = db.collection('allocations').doc()
        t.set(allocationRef, {
          admin_id: session.uid,
          technician_id: data.technician_id,
          stock_item_id: item.stock_item_id,
          quantity: item.quantity,
          serial_number_ids: item.serial_number_ids || [],
          status: 'pending_confirmation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // 3. Update Serials
        if (item.serial_number_ids && item.serial_number_ids.length > 0) {
           item.serial_number_ids.forEach(snId => {
              const serialRef = db.collection('serial_numbers').doc(snId)
              t.update(serialRef, { status: 'allocated' })
           })
        }

        // 4. Audit Log
        const auditRef = db.collection('audit_logs').doc()
        t.set(auditRef, {
          action: 'EQUIPMENT_ALLOCATED',
          user_id: session.uid,
          details: {
            allocation_id: allocationRef.id,
            technician_id: data.technician_id,
            stock_item_id: item.stock_item_id,
            quantity: item.quantity
          },
          created_at: new Date().toISOString()
        })
      }
    })

    revalidatePath('/admin/allocations')
    revalidatePath('/admin/dashboard')

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
