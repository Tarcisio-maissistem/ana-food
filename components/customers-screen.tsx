"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MessageCircle, Edit, Phone } from "lucide-react"

interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  lastOrder: {
    date: Date
    items: string
    total: number
  }
  totalOrders: number
  notes?: string
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "João Silva",
    phone: "+5511999999999",
    address: "Rua das Flores, 123 - Centro",
    lastOrder: {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: "X-Burger, Batata Frita",
      total: 38.4,
    },
    totalOrders: 15,
    notes: "Cliente preferencial, sempre pede sem cebola",
  },
  {
    id: "2",
    name: "Maria Santos",
    phone: "+5511988888888",
    address: "Av. Principal, 456 - Jardim",
    lastOrder: {
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      items: "Pizza Margherita",
      total: 35.0,
    },
    totalOrders: 8,
  },
  {
    id: "3",
    name: "Pedro Costa",
    phone: "+5511977777777",
    lastOrder: {
      date: new Date(Date.now() - 3 * 60 * 60 * 1000),
      items: "Açaí 500ml",
      total: 18.0,
    },
    totalOrders: 3,
  },
]

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null)

  const filteredCustomers = customers.filter(
    (customer) => customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.phone.includes(searchTerm),
  )

  const openWhatsApp = (phone: string, name: string) => {
    const message = `Olá ${name}! Tudo bem? Aqui é da Ana Food.`
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }

  const updateCustomerNotes = (customerId: string, notes: string) => {
    setCustomers((prev) => prev.map((customer) => (customer.id === customerId ? { ...customer, notes } : customer)))
    setEditingCustomer(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <div className="text-sm text-gray-600">Total: {customers.length} clientes</div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold">Cliente</th>
                <th className="text-left p-4 font-semibold">Telefone</th>
                <th className="text-left p-4 font-semibold">Último Pedido</th>
                <th className="text-left p-4 font-semibold">Total Pedidos</th>
                <th className="text-left p-4 font-semibold">Observações</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      {customer.address && (
                        <div className="text-sm text-gray-600 max-w-xs truncate">{customer.address}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">{customer.phone}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="text-sm font-medium">{customer.lastOrder.items}</div>
                      <div className="text-xs text-gray-600">
                        {formatDate(customer.lastOrder.date)} - R$ {customer.lastOrder.total.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{customer.totalOrders} pedidos</Badge>
                  </td>
                  <td className="p-4 max-w-xs">
                    {editingCustomer === customer.id ? (
                      <Input
                        defaultValue={customer.notes || ""}
                        placeholder="Adicionar observação..."
                        onBlur={(e) => updateCustomerNotes(customer.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateCustomerNotes(customer.id, e.currentTarget.value)
                          }
                          if (e.key === "Escape") {
                            setEditingCustomer(null)
                          }
                        }}
                        autoFocus
                        className="text-sm"
                      />
                    ) : (
                      <div
                        className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 min-h-[20px]"
                        onClick={() => setEditingCustomer(customer.id)}
                      >
                        {customer.notes || (
                          <span className="text-gray-400 italic">Clique para adicionar observação</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingCustomer(customer.id)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWhatsApp(customer.phone, customer.name)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
