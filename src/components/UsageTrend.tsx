'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Props = {
  data: { date: string, allocations: number }[]
}

export default function UsageTrend({ data }: Props) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Equipment Allocation Trend (30 Days)</h2>
      <div className="h-64 w-full">
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for the last 30 days.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="allocations"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name="Allocations"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
