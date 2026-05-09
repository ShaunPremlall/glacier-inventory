'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getUsers, updateUser } from '@/lib/actions/users'
import { Profile } from '@/types'

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchUsers() {
    setLoading(true)
    const result = await getUsers()
    if (result.error) {
      toast.error(result.error)
    } else if (result.users) {
      setUsers(result.users)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleUpdateStatus(userId: string, newStatus: 'active' | 'inactive') {
    const result = await updateUser(userId, { status: newStatus })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`User marked as ${newStatus}`)
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
    }
  }

  async function handleUpdateRole(userId: string, newRole: 'Admin' | 'Technician') {
    const result = await updateUser(userId, { role: newRole })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`User role updated to ${newRole}`)
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading users...</div>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all users in the system including their role and status.
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
                      Email
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Joined
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as 'Admin' | 'Technician')}
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="Technician">Technician</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleUpdateStatus(user.id, user.status === 'active' ? 'inactive' : 'active')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
