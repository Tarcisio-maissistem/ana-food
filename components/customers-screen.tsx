"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Search, MessageCircle, Edit, Phone, Plus, Trash2, History } from "lucide-react"

interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  email?: string
  notes?: string
  on_off?: boolean
  created_at?: string
  updated_at?: string
}

interface OrderHistory {
  id: string
  order_number: string
  date: string
  total: number
  status: string
}

const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, "")
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
}

const parsePhone = (value: string): string => {
  return value.replace(/\D/g, "")
}

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  const [orderHistoryDialog, setOrderHistoryDialog] = useState(false)
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Customer | null>(null)
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [currentPage, searchTerm])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
      })

      const response = await fetch(`/api/customers?${params}`, {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const result = await response.json()
        setCustomers(result.data || [])
        setPagination(result.pagination)
      } else {
        // @ts-ignore
        window.showToast?.({
          type: "error",
          title: "Erro",
          description: "Erro ao carregar clientes",
        })
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao conectar com o servidor",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadOrderHistory = async (customerId: string) => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/orders`, {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const orders = await response.json()
        setOrderHistory(orders)
      } else {
        // @ts-ignore
        window.showToast?.({
          type: "error",
          title: "Erro",
          description: "Erro ao carregar histórico de pedidos",
        })
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao conectar com o servidor",
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  const showOrderHistory = (customer: Customer) => {
    setSelectedCustomerHistory(customer)
    setOrderHistoryDialog(true)
    loadOrderHistory(customer.id)
  }

  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    try {
      if (selectedCustomer) {
        const response = await fetch("/api/customers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": "tarcisiorp16@gmail.com",
          },
          body: JSON.stringify({ id: selectedCustomer.id, ...customerData }),
        })

        if (response.ok) {
          const updatedCustomer = await response.json()
          setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c)))
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Cliente atualizado com sucesso!",
          })
        }
      } else {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": "tarcisiorp16@gmail.com",
          },
          body: JSON.stringify(customerData),
        })

        if (response.ok) {
          const newCustomer = await response.json()
          setCustomers((prev) => [newCustomer, ...prev])
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Cliente criado com sucesso!",
          })
        }
      }

      setIsDialogOpen(false)
      setSelectedCustomer(null)
      loadCustomers()
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar cliente",
      })
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers?id=${customerId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== customerId))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: "Cliente removido com sucesso!",
        })
      }
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao remover cliente",
      })
    }
  }

  const toggleCustomerStatus = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) return

    try {
      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({ id: customerId, on_off: !customer.on_off }),
      })

      if (response.ok) {
        const updatedCustomer = await response.json()
        setCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCustomer : c)))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: `Cliente ${updatedCustomer.on_off ? "ativado" : "desativado"} com sucesso!`,
        })
      }
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao alterar status do cliente",
      })
    }
  }

  const openWhatsApp = (phone: string, name: string) => {
    const message = `Olá ${name}! Tudo bem? Aqui é da Ana Food.`
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedCustomer(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <CustomerDialog
            customer={selectedCustomer}
            onSave={handleSaveCustomer}
            onClose={() => setIsDialogOpen(false)}
          />
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
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
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
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
                      <span className="font-mono text-sm">{formatPhone(customer.phone)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{customer.email || "-"}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={customer.on_off ?? true}
                        onCheckedChange={() => toggleCustomerStatus(customer.id)}
                      />
                      <span className={(customer.on_off ?? true) ? "text-green-600" : "text-gray-400"}>
                        {(customer.on_off ?? true) ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showOrderHistory(customer)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Histórico de Pedidos"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setIsDialogOpen(true)
                        }}
                      >
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      <Dialog open={orderHistoryDialog} onOpenChange={setOrderHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Pedidos - {selectedCustomerHistory?.name}</DialogTitle>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">ID</th>
                    <th className="text-left p-3 font-semibold">Data</th>
                    <th className="text-left p-3 font-semibold">Valor Total</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{order.order_number}</td>
                      <td className="p-3">{new Date(order.date).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 font-medium">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(order.total)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "concluido"
                              ? "bg-green-100 text-green-800"
                              : order.status === "cancelado"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orderHistory.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum pedido encontrado</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  className={
                    currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

function CustomerDialog({
  customer,
  onSave,
  onClose,
}: {
  customer: Customer | null
  onSave: (data: Partial<Customer>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    notes: "",
    on_off: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [phoneDisplay, setPhoneDisplay] = useState("")

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        email: customer.email || "",
        notes: customer.notes || "",
        on_off: customer.on_off ?? true,
      })
      setPhoneDisplay(formatPhone(customer.phone || ""))
    } else {
      setFormData({
        name: "",
        phone: "",
        address: "",
        email: "",
        notes: "",
        on_off: true,
      })
      setPhoneDisplay("")
    }
    setErrors({})
  }, [customer])

  const handlePhoneChange = (value: string) => {
    const cleaned = parsePhone(value)
    setFormData((prev) => ({ ...prev, phone: cleaned }))
    setPhoneDisplay(formatPhone(value))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Telefone é obrigatório"
    } else if (formData.phone.length < 10 || formData.phone.length > 11) {
      newErrors.phone = "Telefone deve ter 10 ou 11 dígitos"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      const sanitizedData = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
      }
      onSave(sanitizedData)
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{customer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className={errors.name ? "border-red-500" : ""}
            placeholder="Digite o nome do cliente"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Telefone *</label>
          <Input
            value={phoneDisplay}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={errors.phone ? "border-red-500" : ""}
            placeholder="(99) 99999-9999"
            maxLength={15}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className={errors.email ? "border-red-500" : ""}
            placeholder="email@exemplo.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Endereço</label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Endereço completo"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Observações</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Observações sobre o cliente"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={formData.on_off}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, on_off: checked }))}
          />
          <label className="text-sm font-medium">Cliente ativo</label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Salvar
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
