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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, Printer, Package, Tag } from "lucide-react"
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
  on_off: boolean
  complements: string[]
  print_location_id?: string
}

interface Category {
  id: string
  name: string
  on_off: boolean
  print_location_id?: string
}

interface Additional {
  id: string
  name: string
  price: number
  on_off: boolean
}

interface PrintLocation {
  id: string
  name: string
  active: boolean
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

  const [categoriesList, setCategoriesList] = useState<Category[]>([])
  const [additionalsList, setAdditionalsList] = useState<Additional[]>([])
  const [printLocationsList, setPrintLocationsList] = useState<PrintLocation[]>([])
  const [activeTab, setActiveTab] = useState("products")

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isAdditionalDialogOpen, setIsAdditionalDialogOpen] = useState(false)
  const [isPrintLocationDialogOpen, setIsPrintLocationDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedAdditional, setSelectedAdditional] = useState<Additional | null>(null)
  const [selectedPrintLocation, setSelectedPrintLocation] = useState<PrintLocation | null>(null)

  const [categoriesPagination, setCategoriesPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [additionalsPagination, setAdditionalsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [printLocationsPagination, setPrintLocationsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  const [categoriesPage, setCategoriesPage] = useState(1)
  const [additionalsPage, setAdditionalsPage] = useState(1)
  const [printLocationsPage, setPrintLocationsPage] = useState(1)

  const [categoriesSearch, setCategoriesSearch] = useState("")
  const [additionalsSearch, setAdditionalsSearch] = useState("")
  const [printLocationsSearch, setPrintLocationsSearch] = useState("")

  const [isProductSaving, setIsProductSaving] = useState(false)
  const [isCategorySaving, setIsCategorySaving] = useState(false)
  const [isAdditionalSaving, setIsAdditionalSaving] = useState(false)
  const [isPrintLocationSaving, setIsPrintLocationSaving] = useState(false)

  const handleSaveProduct = async (data: Partial<Product>) => {
    if (isProductSaving) return // Prevent double-click
    setIsProductSaving(true)

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
    } finally {
      setIsProductSaving(false) // Re-enable button after operation
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

  const loadCategories = async () => {
    try {
      const params = new URLSearchParams({
        page: categoriesPage.toString(),
        limit: "10",
        search: categoriesSearch,
      })

      const response = await fetch(`/api/categories?${params}`, {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.pagination) {
          setCategoriesList(result.data)
          setCategoriesPagination(result.pagination)
        } else {
          setCategoriesList(Array.isArray(result) ? result : [])
          setCategoriesPagination({
            page: 1,
            limit: 10,
            total: Array.isArray(result) ? result.length : 0,
            totalPages: 1,
          })
        }
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error)
    }
  }

  const loadAdditionals = async () => {
    try {
      const params = new URLSearchParams({
        page: additionalsPage.toString(),
        limit: "10",
        search: additionalsSearch,
      })

      const response = await fetch(`/api/additionals?${params}`, {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.pagination) {
          setAdditionalsList(result.data)
          setAdditionalsPagination(result.pagination)
        } else {
          setAdditionalsList(Array.isArray(result) ? result : [])
          setAdditionalsPagination({
            page: 1,
            limit: 10,
            total: Array.isArray(result) ? result.length : 0,
            totalPages: 1,
          })
        }
      }
    } catch (error) {
      console.error("Erro ao carregar adicionais:", error)
    }
  }

  const loadPrintLocations = async () => {
    try {
      const params = new URLSearchParams({
        page: printLocationsPage.toString(),
        limit: "10",
        search: printLocationsSearch,
      })

      const response = await fetch(`/api/print-locations?${params}`, {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.pagination) {
          setPrintLocationsList(result.data)
          setPrintLocationsPagination(result.pagination)
        } else {
          setPrintLocationsList(Array.isArray(result) ? result : [])
          setPrintLocationsPagination({
            page: 1,
            limit: 10,
            total: Array.isArray(result) ? result.length : 0,
            totalPages: 1,
          })
        }
      }
    } catch (error) {
      console.error("Erro ao carregar locais de impressão:", error)
    }
  }

  const handleSaveCategory = async (data: Partial<Category>) => {
    if (isCategorySaving) return // Prevent double-click
    setIsCategorySaving(true)

    try {
      const method = selectedCategory ? "PUT" : "POST"
      const url = selectedCategory ? `/api/categories/${selectedCategory.id}` : "/api/categories"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: selectedCategory ? "Categoria atualizada com sucesso" : "Categoria criada com sucesso",
        })
        setIsCategoryDialogOpen(false)
        loadCategories()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar categoria:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar categoria. Tente novamente.",
      })
    } finally {
      setIsCategorySaving(false) // Re-enable button after operation
    }
  }

  const handleSaveAdditional = async (data: Partial<Additional>) => {
    if (isAdditionalSaving) return // Prevent double-click
    setIsAdditionalSaving(true)

    try {
      const method = selectedAdditional ? "PUT" : "POST"
      const url = selectedAdditional ? `/api/additionals/${selectedAdditional.id}` : "/api/additionals"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: selectedAdditional ? "Adicional atualizado com sucesso" : "Adicional criado com sucesso",
        })
        setIsAdditionalDialogOpen(false)
        loadAdditionals()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar adicional:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar adicional. Tente novamente.",
      })
    } finally {
      setIsAdditionalSaving(false) // Re-enable button after operation
    }
  }

  const handleSavePrintLocation = async (data: Partial<PrintLocation>) => {
    if (isPrintLocationSaving) return // Prevent double-click
    setIsPrintLocationSaving(true)

    try {
      const method = selectedPrintLocation ? "PUT" : "POST"
      const url = selectedPrintLocation ? `/api/print-locations/${selectedPrintLocation.id}` : "/api/print-locations"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: selectedPrintLocation ? "Local atualizado com sucesso" : "Local criado com sucesso",
        })
        setIsPrintLocationDialogOpen(false)
        loadPrintLocations()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar local de impressão:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar local de impressão. Tente novamente.",
      })
    } finally {
      setIsPrintLocationSaving(false) // Re-enable button after operation
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        category: categoryFilter !== "todas" ? categoryFilter : "",
      })

      const response = await fetch(`/api/products?${params}`, {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })

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

  useEffect(() => {
    loadProducts()
    loadCategories()
    loadAdditionals()
    loadPrintLocations()
  }, [currentPage, searchTerm, categoryFilter])

  useEffect(() => {
    loadCategories()
  }, [categoriesPage, categoriesSearch])

  useEffect(() => {
    loadAdditionals()
  }, [additionalsPage, additionalsSearch])

  useEffect(() => {
    loadPrintLocations()
  }, [printLocationsPage, printLocationsSearch])

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
        <h1 className="text-3xl font-bold">Gestão de Produtos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedProduct(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <ProductDialog
            product={selectedProduct}
            onSave={handleSaveProduct}
            onClose={() => setIsDialogOpen(false)}
            printLocations={printLocationsList}
            categories={categoriesList}
            isLoading={isProductSaving} // Pass loading state to dialog
          />
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="additionals" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Adicionais
          </TabsTrigger>
          <TabsTrigger value="print-locations" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Locais de Impressão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
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

          <div className="bg-white rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Nome</th>
                    <th className="text-left p-4 font-semibold">Categoria</th>
                    <th className="text-left p-4 font-semibold">Preço</th>
                    <th className="text-left p-4 font-semibold">Local de Impressão</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
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
                        <Badge variant="secondary">
                          {printLocationsList.find((pl) => pl.id === product.print_location_id)?.name ||
                            "Padrão da categoria"}
                        </Badge>
                      </td>
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

            {products.length === 0 && (
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
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoriesTab
            categories={categoriesList}
            printLocations={printLocationsList}
            onReload={loadCategories}
            isDialogOpen={isCategoryDialogOpen}
            setIsDialogOpen={setIsCategoryDialogOpen}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onSave={handleSaveCategory}
            pagination={categoriesPagination}
            currentPage={categoriesPage}
            setCurrentPage={setCategoriesPage}
            searchTerm={categoriesSearch}
            setSearchTerm={setCategoriesSearch}
            isCategorySaving={isCategorySaving}
          />
        </TabsContent>

        <TabsContent value="additionals" className="space-y-4">
          <AdditionalsTab
            additionals={additionalsList}
            onReload={loadAdditionals}
            isDialogOpen={isAdditionalDialogOpen}
            setIsDialogOpen={setIsAdditionalDialogOpen}
            selectedAdditional={selectedAdditional}
            setSelectedAdditional={setSelectedAdditional}
            onSave={handleSaveAdditional}
            pagination={additionalsPagination}
            currentPage={additionalsPage}
            setCurrentPage={setAdditionalsPage}
            searchTerm={additionalsSearch}
            setSearchTerm={setAdditionalsSearch}
            isAdditionalSaving={isAdditionalSaving}
          />
        </TabsContent>

        <TabsContent value="print-locations" className="space-y-4">
          <PrintLocationsTab
            printLocations={printLocationsList}
            onReload={loadPrintLocations}
            isDialogOpen={isPrintLocationDialogOpen}
            setIsDialogOpen={setIsPrintLocationDialogOpen}
            selectedPrintLocation={selectedPrintLocation}
            setSelectedPrintLocation={setSelectedPrintLocation}
            onSave={handleSavePrintLocation}
            pagination={printLocationsPagination}
            currentPage={printLocationsPage}
            setCurrentPage={setPrintLocationsPage}
            searchTerm={printLocationsSearch}
            setSearchTerm={setPrintLocationsSearch}
            isPrintLocationSaving={isPrintLocationSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProductDialog({
  product,
  onSave,
  onClose,
  printLocations,
  categories: categoriesList,
  isLoading,
}: {
  product: Product | null
  onSave: (data: Partial<Product>) => void
  onClose: () => void
  printLocations: PrintLocation[]
  categories: Category[]
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: 0,
    description: "",
    on_off: true,
    complements: [],
    print_location_id: "",
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
        print_location_id: product.print_location_id || "",
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
        print_location_id: "",
      })
      setPriceDisplay("")
    }
    setErrors({})
  }, [product])

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "")

    if (cleaned.length === 0) {
      setPriceDisplay("")
      setFormData((prev) => ({ ...prev, price: 0 }))
      return
    }

    const numValue = Number.parseInt(cleaned) / 100
    setFormData((prev) => ({ ...prev, price: numValue }))

    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue)

    setPriceDisplay(formatted)
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres"
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Nome deve ter no máximo 100 caracteres"
    }

    if (!formData.category) {
      newErrors.category = "Categoria é obrigatória"
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = "Preço deve ser maior que zero"
    } else if (formData.price > 9999.99) {
      newErrors.price = "Preço deve ser menor que R$ 9.999,99"
    }

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
      const sanitizedData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price.toFixed(2)),
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
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {categoriesList.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
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
            <label className="text-sm font-medium">Local de Impressão</label>
            <Select
              value={formData.print_location_id}
              onValueChange={(value) => handleFieldChange("print_location_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Usar padrão da categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category-default">Usar padrão da categoria</SelectItem>
                {printLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Se não selecionado, usará o local definido na categoria</p>
          </div>
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
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting || isLoading}>
            {isSubmitting || isLoading ? (
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

function CategoriesTab({
  categories,
  printLocations,
  onReload,
  isDialogOpen,
  setIsDialogOpen,
  selectedCategory,
  setSelectedCategory,
  onSave,
  pagination,
  currentPage,
  setCurrentPage,
  searchTerm,
  setSearchTerm,
  isCategorySaving,
}: {
  categories: Category[]
  printLocations: PrintLocation[]
  onReload: () => void
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  selectedCategory: Category | null
  setSelectedCategory: (category: Category | null) => void
  onSave: (data: Partial<Category>) => void
  pagination: { page: number; limit: number; total: number; totalPages: number }
  currentPage: number
  setCurrentPage: (page: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  isCategorySaving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categorias</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setSelectedCategory(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <CategoryDialog
            category={selectedCategory}
            printLocations={printLocations}
            onSave={onSave}
            onClose={() => setIsDialogOpen(false)}
            isLoading={isCategorySaving}
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
                <th className="text-left p-4 font-semibold">Local de Impressão</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    {category.name || (category as any).nome || `Categoria ${category.id.slice(0, 8)}`}
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary">
                      {printLocations.find((pl) => pl.id === category.print_location_id)?.name || "Não definido"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={category.on_off} />
                      <span className={category.on_off ? "text-green-600" : "text-gray-400"}>
                        {category.on_off ? "Ativo" : "Inativo"}
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
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
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

function AdditionalsTab({
  additionals,
  onReload,
  isDialogOpen,
  setIsDialogOpen,
  selectedAdditional,
  setSelectedAdditional,
  onSave,
  pagination,
  currentPage,
  setCurrentPage,
  searchTerm,
  setSearchTerm,
  isAdditionalSaving,
}: {
  additionals: Additional[]
  onReload: () => void
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  selectedAdditional: Additional | null
  setSelectedAdditional: (additional: Additional | null) => void
  onSave: (data: Partial<Additional>) => void
  pagination: { page: number; limit: number; total: number; totalPages: number }
  currentPage: number
  setCurrentPage: (page: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  isAdditionalSaving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Adicionais</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setSelectedAdditional(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Adicional
            </Button>
          </DialogTrigger>
          <AdditionalDialog
            additional={selectedAdditional}
            onSave={onSave}
            onClose={() => setIsDialogOpen(false)}
            isLoading={isAdditionalSaving}
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
                  <td className="p-4 font-medium">{additional.name}</td>
                  <td className="p-4 font-medium">{formatCurrency(additional.price)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={additional.on_off} />
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
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
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

function PrintLocationsTab({
  printLocations,
  onReload,
  isDialogOpen,
  setIsDialogOpen,
  selectedPrintLocation,
  setSelectedPrintLocation,
  onSave,
  pagination,
  currentPage,
  setCurrentPage,
  searchTerm,
  setSearchTerm,
  isPrintLocationSaving,
}: {
  printLocations: PrintLocation[]
  onReload: () => void
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  selectedPrintLocation: PrintLocation | null
  setSelectedPrintLocation: (location: PrintLocation | null) => void
  onSave: (data: Partial<PrintLocation>) => void
  pagination: { page: number; limit: number; total: number; totalPages: number }
  currentPage: number
  setCurrentPage: (page: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  isPrintLocationSaving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Locais de Impressão</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setSelectedPrintLocation(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Local
            </Button>
          </DialogTrigger>
          <PrintLocationDialog
            printLocation={selectedPrintLocation}
            onSave={onSave}
            onClose={() => setIsDialogOpen(false)}
            isLoading={isPrintLocationSaving}
          />
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar locais de impressão..."
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
              {printLocations.map((location) => (
                <tr key={location.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{location.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={location.active} />
                      <span className={location.active ? "text-green-600" : "text-gray-400"}>
                        {location.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPrintLocation(location)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {printLocations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum local de impressão encontrado</p>
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
  printLocations,
  onSave,
  onClose,
  isLoading,
}: {
  category: Category | null
  printLocations: PrintLocation[]
  onSave: (data: Partial<Category>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: "",
    on_off: true,
    print_location_id: "",
  })

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        on_off: category.on_off ?? true,
        print_location_id: category.print_location_id || "",
      })
    } else {
      setFormData({
        name: "",
        on_off: true,
        print_location_id: "",
      })
    }
  }, [category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || isLoading) return // Prevent submission if saving
    onSave(formData)
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome da categoria"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Local de Impressão</label>
          <Select
            value={formData.print_location_id}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, print_location_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um local" />
            </SelectTrigger>
            <SelectContent>
              {printLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

function AdditionalDialog({
  additional,
  onSave,
  onClose,
  isLoading,
}: {
  additional: Additional | null
  onSave: (data: Partial<Additional>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    on_off: true,
  })
  const [priceDisplay, setPriceDisplay] = useState("")

  useEffect(() => {
    if (additional) {
      setFormData({
        name: additional.name || "",
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
  }, [additional])

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "")
    if (cleaned.length === 0) {
      setPriceDisplay("")
      setFormData((prev) => ({ ...prev, price: 0 }))
      return
    }
    const numValue = Number.parseInt(cleaned) / 100
    setFormData((prev) => ({ ...prev, price: numValue }))
    setPriceDisplay(formatCurrency(numValue))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || isLoading) return // Prevent submission if saving
    onSave(formData)
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{additional ? "Editar Adicional" : "Novo Adicional"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do adicional"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Preço *</label>
          <Input
            type="text"
            value={priceDisplay}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="R$ 0,00"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.on_off}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, on_off: checked }))}
          />
          <label className="text-sm font-medium">Adicional ativo</label>
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
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

function PrintLocationDialog({
  printLocation,
  onSave,
  onClose,
  isLoading,
}: {
  printLocation: PrintLocation | null
  onSave: (data: Partial<PrintLocation>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: "",
    active: true,
  })

  useEffect(() => {
    if (printLocation) {
      setFormData({
        name: printLocation.name || "",
        active: printLocation.active ?? true,
      })
    } else {
      setFormData({
        name: "",
        active: true,
      })
    }
  }, [printLocation])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || isLoading) return // Prevent submission if saving
    onSave(formData)
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{printLocation ? "Editar Local de Impressão" : "Novo Local de Impressão"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do local de impressão"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.active}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
          />
          <label className="text-sm font-medium">Local ativo</label>
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
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
