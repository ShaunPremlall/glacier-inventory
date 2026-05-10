'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addStockSchema, type AddStockFormData } from '@/lib/schemas/stock'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { addStockItem } from '@/lib/actions/stock'

export default function AddStockPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddStockFormData>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      is_serialized: false,
      serial_numbers: [{ value: '' }],
      quantity: 1,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'serial_numbers',
  })

  const isSerialized = watch('is_serialized')

  async function onSubmit(data: AddStockFormData) {
    setIsSubmitting(true)
    try {
      // Create FormData to handle file upload
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('category', data.category)
      if (data.description) formData.append('description', data.description)
      formData.append('is_serialized', String(data.is_serialized))

      if (data.is_serialized) {
         formData.append('serial_numbers', JSON.stringify(data.serial_numbers?.map(s => s.value)))
      } else {
         // quantity is a number, we must safely stringify it
         formData.append('quantity', String(data.quantity || 1))
      }

      // Check if image exists and has length (it is a FileList on the client)
      if (data.image && data.image.length > 0) {
        formData.append('image', data.image[0])
      }

      const result = await addStockItem(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Stock added successfully')
        router.push('/admin/dashboard') // Or to stock list
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Add New Stock
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
              Item Name
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                type="text"
                {...register('name')}
                className="block w-full max-w-lg rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="category" className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
              Category
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                type="text"
                {...register('category')}
                placeholder="e.g., ONT, Router, Cable"
                className="block w-full max-w-lg rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
              />
              {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category.message}</p>}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
              Description
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <textarea
                {...register('description')}
                rows={3}
                className="block w-full max-w-lg rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
            <label className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
              Serialized Item?
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <div className="flex items-center h-6">
                <input
                  type="checkbox"
                  {...register('is_serialized')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          {!isSerialized ? (
            <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
              <label htmlFor="quantity" className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
                Quantity
              </label>
              <div className="mt-2 sm:col-span-2 sm:mt-0">
                <input
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  min="1"
                  className="block w-full max-w-lg rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                />
                {errors.quantity && <p className="mt-2 text-sm text-red-600">{errors.quantity.message}</p>}
              </div>
            </div>
          ) : (
            <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
              <label className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
                Serial Numbers
              </label>
              <div className="mt-2 sm:col-span-2 sm:mt-0 space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      {...register(`serial_numbers.${index}.value` as const)}
                      placeholder={`Serial #${index + 1}`}
                      className="block w-full max-w-lg rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                {errors.serial_numbers && <p className="mt-2 text-sm text-red-600">{errors.serial_numbers.message}</p>}
                <button
                  type="button"
                  onClick={() => append({ value: '' })}
                  className="mt-2 inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <Plus className="-ml-0.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                  Add Serial Number
                </button>
              </div>
            </div>
          )}

          <div className="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
            <label htmlFor="image" className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5">
              Image (Optional)
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                type="file"
                accept="image/*"
                {...register('image')}
                className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:py-1.5 file:px-3 file:text-sm file:font-semibold file:text-indigo-600 hover:file:bg-indigo-100"
              />
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Stock'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
