"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Trash2, Edit, Plus, CreditCard } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PaymentMethod {
  id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

export function PaymentMethodsScreen({ user }: { user: any }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    active: true,
  })

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      console.log("[v0] PaymentMethods: Carregando formas de pagamento...")
      const response = await fetch("/api/payment-methods", {
        headers: {
          "x-user-email": user?.email || "",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] PaymentMethods: Carregadas", data.length, "formas de pagamento")
        setPaymentMethods(data)
      } else {
        console.error("[v0] PaymentMethods: Erro ao carregar:", response.status)
        toast({
          title: "Erro",
          description: "Erro ao carregar formas de pagamento",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] PaymentMethods: Erro:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar formas de pagamento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da forma de pagamento é obrigatório",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const method = editingMethod ? "PUT" : "POST"
      const url = "/api/payment-methods"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({
          ...formData,
          ...(editingMethod && { id: editingMethod.id }),
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Forma de pagamento ${editingMethod ? "atualizada" : "criada"} com sucesso!`,
        })
        setDialogOpen(false)
        resetForm()
        loadPaymentMethods()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("[v0] PaymentMethods: Erro ao salvar:", error)
      toast({
        title: "Erro",
        description: `Erro ao ${editingMethod ? "atualizar" : "criar"} forma de pagamento`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta forma de pagamento?")) return

    setDeleting(id)
    try {
      const response = await fetch(`/api/payment-methods?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user?.email || "",
        },
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Forma de pagamento excluída com sucesso!",
        })
        loadPaymentMethods()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("[v0] PaymentMethods: Erro ao excluir:", error)
      toast({
        title: "Erro",
        description: "Erro ao excluir forma de pagamento",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      const response = await fetch("/api/payment-methods", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({
          id: method.id,
          name: method.name,
          active: !method.active,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Forma de pagamento ${!method.active ? "ativada" : "desativada"} com sucesso!`,
        })
        loadPaymentMethods()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("[v0] PaymentMethods: Erro ao alterar status:", error)
      toast({
        title: "Erro",
        description: "Erro ao alterar status da forma de pagamento",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method)
    setFormData({
      name: method.name,
      active: method.active,
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingMethod(null)
    setFormData({
      name: "",
      active: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando formas de pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Formas de Pagamento
              </CardTitle>
              <CardDescription>Gerencie as formas de pagamento aceitas pelo seu estabelecimento</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Forma de Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingMethod ? "Editar" : "Nova"} Forma de Pagamento</DialogTitle>
                  <DialogDescription>
                    {editingMethod ? "Edite os dados da forma de pagamento" : "Adicione uma nova forma de pagamento"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Forma de Pagamento</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Cartão de Crédito, PIX, Dinheiro..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
                    />
                    <Label htmlFor="active">Ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma forma de pagamento cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{method.name}</TableCell>
                    <TableCell>
                      <Badge variant={method.active ? "default" : "secondary"}>
                        {method.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(method.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch checked={method.active} onCheckedChange={() => handleToggleActive(method)} size="sm" />
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(method)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                          disabled={deleting === method.id}
                        >
                          {deleting === method.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
