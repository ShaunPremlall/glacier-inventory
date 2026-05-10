'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { getMonthlyUsageData } from '@/lib/actions/reports'
import { generateInventoryInsights } from '@/lib/actions/ai'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [generatingInsight, setGeneratingInsight] = useState(false)

  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  async function handleGenerateReport() {
    setLoading(true)
    setAiInsight(null)
    const result = await getMonthlyUsageData(selectedYear, selectedMonth)

    if (result.error) {
      toast.error(result.error)
    } else {
      setReportData(result.data)
      toast.success('Report data generated')
    }
    setLoading(false)
  }

  async function handleGenerateInsight() {
    if (!reportData) return
    setGeneratingInsight(true)
    const result = await generateInventoryInsights(selectedYear, selectedMonth)
    if (result.error) {
       toast.error(result.error)
    } else if (result.insight) {
       setAiInsight(result.insight)
       toast.success('AI insights generated')
    }
    setGeneratingInsight(false)
  }

  function exportToExcel() {
    if (!reportData) return

    const summaryData = [
      { Metric: 'Total Units Issued', Value: reportData.totalUnitsIssued },
      { Metric: 'Total Units Installed', Value: reportData.totalUnitsInstalled },
      { Metric: 'Total Stock on Hand', Value: reportData.totalStockOnHand },
    ]

    const stockDetails = reportData.stockDetails?.map((s: any) => ({
      Category: s.category,
      Name: s.name,
      Quantity: s.quantity
    })) || []

    const wb = XLSX.utils.book_new()

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    const detailSheet = XLSX.utils.json_to_sheet(stockDetails)
    XLSX.utils.book_append_sheet(wb, detailSheet, 'Stock Details')

    XLSX.writeFile(wb, `Inventory_Report_${selectedYear}_${selectedMonth}.xlsx`)
  }

  function exportToPDF() {
    if (!reportData) return

    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(`Inventory Report - ${selectedMonth}/${selectedYear}`, 14, 22)

    doc.setFontSize(12)
    doc.text(`Total Units Issued: ${reportData.totalUnitsIssued}`, 14, 32)
    doc.text(`Total Units Installed: ${reportData.totalUnitsInstalled}`, 14, 40)
    doc.text(`Total Stock on Hand: ${reportData.totalStockOnHand}`, 14, 48)

    const stockData = reportData.stockDetails?.map((s: any) => [s.category, s.name, s.quantity]) || []

    ;(doc as any).autoTable({
      startY: 60,
      head: [['Category', 'Item Name', 'Quantity']],
      body: stockData,
    })

    doc.save(`Inventory_Report_${selectedYear}_${selectedMonth}.pdf`)
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Automated Reporting</h1>
        <p className="mt-2 text-sm text-gray-700">
          Generate monthly usage and stock reports for the Accounts Department.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8 flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
          >
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Data'}
        </button>
      </div>

      {reportData && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-lg font-medium text-gray-900">Report Summary</h2>
            <div className="flex gap-2">
              <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 shadow-sm">
                Export to Excel
              </button>
              <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 shadow-sm">
                Export to PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Total Units Issued</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{reportData.totalUnitsIssued}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Total Units Installed</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{reportData.totalUnitsInstalled}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Total Stock on Hand</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{reportData.totalStockOnHand}</p>
            </div>
          </div>

          <div className="mb-8 border border-indigo-100 bg-indigo-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-md font-medium text-indigo-900">Google AI Studio Insights</h3>
               <button
                 onClick={handleGenerateInsight}
                 disabled={generatingInsight}
                 className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
               >
                 {generatingInsight ? 'Analyzing...' : 'Generate AI Insights'}
               </button>
            </div>
            {aiInsight ? (
              <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">{aiInsight}</p>
            ) : (
              <p className="text-sm text-indigo-400 italic">Click the button to analyze this month's data using Gemini.</p>
            )}
          </div>

          <div>
             <h3 className="text-md font-medium text-gray-900 mb-4">Stock Details Snapshot</h3>
             <div className="max-h-64 overflow-y-auto border rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Available</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                     {reportData.stockDetails?.map((item: any, idx: number) => (
                       <tr key={idx}>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                       </tr>
                     ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
