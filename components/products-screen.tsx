"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"

interface Product {
  id: string
  name: string
  category: string
  price: number
  description?: string
  image?: string
  on_off: boolean // usando on_off em vez de active para compatibilidade com banco
  complements: string[]
}

const categories = ["Hambúrgueres", "Pizzas", "Bebidas", "Sobremesas", "Acompanhamentos"]

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

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("todas")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  const handleSaveProduct = async (data: Partial<Product>) => {
    try {
      const method = selectedProduct ? "PUT" : "POST"
      const url = selectedProduct ? `/api/products/${selectedProduct.id}` : "/api/products"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: selectedProduct ? "Produto atualizado com sucesso" : "Produto criado com sucesso",
        })
        setIsDialogOpen(false)
        loadProducts() // Recarregar lista
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar produto:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar produto. Tente novamente.",
      })
    }
  }

  const toggleProductStatus = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...product,
          on_off: !product.on_off,
        }),
      })

      if (response.ok) {
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: `Produto ${!product.on_off ? "ativado" : "desativado"} com sucesso`,
        })
        loadProducts() // Recarregar lista
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao alterar status do produto:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao alterar status do produto",
      })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: "Produto excluído com sucesso",
        })
        loadProducts() // Recarregar lista
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao excluir produto:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao excluir produto",
      })
    }
  }

  useEffect(() => {
    loadProducts()
  }, [currentPage, searchTerm, categoryFilter])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        category: categoryFilter !== "todas" ? categoryFilter : "",
      })

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.pagination) {
          setProducts(result.data)
          setPagination(result.pagination)
        } else {
          setProducts(Array.isArray(result) ? result : [])
          setPagination({
            page: 1,
            limit: 10,
            total: Array.isArray(result) ? result.length : 0,
            totalPages: 1,
          })
        }
      } else {
        // @ts-ignore
        window.showToast?.({
          type: "error",
          title: "Erro",
          description: "Erro ao carregar produtos",
        })
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
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

  const filteredProducts = products

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
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedProduct(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <ProductDialog product={selectedProduct} onSave={handleSaveProduct} onClose={() => setIsDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Produtos */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">Categoria</th>
                <th className="text-left p-4 font-semibold">Preço</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{product?.name || "Nome não informado"}</div>
                      {product?.description && (
                        <div className="text-sm text-gray-600 truncate max-w-xs">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{product?.category || "Sem categoria"}</Badge>
                  </td>
                  <td className="p-4 font-medium">{formatCurrency(product?.price || 0)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product?.on_off ?? false}
                        onCheckedChange={() => toggleProductStatus(product.id)}
                      />
                      <span className={product?.on_off ? "text-green-600" : "text-gray-400"}>
                        {product?.on_off ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
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

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum produto encontrado</p>
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

function ProductDialog({
  product,
  onSave,
  onClose,
}: {
  product: Product | null
  onSave: (data: Partial<Product>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: 0,
    description: "",
    on_off: true, // usando on_off em vez de active
    complements: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [priceDisplay, setPriceDisplay] = useState("")

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "",
        price: product.price || 0,
        description: product.description || "",
        on_off: product.on_off ?? true,
        complements: product.complements || [],
      })
      setPriceDisplay(formatCurrency(product.price || 0))
    } else {
      setFormData({
        name: "",
        category: "",
        price: 0,
        description: "",
        on_off: true,
        complements: [],
      })
      setPriceDisplay("")
    }
    setErrors({})
  }, [product])

  const handlePriceChange = (value: string) => {
    // Remove all non-numeric characters except comma and dot
    const cleaned = value.replace(/[^\d,]/g, "")

    // Convert to number for internal state
    const numValue = parseCurrency(cleaned)
    setFormData((prev) => ({ ...prev, price: numValue }))

    // Format for display
    if (cleaned) {
      const formatted = formatCurrency(numValue)
      setPriceDisplay(formatted)
    } else {
      setPriceDisplay("")
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validação do nome
    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres"
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Nome deve ter no máximo 100 caracteres"
    }

    // Validação da categoria
    if (!formData.category) {
      newErrors.category = "Categoria é obrigatória"
    }

    // Validação do preço
    if (!formData.price || formData.price <= 0) {
      newErrors.price = "Preço deve ser maior que zero"
    } else if (formData.price > 9999.99) {
      newErrors.price = "Preço deve ser menor que R$ 9.999,99"
    }

    // Validação da descrição (opcional, mas se preenchida deve ter tamanho mínimo)
    if (formData.description && formData.description.trim().length > 0 && formData.description.trim().length < 10) {
      newErrors.description = "Descrição deve ter pelo menos 10 caracteres"
    } else if (formData.description && formData.description.length > 500) {
      newErrors.description = "Descrição deve ter no máximo 500 caracteres"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro de Validação",
        description: "Por favor, corrija os erros no formulário",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Sanitizar dados antes de enviar
      const sanitizedData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price.toFixed(2)), // Garantir 2 casas decimais
      }

      await onSave(sanitizedData)
    } catch (error) {
      console.error("Erro ao salvar produto:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar produto. Tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className={errors.name ? "border-red-500" : ""}
            placeholder="Digite o nome do produto"
            maxLength={100}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Categoria *</label>
          <Select value={formData.category} onValueChange={(value) => handleFieldChange("category", value)}>
            <SelectTrigger className={errors.category ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
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

        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            className={errors.description ? "border-red-500" : ""}
            rows={3}
            placeholder="Descrição opcional do produto"
            maxLength={500}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 caracteres</p>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={formData.on_off} onCheckedChange={(checked) => handleFieldChange("on_off", checked)} />
          <label className="text-sm font-medium">Produto ativo</label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-transparent"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? (
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
