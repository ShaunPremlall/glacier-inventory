'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getAvailableStock, getTechnicians, createAllocation } from '@/lib/actions/allocations'

type StockItem = {
  id: string
  name: string
  quantity: number
  is_serialized: boolean
  serial_numbers: { id: string; serial_number: string; status: string }[]
}

type Technician = {
  id: string
  email: string
}

type CartItem = {
  stock_item: StockItem
  quantity: number
  selected_serial_ids: string[]
}

export default function NewAllocationPage() {
  const router = useRouter()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedTech, setSelectedTech] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    async function fetchData() {
      const [stockRes, techRes] = await Promise.all([
        getAvailableStock(),
        getTechnicians()
      ])

      if (stockRes.error) toast.error(stockRes.error)
      else setStockItems(stockRes.stockItems || [])

      if (techRes.error) toast.error(techRes.error)
      else setTechnicians(techRes.technicians as Technician[] || [])

      setLoading(false)
    }
    fetchData()
  }, [])

  function handleAddToCart(item: StockItem) {
    if (cart.find(c => c.stock_item.id === item.id)) {
      toast.error('Item already in cart')
      return
    }
    setCart([...cart, { stock_item: item, quantity: 1, selected_serial_ids: [] }])
  }

  function handleRemoveFromCart(itemId: string) {
    setCart(cart.filter(c => c.stock_item.id !== itemId))
  }

  function handleQuantityChange(itemId: string, qty: number) {
    setCart(cart.map(c => c.stock_item.id === itemId ? { ...c, quantity: qty } : c))
  }

  function handleSerialSelect(itemId: string, serialId: string, checked: boolean) {
    setCart(cart.map(c => {
      if (c.stock_item.id === itemId) {
        let newSerials = [...c.selected_serial_ids]
        if (checked) newSerials.push(serialId)
        else newSerials = newSerials.filter(id => id !== serialId)
        return { ...c, selected_serial_ids: newSerials, quantity: newSerials.length }
      }
      return c
    }))
  }

  async function handleSubmit() {
    if (!selectedTech) {
      toast.error('Please select a technician')
      return
    }
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    // Validate serialized items
    for (const item of cart) {
      if (item.stock_item.is_serialized && item.quantity !== item.selected_serial_ids.length) {
        toast.error(`Please select exactly ${item.quantity} serial numbers for ${item.stock_item.name}`)
        return
      }
      if (item.quantity > item.stock_item.quantity) {
        toast.error(`Cannot allocate more ${item.stock_item.name} than available in stock`)
        return
      }
    }

    setSubmitting(true)

    const allocationData = {
      technician_id: selectedTech,
      items: cart.map(c => ({
        stock_item_id: c.stock_item.id,
        quantity: c.quantity,
        serial_number_ids: c.stock_item.is_serialized ? c.selected_serial_ids : undefined
      }))
    }

    const result = await createAllocation(allocationData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Items issued to technician')
      router.push('/admin/dashboard')
    }

    setSubmitting(false)
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">New Allocation</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Col: Stock Selection */}
        <div>
          <h2 className="text-lg font-medium mb-4">Available Stock</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {stockItems.map(item => (
              <div key={item.id} className="border p-4 rounded-md shadow-sm bg-white flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">Available: {item.quantity}</p>
                  {item.is_serialized && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded mt-1 inline-block">Serialized</span>}
                </div>
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={cart.some(c => c.stock_item.id === item.id)}
                  className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Cart & Issue */}
        <div>
          <h2 className="text-lg font-medium mb-4">Allocation Details</h2>

          <div className="bg-white border rounded-md p-6 shadow-sm mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Technician</label>
            <select
              value={selectedTech}
              onChange={e => setSelectedTech(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
            >
              <option value="">-- Choose a technician --</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>{tech.email}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-md font-medium mb-4 border-b pb-2">Cart</h3>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No items added yet.</p>
            ) : (
              <div className="space-y-6">
                {cart.map(cartItem => (
                  <div key={cartItem.stock_item.id} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{cartItem.stock_item.name}</h4>
                      <button onClick={() => handleRemoveFromCart(cartItem.stock_item.id)} className="text-red-500 text-sm">Remove</button>
                    </div>

                    {!cartItem.stock_item.is_serialized ? (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={cartItem.stock_item.quantity}
                          value={cartItem.quantity}
                          onChange={e => handleQuantityChange(cartItem.stock_item.id, parseInt(e.target.value) || 1)}
                          className="border rounded w-20 px-2 py-1 text-sm"
                        />
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-gray-600 mb-1">Select Serials (selected: {cartItem.selected_serial_ids.length}):</p>
                        <div className="max-h-32 overflow-y-auto border p-2 rounded">
                           {cartItem.stock_item.serial_numbers.map(sn => (
                             <label key={sn.id} className="flex items-center gap-2 text-sm mb-1">
                               <input
                                 type="checkbox"
                                 checked={cartItem.selected_serial_ids.includes(sn.id)}
                                 onChange={e => handleSerialSelect(cartItem.stock_item.id, sn.id, e.target.checked)}
                                 className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                               />
                               {sn.serial_number}
                             </label>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
             <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0 || !selectedTech}
                className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50"
             >
                {submitting ? 'Issuing...' : 'Issue to Technician'}
             </button>
          </div>

        </div>
      </div>
    </div>
  )
}
