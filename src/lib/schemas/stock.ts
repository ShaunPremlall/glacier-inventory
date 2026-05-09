import { z } from 'zod'

export const addStockSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  is_serialized: z.boolean(),
  quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
  serial_numbers: z.array(z.object({
    value: z.string().min(1, 'Serial number cannot be empty')
  })).optional(),
  image: z.any().optional(), // Using any for File on client
}).superRefine((data, ctx) => {
  if (data.is_serialized) {
    if (!data.serial_numbers || data.serial_numbers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Serial numbers are required for serialized items',
        path: ['serial_numbers'],
      })
    }
    // Also validate uniqueness within the form itself
    const values = data.serial_numbers?.map(s => s.value) || []
    const uniqueValues = new Set(values)
    if (values.length !== uniqueValues.size) {
       ctx.addIssue({
         code: z.ZodIssueCode.custom,
         message: 'Serial numbers must be unique',
         path: ['serial_numbers']
       })
    }
  } else {
    if (data.quantity === undefined || data.quantity < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantity is required for non-serialized items',
        path: ['quantity'],
      })
    }
  }
})

export type AddStockFormData = z.infer<typeof addStockSchema>
