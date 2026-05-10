'use server'

import { revalidatePath } from 'next/cache'
import { db, adminStorage } from '@/lib/firebase/server'
import { getUserSession } from '@/lib/actions/auth'

export async function addStockItem(formData: FormData) {
  const session = await getUserSession()
  if (!session) return { error: 'Not authenticated' }
  const profileDoc = await db.collection('profiles').doc(session.uid).get()
  if (profileDoc.data()?.role !== 'Admin') return { error: 'Unauthorized' }

  // 1. Extract and validate data
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const description = formData.get('description') as string | null
  const is_serialized = formData.get('is_serialized') === 'true'

  let quantity = 0
  let serialNumbers: string[] = []

  if (is_serialized) {
    const serialsStr = formData.get('serial_numbers') as string
    if (serialsStr) {
      serialNumbers = JSON.parse(serialsStr)
      quantity = serialNumbers.length
    }
  } else {
    quantity = parseInt(formData.get('quantity') as string, 10)
  }

  // 2. Handle image upload if exists
  let image_url: string | null = null
  const image = formData.get('image') as File | null

  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `stock-images/${fileName}`

    try {
      const bucket = adminStorage.bucket()
      const file = bucket.file(filePath)

      const buffer = Buffer.from(await image.arrayBuffer())
      await file.save(buffer, {
        metadata: { contentType: image.type }
      })

      await file.makePublic()
      image_url = `https://storage.googleapis.com/${bucket.name}/${file.name}`
    } catch (uploadError: any) {
      return { error: `Failed to upload image: ${uploadError.message}` }
    }
  }

  try {
    // 3. Batch check for serialized items (Firestore doesn't have an 'IN' query over 10 items easily,
    // but we can query them or do batched reads. For simplicity here, we assume a reasonable batch size).
    if (is_serialized && serialNumbers.length > 0) {
      const serialsRef = db.collection('serial_numbers')

      // Basic approach: query all and find overlaps, or chunk the query
      // Firestore IN limit is 30. If > 30, we'd need to chunk.
      const chunks = []
      for (let i = 0; i < serialNumbers.length; i += 30) {
          chunks.push(serialNumbers.slice(i, i + 30))
      }

      const conflicts: string[] = []
      for (const chunk of chunks) {
         const snapshot = await serialsRef.where('serial_number', 'in', chunk).get()
         if (!snapshot.empty) {
             snapshot.forEach(doc => conflicts.push(doc.data().serial_number))
         }
      }

      if (conflicts.length > 0) {
        return { error: `Serial numbers already exist in database: ${conflicts.join(', ')}` }
      }
    }

    const batch = db.batch()

    // 4. Insert into stock_items
    const stockItemRef = db.collection('stock_items').doc()
    batch.set(stockItemRef, {
      name,
      category,
      description,
      is_serialized,
      quantity,
      image_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // 5. Insert serial numbers if serialized
    if (is_serialized && serialNumbers.length > 0) {
      serialNumbers.forEach(sn => {
        const serialRef = db.collection('serial_numbers').doc()
        batch.set(serialRef, {
          stock_item_id: stockItemRef.id,
          serial_number: sn,
          status: 'warehouse',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      })
    }

    // 6. Create audit log
    const auditRef = db.collection('audit_logs').doc()
    batch.set(auditRef, {
      action: 'STOCK_INTAKE',
      user_id: session.uid,
      details: {
        items: quantity,
        category: category,
        stock_item_id: stockItemRef.id,
        is_serialized
      },
      created_at: new Date().toISOString()
    })

    await batch.commit()

    revalidatePath('/admin/dashboard')
    revalidatePath('/admin/stock')

    return { success: true }
  } catch (error: any) {
     return { error: error.message }
  }
}
