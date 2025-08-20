"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus, Search, Edit, Trash2 } from "lucide-react"

interface Additional {
  id: string
  name: string
  price: number
  description?: string
  on_off: boolean
  created_at?: string
  updated_at?: string
}

const formatCurrency = (value: string | number): string => {
  const numValue =
    typeof value === "string" ? Number.parseFloat(value.replace(/[^\d,.-]/g, "").replace(",", ".")) : value
  if (isNaN(numValue)) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue)
}

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".")
  return Number.parseFloat(cleaned) || 0
}

export function AdditionalsScreen() {
  const [additionals, setAdditionals] = useState<Additional[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAdditional, setSelectedAdditional] = useState<Additional | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [isSaving, setIsSaving] = useState(false) // Added loading state for save operations to prevent double-click

  useEffect(() => {
    loadAdditionals()
  }, [currentPage, searchTerm])

  const loadAdditionals = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
      })

      const response = await fetch(`/api/additionals?${params}`, {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const result = await response.json()
        setAdditionals(result.data || [])
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error("Erro ao carregar adicionais:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAdditional = async (additionalData: Partial<Additional>) => {
    if (isSaving) return // Prevent double-click
    setIsSaving(true)

    try {
      if (selectedAdditional) {
        const response = await fetch("/api/additionals", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": "tarcisiorp16@gmail.com",
          },
          body: JSON.stringify({ id: selectedAdditional.id, ...additionalData }),
        })

        if (response.ok) {
          const updatedAdditional = await response.json()
          setAdditionals((prev) => prev.map((a) => (a.id === selectedAdditional.id ? updatedAdditional : a)))
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Adicional atualizado com sucesso!",
            duration: 3000,
            className: "animate-in slide-in-from-right-full",
          })
        }
      } else {
        const response = await fetch("/api/additionals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": "tarcisiorp16@gmail.com",
          },
          body: JSON.stringify(additionalData),
        })

        if (response.ok) {
          const newAdditional = await response.json()
          setAdditionals((prev) => [newAdditional, ...prev])
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Adicional criado com sucesso!",
            duration: 3000,
            className: "animate-in slide-in-from-right-full",
          })
        }
      }

      setIsDialogOpen(false)
      setSelectedAdditional(null)
      loadAdditionals()
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar adicional",
        duration: 4000,
        className: "animate-in slide-in-from-right-full",
      })
    } finally {
      setIsSaving(false) // Re-enable button after operation
    }
  }

  const handleDeleteAdditional = async (additionalId: string) => {
    try {
      const response = await fetch(`/api/additionals?id=${additionalId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        setAdditionals((prev) => prev.filter((a) => a.id !== additionalId))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: "Adicional removido com sucesso!",
          duration: 3000,
          className: "animate-in slide-in-from-right-full",
        })
      }
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao remover adicional",
        duration: 4000,
        className: "animate-in slide-in-from-right-full",
      })
    }
  }

  const toggleAdditionalStatus = async (additionalId: string) => {
    const additional = additionals.find((a) => a.id === additionalId)
    if (!additional) return

    try {
      const response = await fetch("/api/additionals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({ id: additionalId, on_off: !additional.on_off }),
      })

      if (response.ok) {
        const updatedAdditional = await response.json()
        setAdditionals((prev) => prev.map((a) => (a.id === additionalId ? updatedAdditional : a)))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: `Adicional ${updatedAdditional.on_off ? "ativado" : "desativado"} com sucesso!`,
          duration: 3000,
          className: "animate-in slide-in-from-right-full",
        })
      }
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao alterar status do adicional",
        duration: 4000,
        className: "animate-in slide-in-from-right-full",
      })
    }
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
        <h1 className="text-3xl font-bold">Adicionais</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedAdditional(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Adicional
            </Button>
          </DialogTrigger>
          <AdditionalDialog
            additional={selectedAdditional}
            onSave={handleSaveAdditional}
            onClose={() => setIsDialogOpen(false)}
            isLoading={isSaving} // Pass loading state to dialog
          />
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar adicionais..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">Preço</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {additionals.map((additional) => (
                <tr key={additional.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{additional?.name || additional?.id || "Nome não informado"}</div>
                  </td>
                  <td className="p-4 font-medium">{formatCurrency(additional?.price || 0)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={additional.on_off}
                        onCheckedChange={() => toggleAdditionalStatus(additional.id)}
                      />
                      <span className={additional.on_off ? "text-green-600" : "text-gray-400"}>
                        {additional.on_off ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAdditional(additional)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAdditional(additional.id)}
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

        {additionals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum adicional encontrado</p>
          </div>
        )}
      </div>

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

function AdditionalDialog({
  additional,
  onSave,
  onClose,
  isLoading,
}: {
  additional: Additional | null
  onSave: (data: Partial<Additional>) => void
  onClose: () => void
  isLoading?: boolean // Added loading prop
}) {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    on_off: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [priceDisplay, setPriceDisplay] = useState("")

  useEffect(() => {
    if (additional) {
      setFormData({
        name: additional.name || additional.id || "",
        price: additional.price || 0,
        on_off: additional.on_off ?? true,
      })
      setPriceDisplay(formatCurrency(additional.price || 0))
    } else {
      setFormData({
        name: "",
        price: 0,
        on_off: true,
      })
      setPriceDisplay("")
    }
    setErrors({})
  }, [additional])

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, "")
    const numValue = parseCurrency(cleaned)
    setFormData((prev) => ({ ...prev, price: numValue }))

    if (cleaned) {
      const formatted = formatCurrency(numValue)
      setPriceDisplay(formatted)
    } else {
      setPriceDisplay("")
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres"
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Nome deve ter no máximo 50 caracteres"
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = "Preço deve ser maior que zero"
    } else if (formData.price > 9999.99) {
      newErrors.price = "Preço deve ser menor que R$ 9.999,99"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && !isLoading) {
      // Prevent submission if loading
      const sanitizedData = {
        ...formData,
        name: formData.name.trim(),
        price: Number(formData.price.toFixed(2)),
      }
      onSave(sanitizedData)
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{additional ? "Editar Adicional" : "Novo Adicional"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className={errors.name ? "border-red-500" : ""}
            placeholder="Digite o nome do adicional"
            maxLength={50}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Preço *</label>
          <Input
            type="text"
            value={priceDisplay}
            onChange={(e) => handlePriceChange(e.target.value)}
            className={errors.price ? "border-red-500" : ""}
            placeholder="R$ 0,00"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={formData.on_off}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, on_off: checked }))}
          />
          <label className="text-sm font-medium">Adicional ativo</label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-transparent"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </div>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
