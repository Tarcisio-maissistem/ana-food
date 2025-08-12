"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Upload, Save, Store, Palette, Bell, Users } from "lucide-react"

interface EstablishmentData {
  name: string
  cnpj: string
  address: string
  phone: string
  email: string
  openingHours: string
  deliveryTime: number
  minimumOrder: number
  logo?: string
}

interface NotificationSettings {
  newOrders: boolean
  orderReady: boolean
  orderDelivered: boolean
  soundEnabled: boolean
  emailNotifications: boolean
}

export function SettingsScreen() {
  const [establishmentData, setEstablishmentData] = useState<EstablishmentData>({
    name: "Ana Food",
    cnpj: "12.345.678/0001-90",
    address: "Rua Principal, 456 - Centro",
    phone: "(11) 99999-9999",
    email: "contato@anafood.com.br",
    openingHours: "18:00 - 23:00",
    deliveryTime: 30,
    minimumOrder: 25.0,
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newOrders: true,
    orderReady: true,
    orderDelivered: false,
    soundEnabled: true,
    emailNotifications: true,
  })

  const [selectedTheme, setSelectedTheme] = useState("orange")

  const themes = [
    { id: "orange", name: "Laranja", primary: "bg-orange-500", secondary: "bg-orange-100" },
    { id: "blue", name: "Azul", primary: "bg-blue-500", secondary: "bg-blue-100" },
    { id: "green", name: "Verde", primary: "bg-green-500", secondary: "bg-green-100" },
    { id: "purple", name: "Roxo", primary: "bg-purple-500", secondary: "bg-purple-100" },
    { id: "red", name: "Vermelho", primary: "bg-red-500", secondary: "bg-red-100" },
  ]

  const handleSaveEstablishment = () => {
    console.log("Salvando dados do estabelecimento:", establishmentData)
    alert("Dados salvos com sucesso!")
  }

  const handleSaveNotifications = () => {
    console.log("Salvando configurações de notificação:", notifications)
    alert("Configurações salvas com sucesso!")
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Simula upload do logo
      console.log("Upload do logo:", file.name)
      alert("Logo enviado com sucesso!")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <Tabs defaultValue="establishment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="establishment">
            <Store className="w-4 h-4 mr-2" />
            Estabelecimento
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="establishment">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Estabelecimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome do Estabelecimento</label>
                  <Input
                    value={establishmentData.name}
                    onChange={(e) => setEstablishmentData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">CNPJ</label>
                  <Input
                    value={establishmentData.cnpj}
                    onChange={(e) => setEstablishmentData((prev) => ({ ...prev, cnpj: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={establishmentData.phone}
                    onChange={(e) => setEstablishmentData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">E-mail</label>
                  <Input
                    type="email"
                    value={establishmentData.email}
                    onChange={(e) => setEstablishmentData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Horário de Funcionamento</label>
                  <Input
                    value={establishmentData.openingHours}
                    onChange={(e) => setEstablishmentData((prev) => ({ ...prev, openingHours: e.target.value }))}
                    placeholder="Ex: 18:00 - 23:00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tempo de Entrega (minutos)</label>
                  <Input
                    type="number"
                    value={establishmentData.deliveryTime}
                    onChange={(e) =>
                      setEstablishmentData((prev) => ({ ...prev, deliveryTime: Number.parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Endereço Completo</label>
                <Textarea
                  value={establishmentData.address}
                  onChange={(e) => setEstablishmentData((prev) => ({ ...prev, address: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Pedido Mínimo (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={establishmentData.minimumOrder}
                  onChange={(e) =>
                    setEstablishmentData((prev) => ({ ...prev, minimumOrder: Number.parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <Button onClick={handleSaveEstablishment} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logotipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    {establishmentData.logo ? (
                      <img
                        src={establishmentData.logo || "/placeholder.svg"}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Store className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Logo
                        </span>
                      </Button>
                    </label>
                    <p className="text-sm text-gray-600 mt-2">Recomendado: 200x200px, PNG ou JPG</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tema de Cores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTheme === theme.id ? "border-gray-900" : "border-gray-200"
                      }`}
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full ${theme.primary}`} />
                        <div className={`w-6 h-6 rounded-full ${theme.secondary}`} />
                      </div>
                      <p className="text-sm font-medium">{theme.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Novos Pedidos</p>
                    <p className="text-sm text-gray-600">Receber notificação quando um novo pedido chegar</p>
                  </div>
                  <Switch
                    checked={notifications.newOrders}
                    onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, newOrders: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pedido Pronto</p>
                    <p className="text-sm text-gray-600">Notificar quando um pedido estiver pronto</p>
                  </div>
                  <Switch
                    checked={notifications.orderReady}
                    onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, orderReady: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pedido Entregue</p>
                    <p className="text-sm text-gray-600">Notificar quando um pedido for entregue</p>
                  </div>
                  <Switch
                    checked={notifications.orderDelivered}
                    onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, orderDelivered: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Som de Notificação</p>
                    <p className="text-sm text-gray-600">Reproduzir som quando receber notificações</p>
                  </div>
                  <Switch
                    checked={notifications.soundEnabled}
                    onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, soundEnabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações por E-mail</p>
                    <p className="text-sm text-gray-600">Receber resumos diários por e-mail</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gerenciamento de Usuários</CardTitle>
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  Convidar Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                      A
                    </div>
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-sm text-gray-600">admin@anafood.com.br</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>Proprietário</Badge>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum outro usuário cadastrado</p>
                  <p className="text-sm">Convide membros da sua equipe para colaborar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
