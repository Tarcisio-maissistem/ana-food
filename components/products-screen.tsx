"use client"

import { Badge } from "@/components/ui/badge"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Edit, Trash2, Plus, Search, Package, Tag, Printer } from "lucide-react"
import { useSweetAlert } from "@/hooks/use-sweet-alert"
import type React from "react"
import { Textarea } from "@/components/ui/textarea"

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

function ProductsScreen() {
  const { fire: Swal, SweetAlertComponent } = useSweetAlert()
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
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    print_location_id: "",
    active: true,
  })
  const [additionalFormData, setAdditionalFormData] = useState({
    name: "",
    price: "",
    active: true,
  })
  const [isPrintLocationSaving, setIsPrintLocationSaving] = useState(false)

  const [isCategorySaving, setIsCategorySaving] = useState(false)
  const [isAdditionalSaving, setIsAdditionalSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    print_location_id: "",
    active: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleDeleteProduct = async (productId: string) => {
    const result = await Swal({
      title: "Tem certeza?",
      text: "Você não poderá reverter esta ação!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "red",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/products?id=${productId}`, {
        method: "DELETE",
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        await Swal({
          title: "Excluído!",
          text: "Produto excluído com sucesso.",
          icon: "success",
        })
        loadProducts() // Recarregar lista
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao excluir produto:", error)
      await Swal({
        title: "Erro!",
        text: "Erro ao excluir produto.",
        icon: "error",
        confirmButtonText: "OK",
      })
    }
  }

  const handleSaveProduct = async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const productData = {
        name: formData.name,
        price: Number.parseFloat(formData.price.replace(/[^\d,]/g, "").replace(",", ".")),
        category: formData.category,
        description: formData.description,
        print_location_id: formData.print_location_id === "category-default" ? null : formData.print_location_id,
        active: formData.active,
      }

      const url = "/api/products"
      const method = selectedProduct ? "PUT" : "POST"
      const body = selectedProduct ? { id: selectedProduct.id, ...productData } : productData

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await Swal({
          title: "Sucesso!",
          text: `Produto ${selectedProduct ? "atualizado" : "criado"} com sucesso.`,
          icon: "success",
        })
        setIsDialogOpen(false)
        setSelectedProduct(null)
        setFormData({ name: "", price: "", category: "", description: "", print_location_id: "", active: true })
        loadProducts()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar produto:", error)
      await Swal({
        title: "Erro!",
        text: "Erro ao salvar produto.",
        icon: "error",
        confirmButtonText: "OK",
      })
    } finally {
      setIsSaving(false)
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

  const handleSaveCategory = async () => {
    if (isCategorySaving) return
    setIsCategorySaving(true)

    try {
      const categoryData = {
        name: categoryFormData.name,
        print_location_id: categoryFormData.print_location_id,
        active: categoryFormData.active,
      }

      const url = "/api/categories"
      const method = selectedCategory ? "PUT" : "POST"
      const body = selectedCategory ? { id: selectedCategory.id, ...categoryData } : categoryData

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await Swal({
          title: "Sucesso!",
          text: `Categoria ${selectedCategory ? "atualizada" : "criada"} com sucesso.`,
          icon: "success",
        })
        setIsCategoryDialogOpen(false)
        setSelectedCategory(null)
        setCategoryFormData({ name: "", print_location_id: "", active: true })
        loadCategories()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar categoria:", error)
      await Swal({
        title: "Erro!",
        text: "Erro ao salvar categoria.",
        icon: "error",
        confirmButtonText: "OK",
      })
    } finally {
      setIsCategorySaving(false)
    }
  }

  const handleSaveAdditional = async () => {
    if (isAdditionalSaving) return
    setIsAdditionalSaving(true)

    try {
      const additionalData = {
        name: additionalFormData.name,
        price: Number.parseFloat(additionalFormData.price.replace(/[^\d,]/g, "").replace(",", ".")),
        active: additionalFormData.active,
      }

      const url = "/api/additionals"
      const method = selectedAdditional ? "PUT" : "POST"
      const body = selectedAdditional ? { id: selectedAdditional.id, ...additionalData } : additionalData

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await Swal({
          title: "Sucesso!",
          text: `Adicional ${selectedAdditional ? "atualizado" : "criado"} com sucesso.`,
          icon: "success",
        })
        setIsAdditionalDialogOpen(false)
        setSelectedAdditional(null)
        setAdditionalFormData({ name: "", price: "", active: true })
        loadAdditionals()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar adicional:", error)
      await Swal({
        title: "Erro!",
        text: "Erro ao salvar adicional.",
        icon: "error",
        confirmButtonText: "OK",
      })
    } finally {
      setIsAdditionalSaving(false)
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
        await Swal({
          title: "Sucesso!",
          text: selectedPrintLocation ? "Local atualizado com sucesso" : "Local criado com sucesso",
          icon: "success",
        })
        setIsPrintLocationDialogOpen(false)
        loadPrintLocations()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar local de impressão:", error)
      await Swal({
        title: "Erro!",
        text: "Erro ao salvar local de impressão. Tente novamente.",
        icon: "error",
        confirmButtonText: "OK",
      })
    } finally {
      setIsPrintLocationSaving(false)
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
      <SweetAlertComponent />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Produtos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setSelectedProduct(null)
                setFormData({ name: "", price: "", category: "", description: "", print_location_id: "", active: true })
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveProduct()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome *</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome do produto"
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label className="text-sm font-medium">Preço *</Label>
                  <Input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Local de Impressão</Label>
                  <Select
                    value={formData.print_location_id}
                    onValueChange={(value) => setFormData({ ...formData, print_location_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Usar padrão da categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category-default">Usar padrão da categoria</SelectItem>
                      {printLocationsList.map((location) => (
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
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descrição opcional do produto"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label className="text-sm font-medium">Produto ativo</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setSelectedProduct(null)
                    setFormData({
                      name: "",
                      price: "",
                      category: "",
                      description: "",
                      print_location_id: "",
                      active: true,
                    })
                  }}
                  className="flex-1 bg-transparent"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? (
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
                              setFormData({
                                name: product.name,
                                price: product.price.toString(),
                                category: product.category,
                                description: product.description || "",
                                print_location_id: product.print_location_id || "",
                                active: product.on_off,
                              })
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Categorias</h2>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(null)
                      setCategoryFormData({ name: "", print_location_id: "", active: true })
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveCategory()
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label className="text-sm font-medium">Nome *</Label>
                      <Input
                        type="text"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        placeholder="Nome da categoria"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Local de Impressão</Label>
                      <Select
                        value={categoryFormData.print_location_id}
                        onValueChange={(value) =>
                          setCategoryFormData({ ...categoryFormData, print_location_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um local" />
                        </SelectTrigger>
                        <SelectContent>
                          {printLocationsList.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={categoryFormData.active}
                        onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, active: checked })}
                      />
                      <Label className="text-sm font-medium">Categoria ativa</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCategoryDialogOpen(false)
                          setSelectedCategory(null)
                          setCategoryFormData({ name: "", print_location_id: "", active: true })
                        }}
                        className="flex-1 bg-transparent"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isCategorySaving}>
                        {isCategorySaving ? (
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
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar categorias..."
                value={categoriesSearch}
                onChange={(e) => setCategoriesSearch(e.target.value)}
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
                    {categoriesList.map((category) => (
                      <tr key={category.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{category.name}</td>
                        <td className="p-4">
                          <Badge variant="secondary">
                            {printLocationsList.find((pl) => pl.id === category.print_location_id)?.name ||
                              "Não definido"}
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
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 bg-transparent"
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

              {categoriesList.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhuma categoria encontrada</p>
                </div>
              )}
            </div>

            {categoriesPagination.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink>1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="additionals" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Adicionais</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Adicional
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Adicional</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Nome *</Label>
                      <Input type="text" placeholder="Nome do adicional" required />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Preço *</Label>
                      <Input type="text" placeholder="R$ 0,00" required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch />
                      <Label className="text-sm font-medium">Adicional ativo</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" className="flex-1 bg-transparent">
                        Cancelar
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isAdditionalSaving}>
                        {isAdditionalSaving ? (
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
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar adicionais..." className="pl-10" />
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
                    <tr>
                      <td className="p-4 font-medium">Adicional 1</td>
                      <td className="p-4 font-medium">R$ 5,00</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Switch />
                          <span className="text-green-600">Ativo</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum adicional encontrado</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
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
          onChange={(e) => setSearchTerm(e.target.value)}
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
                      <Button variant="outline" size="sm">
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
                <PaginationPrevious />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
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

export { ProductsScreen }
