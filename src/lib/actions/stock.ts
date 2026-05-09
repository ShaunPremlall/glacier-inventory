'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addStockItem(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

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
  let image_url = null
  const image = formData.get('image') as File | null
  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `stock-images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('inventory')
      .upload(filePath, image)

    if (uploadError) {
      return { error: `Failed to upload image: ${uploadError.message}` }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('inventory')
      .getPublicUrl(filePath)

    image_url = publicUrl
  }

  // 3. Batch check for serialized items
  if (is_serialized && serialNumbers.length > 0) {
    const { data: existingSerials, error: checkError } = await supabase
      .from('serial_numbers')
      .select('serial_number')
      .in('serial_number', serialNumbers)

    if (checkError) return { error: checkError.message }

    if (existingSerials && existingSerials.length > 0) {
      const conflicts = existingSerials.map(s => s.serial_number).join(', ')
      return { error: `Serial numbers already exist in database: ${conflicts}` }
    }
  }

  // 4. Insert into stock_items
  const { data: stockItem, error: stockError } = await supabase
    .from('stock_items')
    .insert({
      name,
      category,
      description,
      is_serialized,
      quantity,
      image_url
    })
    .select()
    .single()

  if (stockError) return { error: stockError.message }

  // 5. Insert serial numbers if serialized
  if (is_serialized && serialNumbers.length > 0) {
    const serialsToInsert = serialNumbers.map(sn => ({
      stock_item_id: stockItem.id,
      serial_number: sn,
      status: 'warehouse'
    }))

    const { error: serialError } = await supabase
      .from('serial_numbers')
      .insert(serialsToInsert)

    if (serialError) {
      // Rollback stock item if serials fail
      await supabase.from('stock_items').delete().eq('id', stockItem.id)
      return { error: serialError.message }
    }
  }

  // 6. Create audit log
  await supabase.from('audit_logs').insert({
    action: 'STOCK_INTAKE',
    user_id: user.id,
    details: {
      items: quantity,
      category: category,
      stock_item_id: stockItem.id,
      is_serialized
    }
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/stock')

  return { success: true }
}
