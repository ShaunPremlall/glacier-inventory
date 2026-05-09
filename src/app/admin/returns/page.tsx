'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getPendingReturns, acceptReturn } from '@/lib/actions/returns'

type ReturnItem = {
  id: string
  user_id: string
  profiles: { email: string }
  created_at: string
  details: {
    allocation_id: string
    reason: string
    quantity: number
    serial_ids?: string[]
  }
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function fetchReturns() {
    setLoading(true)
    const result = await getPendingReturns()
    if (result.error) {
      toast.error(result.error)
    } else {
      setReturns(result.returns as any || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  async function handleAcceptReturn(item: ReturnItem) {
    setProcessingId(item.id)
    const result = await acceptReturn(item.id, item.details)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Return processed successfully')
      fetchReturns()
    }
    setProcessingId(null)
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading pending returns...</div>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Process Returns</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review and accept items returned by technicians.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Technician
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Reason
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Quantity
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Serials Count
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date Requested
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                        No pending returns.
                      </td>
                    </tr>
                  ) : (
                    returns.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {item.profiles?.email || 'Unknown User'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            item.details.reason === 'Unused' ? 'bg-blue-100 text-blue-800' :
                            item.details.reason === 'Damaged' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.details.reason}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.details.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.details.serial_ids?.length || 0}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleAcceptReturn(item)}
                            disabled={processingId === item.id}
                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                          >
                            {processingId === item.id ? 'Processing...' : 'Accept Return'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
