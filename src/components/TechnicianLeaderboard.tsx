'use client'

type Props = {
  data: { email: string, count: number }[]
}

export default function TechnicianLeaderboard({ data }: Props) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Top Technicians (Allocations)</h2>
      {!data || data.length === 0 ? (
        <p className="text-gray-500 text-sm">No allocation data available.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {data.map((tech, index) => (
            <li key={tech.email} className="py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-700'
                }`}>
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-900">{tech.email}</span>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{tech.count} units</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
