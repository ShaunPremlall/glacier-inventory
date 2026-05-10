'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase/server'
import { getUserSession } from '@/lib/actions/auth'

export async function getTechnicianDashboardData() {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    const allocationsSnapshot = await db.collection('allocations')
      .where('technician_id', '==', session.uid)
      .get()

    const allocations = await Promise.all(allocationsSnapshot.docs.map(async (doc) => {
      const data = doc.data()

      // Fetch stock item details
      const stockDoc = await db.collection('stock_items').doc(data.stock_item_id).get()
      const stock_item = { id: stockDoc.id, ...stockDoc.data() }

      // Fetch serials if any
      const serialsData: any[] = []
      if (data.serial_number_ids && data.serial_number_ids.length > 0) {
        // Handle chunking if > 30 serials
        const chunks = []
        for (let i = 0; i < data.serial_number_ids.length; i += 30) {
            chunks.push(data.serial_number_ids.slice(i, i + 30))
        }

        for (const chunk of chunks) {
            // FieldPath.documentId() allows querying by doc id
            const serialsSnap = await db.collection('serial_numbers')
              .where('__name__', 'in', chunk)
              .get()
            serialsSnap.forEach(sDoc => {
               serialsData.push({
                 serial_number: { id: sDoc.id, ...sDoc.data() } // Formatting to match UI expectations
               })
            })
        }
      }

      return {
        id: doc.id,
        ...data,
        stock_item,
        allocation_serials: serialsData
      }
    }))

    const pending = allocations
      .filter((a: any) => a.status === 'pending_confirmation')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const held = allocations
      .filter((a: any) => a.status === 'confirmed' || a.status === 'return_pending')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { pending, held }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function confirmAllocation(allocationId: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    await db.collection('allocations').doc(allocationId).update({
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    revalidatePath('/technician/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function reportAllocationIssue(allocationId: string, issueDetails: string) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    await db.collection('audit_logs').add({
      action: 'ALLOCATION_ISSUE_REPORTED',
      user_id: session.uid,
      details: {
        allocation_id: allocationId,
        issue: issueDetails
      },
      created_at: new Date().toISOString()
    })

    revalidatePath('/technician/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function initiateReturn(allocationId: string, returnData: { reason: string; quantity: number; serial_ids?: string[] }) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    await db.collection('audit_logs').add({
      action: 'RETURN_INITIATED',
      user_id: session.uid,
      details: {
        allocation_id: allocationId,
        ...returnData
      },
      created_at: new Date().toISOString()
    })

    revalidatePath('/technician/dashboard')
    revalidatePath('/admin/returns')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
