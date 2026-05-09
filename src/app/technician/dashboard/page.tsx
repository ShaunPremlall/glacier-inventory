'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getTechnicianDashboardData, confirmAllocation, reportAllocationIssue, initiateReturn } from '@/lib/actions/technician'
import { logout } from '@/lib/actions/auth'

type AllocationData = {
  id: string
  quantity: number
  status: string
  created_at: string
  stock_item: {
    id: string
    name: string
    is_serialized: boolean
  }
  allocation_serials: {
    serial_number: {
      id: string
      serial_number: string
    }
  }[]
}

export default function TechnicianDashboard() {
  const [pending, setPending] = useState<AllocationData[]>([])
  const [held, setHeld] = useState<AllocationData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const result = await getTechnicianDashboardData()
    if (result.error) {
      toast.error(result.error)
    } else {
      setPending(result.pending as any || [])
      setHeld(result.held as any || [])
    }
    setLoading(false)
  }

  async function handleConfirm(id: string) {
    const res = await confirmAllocation(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Receipt confirmed')
      fetchData() // Refresh lists
    }
  }

  async function handleReportIssue(id: string) {
    const issue = prompt("Please describe the issue (e.g., box is empty, item damaged):")
    if (!issue) return

    const res = await reportAllocationIssue(id, issue)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Issue reported to Admin')
    }
  }

  async function handleReturn(id: string, reason: string) {
    const alloc = held.find(h => h.id === id)
    if (!alloc) return

    let quantityToReturn = alloc.quantity
    let serialIds: string[] = []

    if (alloc.stock_item.is_serialized && alloc.allocation_serials.length > 0) {
      // For simplicity, returning all serials in this allocation for now
      // A more robust flow would allow selecting specific serials to return
      serialIds = alloc.allocation_serials.map(as => as.serial_number.id)
    } else if (alloc.quantity > 1) {
       const qtyStr = prompt(`How many to return? (Max: ${alloc.quantity})`, alloc.quantity.toString())
       if (!qtyStr) return
       quantityToReturn = parseInt(qtyStr, 10)
       if (isNaN(quantityToReturn) || quantityToReturn < 1 || quantityToReturn > alloc.quantity) {
          toast.error("Invalid quantity")
          return
       }
    }

    const res = await initiateReturn(id, { reason, quantity: quantityToReturn, serial_ids: serialIds.length > 0 ? serialIds : undefined })
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Return initiated for reason: ${reason}`)
      fetchData()
    }
  }

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Technician Dashboard</h1>
        <button onClick={() => logout()} className="text-sm text-red-600 hover:text-red-800">
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Gear */}
        <div>
          <h2 className="text-lg font-medium mb-4 text-orange-600">My Pending Gear</h2>
          {pending.length === 0 ? (
            <p className="text-gray-500 bg-white p-4 rounded shadow-sm border">No pending items.</p>
          ) : (
            <div className="space-y-4">
              {pending.map(alloc => (
                <div key={alloc.id} className="bg-white p-4 rounded shadow-sm border border-orange-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{alloc.stock_item.name}</h3>
                      <p className="text-sm text-gray-500">Qty: {alloc.quantity}</p>
                      <p className="text-xs text-gray-400">Allocated: {new Date(alloc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {alloc.stock_item.is_serialized && alloc.allocation_serials.length > 0 && (
                    <div className="mt-2 mb-4 bg-gray-50 p-2 rounded text-sm text-gray-700">
                      <strong>Serials:</strong> {alloc.allocation_serials.map(as => as.serial_number.serial_number).join(', ')}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleConfirm(alloc.id)}
                      className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700"
                    >
                      Confirm Receipt
                    </button>
                    <button
                      onClick={() => handleReportIssue(alloc.id)}
                      className="bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded text-sm hover:bg-red-50"
                    >
                      Report Issue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Currently Held */}
        <div>
          <h2 className="text-lg font-medium mb-4 text-green-600">Currently Held</h2>
          {held.length === 0 ? (
            <p className="text-gray-500 bg-white p-4 rounded shadow-sm border">No items currently held.</p>
          ) : (
            <div className="space-y-4">
              {held.map(alloc => (
                <div key={alloc.id} className="bg-white p-4 rounded shadow-sm border border-green-200">
                  <h3 className="font-medium text-gray-900">{alloc.stock_item.name}</h3>
                  <p className="text-sm text-gray-500">Qty: {alloc.quantity}</p>
                  {alloc.stock_item.is_serialized && alloc.allocation_serials.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Serials: {alloc.allocation_serials.map(as => as.serial_number.serial_number).join(', ')}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">Initiate Return:</div>
                    <div className="flex gap-2 flex-wrap">
                       <button
                         onClick={() => handleReturn(alloc.id, 'Unused')}
                         className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded border border-gray-300"
                       >
                         Return (Unused)
                       </button>
                       <button
                         onClick={() => handleReturn(alloc.id, 'Damaged')}
                         className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-800 px-3 py-1.5 rounded border border-orange-200"
                       >
                         Return (Damaged)
                       </button>
                       <button
                         onClick={() => handleReturn(alloc.id, 'Faulty')}
                         className="text-xs bg-red-50 hover:bg-red-100 text-red-800 px-3 py-1.5 rounded border border-red-200"
                       >
                         Return (Faulty)
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
