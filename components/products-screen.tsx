"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, Edit, Trash2 } from "lucide-react"

interface Product {
  id: string
  name: string
  category: string
  price: number
  description?: string
  image?: string
  active: boolean
  complements: string[]
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "X-Burger",
    category: "Hambúrgueres",
    price: 25.9,
    description: "Hambúrguer artesanal com carne bovina, queijo, alface e tomate",
    active: true,
    complements: ["Bacon", "Queijo extra", "Cebola caramelizada"],
  },
  {
    id: "2",
    name: "Pizza Margherita",
    category: "Pizzas",
    price: 35.0,
    description: "Pizza tradicional com molho de tomate, mussarela e manjericão",
    active: true,
    complements: ["Borda recheada", "Queijo extra"],
  },
  {
    id: "3",
    name: "Coca-Cola 2L",
    category: "Bebidas",
    price: 12.0,
    active: false,
    complements: [],
  },
]

const categories = ["Hambúrgueres", "Pizzas", "Bebidas", "Sobremesas", "Acompanhamentos"]

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("todas")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "todas" || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleSaveProduct = (productData: Partial<Product>) => {
    if (selectedProduct) {
      // Editar produto existente
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? { ...p, ...productData } : p)))
    } else {
      // Criar novo produto
      const newProduct: Product = {
        id: Date.now().toString(),
        name: productData.name || "",
        category: productData.category || "",
        price: productData.price || 0,
        description: productData.description || "",
        active: productData.active ?? true,
        complements: productData.complements || [],
      }
      setProducts((prev) => [...prev, newProduct])
    }
    setIsDialogOpen(false)
    setSelectedProduct(null)
  }

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  const toggleProductStatus = (productId: string) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: !p.active } : p)))
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
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-600 truncate max-w-xs">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{product.category}</Badge>
                  </td>
                  <td className="p-4 font-medium">R$ {product.price.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={product.active} onCheckedChange={() => toggleProductStatus(product.id)} />
                      <span className={product.active ? "text-green-600" : "text-gray-400"}>
                        {product.active ? "Ativo" : "Inativo"}
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
    name: product?.name || "",
    category: product?.category || "",
    price: product?.price || 0,
    description: product?.description || "",
    active: product?.active ?? true,
    complements: product?.complements || [],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Categoria</label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
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
        </div>

        <div>
          <label className="text-sm font-medium">Preço</label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData((prev) => ({ ...prev, price: Number.parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={formData.active}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
          />
          <label className="text-sm font-medium">Produto ativo</label>
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
