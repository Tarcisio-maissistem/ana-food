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

interface Category {
  id: string
  name: string
  description?: string
  on_off: boolean
  created_at?: string
  updated_at?: string
  nome?: string
  title?: string
}

export function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    loadCategories()
  }, [currentPage, searchTerm])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
      })

      const response = await fetch(`/api/categories?${params}`, {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const result = await response.json()
        setCategories(result.data || [])
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    try {
      if (selectedCategory) {
        const response = await fetch("/api/categories", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": "tarcisiorp16@gmail.com",
          },
          body: JSON.stringify({ id: selectedCategory.id, ...categoryData }),
        })

        if (response.ok) {
          const updatedCategory = await response.json()
          setCategories((prev) => prev.map((c) => (c.id === selectedCategory.id ? updatedCategory : c)))
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Categoria atualizada com sucesso!",
          })
        }
      } else {
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": "tarcisiorp16@gmail.com",
          },
          body: JSON.stringify(categoryData),
        })

        if (response.ok) {
          const newCategory = await response.json()
          setCategories((prev) => [newCategory, ...prev])
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Categoria criada com sucesso!",
          })
        }
      }

      setIsDialogOpen(false)
      setSelectedCategory(null)
      loadCategories()
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar categoria",
      })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: "Categoria removida com sucesso!",
        })
      }
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao remover categoria",
      })
    }
  }

  const toggleCategoryStatus = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    try {
      const response = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId, on_off: !category.on_off }),
      })

      if (response.ok) {
        const updatedCategory = await response.json()
        setCategories((prev) => prev.map((c) => (c.id === categoryId ? updatedCategory : c)))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: `Categoria ${updatedCategory.on_off ? "ativada" : "desativada"} com sucesso!`,
        })
      }
    } catch (error) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao alterar status da categoria",
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
        <h1 className="text-3xl font-bold">Categorias</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedCategory(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <CategoryDialog
            category={selectedCategory}
            onSave={handleSaveCategory}
            onClose={() => setIsDialogOpen(false)}
          />
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar categorias..."
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
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">
                      {category?.name ||
                        category?.nome ||
                        category?.title ||
                        `Categoria ${category.id}` ||
                        "Nome não informado"}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={category.on_off} onCheckedChange={() => toggleCategoryStatus(category.id)} />
                      <span className={category.on_off ? "text-green-600" : "text-gray-400"}>
                        {category.on_off ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(category)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
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

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma categoria encontrada</p>
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

function CategoryDialog({
  category,
  onSave,
  onClose,
}: {
  category: Category | null
  onSave: (data: Partial<Category>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    on_off: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || category.nome || category.title || category.id || "",
        on_off: category.on_off ?? true,
      })
    } else {
      setFormData({
        name: "",
        on_off: true,
      })
    }
    setErrors({})
  }, [category])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres"
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Nome deve ter no máximo 50 caracteres"
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
      }
      onSave(sanitizedData)
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className={errors.name ? "border-red-500" : ""}
            placeholder="Digite o nome da categoria"
            maxLength={50}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={formData.on_off}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, on_off: checked }))}
          />
          <label className="text-sm font-medium">Categoria ativa</label>
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
