'use client'

import { useState, useEffect } from 'react'
import { getDashboardData } from '@/lib/actions/dashboard'
import { toast } from 'sonner'
import UsageTrend from '@/components/UsageTrend'
import TechnicianLeaderboard from '@/components/TechnicianLeaderboard'
import LowStockWarning from '@/components/LowStockWarning'
import { logout } from '@/lib/actions/auth'
import Link from 'next/link'

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getDashboardData()
        setData(result)
      } catch (err) {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>
  if (!data) return <div className="p-8 text-center text-red-500">Error loading data.</div>

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
           <p className="text-sm text-gray-500 mt-1">Overview of inventory and allocations.</p>
        </div>
        <div className="flex gap-4 items-center">
           <Link href="/admin/stock/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
             + Add Stock
           </Link>
           <Link href="/admin/allocations/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
             + New Allocation
           </Link>
           <Link href="/admin/returns" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
             Process Returns
           </Link>
           <Link href="/admin/reports" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
             Reports
           </Link>
           <Link href="/admin/users" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
             Users
           </Link>
           <button onClick={() => logout()} className="text-sm font-medium text-red-600 hover:text-red-500 ml-4 border-l pl-4">
             Sign out
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          <UsageTrend data={data.usageTrend} />
        </div>

        {/* Side Panel */}
        <div className="space-y-8 lg:col-span-1">
          <LowStockWarning data={data.lowStock} />
          <TechnicianLeaderboard data={data.leaderboard} />
        </div>
      </div>
    </div>
  )
}
