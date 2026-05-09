'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Props = {
  data: { id: string, name: string, quantity: number, category: string }[]
}

export default function LowStockWarning({ data }: Props) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Low Stock Alerts
        </h2>
        <Link href="/admin/stock/new" className="text-sm text-indigo-600 hover:text-indigo-500">
          Add Stock
        </Link>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">All items are sufficiently stocked.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-3 border border-red-200 bg-red-50 rounded-md relative overflow-hidden">
               {/* Pulse effect */}
               {item.quantity === 0 && (
                 <div className="absolute inset-0 bg-red-200 opacity-20 animate-pulse pointer-events-none"></div>
               )}
               <div className="relative z-10">
                  <p className="font-medium text-red-900 text-sm">{item.name}</p>
                  <p className="text-xs text-red-700">{item.category}</p>
               </div>
               <div className="relative z-10">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${item.quantity === 0 ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-800'}`}>
                    {item.quantity} left
                  </span>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
