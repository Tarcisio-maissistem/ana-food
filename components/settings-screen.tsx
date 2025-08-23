"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Building2,
  Bell,
  Palette,
  MessageSquare,
  QrCode,
  Send,
  RefreshCw,
  Clock,
  User,
  Camera,
  Loader2,
  AlertCircle,
  Power,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useUser } from "./main-dashboard"
import { EstabelecimentoScreen } from "./estabelecimento-screen"
import { getInstanceName, type EmpresaData } from "@/utils/cache-empresa"
import { callEvolutionAPI } from "@/utils/api" // Import callEvolutionAPI

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

interface WhatsAppSession {
  instanceName: string
  status: "open" | "connecting" | "qr" | "close" | "disconnected" | "connected"
  lastUpdate: Date | null
  qrCode: string | null
  error?: string
}

const EVOLUTION_API_BASE_URL = "https://evo.anafood.vip"

const SettingsScreen = () => {
  const [activeTab, setActiveTab] = useState("perfil")
  const { user } = useUser()
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    avatar: null as string | null,
    theme: "light" as "light" | "dark",
    notifications: true,
  })

  const [newPaymentMethod, setNewPaymentMethod] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null)
  const [instanceName, setInstanceName] = useState("ana-food-instance")

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newOrders: true,
    orderReady: true,
    orderDelivered: false,
    soundEnabled: true,
    emailNotifications: true,
  })

  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession>({
    instanceName: instanceName,
    status: "close",
    lastUpdate: new Date(),
    qrCode: null,
  })

  const [selectedTheme, setSelectedTheme] = useState("orange")
  const [showQrModal, setShowQrModal] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || ""

  const themes = [
    { id: "orange", name: "Laranja", primary: "bg-orange-500", secondary: "bg-orange-100" },
    { id: "blue", name: "Azul", primary: "bg-blue-500", secondary: "bg-blue-100" },
    { id: "green", name: "Verde", primary: "bg-green-500", secondary: "bg-green-100" },
    { id: "purple", name: "Roxo", primary: "bg-purple-500", secondary: "bg-purple-100" },
    { id: "red", name: "Vermelho", primary: "bg-red-500", secondary: "bg-red-100" },
  ]

  const [autoNotifications, setAutoNotifications] = useState({
    enabled: true,
    statusUpdates: true,
    orderReady: true,
    orderDelivered: true,
  })

  const [customMessages, setCustomMessages] = useState({
    novo: "🍕 *{empresa}* - Pedido Confirmado!\n\nOlá {cliente}! Seu pedido #{numero} foi confirmado e está sendo preparado com carinho! 👨‍🍳\n\nTempo estimado: {tempo} minutos\n📱 Acompanhe: {link}",
    preparando:
      "👨‍🍳 *{empresa}* - Preparando seu Pedido!\n\nOlá {cliente}! Seu pedido #{numero} está sendo preparado na nossa cozinha! 🔥\n\nEm breve estará pronto! ⏰",
    pronto:
      "✅ *{empresa}* - Pedido Pronto!\n\nOlá {cliente}! Seu pedido #{numero} está pronto para retirada! 🎉\n\nVenha buscar quando puder! 📍 {endereco}",
    emEntrega:
      "🚗 *{empresa}* - Saiu para Entrega!\n\nOlá {cliente}! Seu pedido #{numero} saiu para entrega! 🛵\n\nEm breve chegará até você! 📍",
    concluido:
      "🎉 *{empresa}* - Pedido Entregue!\n\nOlá {cliente}! Obrigado por escolher a {empresa}! 💚\n\nEsperamos você novamente em breve! ⭐",
  })

  const [editingMessage, setEditingMessage] = useState<string | null>(null)

  const [testMessage, setTestMessage] = useState({
    phone: "",
    message: "",
  })
  const [isSendingTest, setIsSendingTest] = useState(false)

  const replaceTags = (message: string, orderData?: any, customerData?: any) => {
    const now = new Date()
    const empresa = empresaData?.nome || empresaData?.name || "Ana Food"

    // Dados de exemplo para teste (quando não há dados reais)
    const defaultData = {
      nome: customerData?.name || "João Silva",
      telefone: customerData?.phone || "11987654321",
      pedido: orderData?.number || "001",
      empresa: empresa,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }

    return message
      .replace(/\{nome\}/g, defaultData.nome)
      .replace(/\{telefone\}/g, defaultData.telefone)
      .replace(/\{pedido\}/g, defaultData.pedido)
      .replace(/\{empresa\}/g, defaultData.empresa)
      .replace(/\{data\}/g, defaultData.data)
      .replace(/\{hora\}/g, defaultData.hora)
  }

  const sendTestMessage = async () => {
    if (!testMessage.phone || !testMessage.message) {
      alert("Por favor, preencha o telefone e a mensagem.")
      return
    }

    setIsSendingTest(true)
    try {
      const processedMessage = replaceTags(testMessage.message)

      const response = await fetch("/api/whatsapp/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName,
          phone: testMessage.phone.replace(/\D/g, ""),
          message: processedMessage,
        }),
      })

      if (response.ok) {
        alert("Mensagem enviada com sucesso!")
        setTestMessage({ phone: "", message: "" })
      } else {
        const error = await response.json()
        alert(`Erro ao enviar mensagem: ${error.message || "Erro desconhecido"}`)
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      alert("Erro ao enviar mensagem. Verifique a conexão.")
    } finally {
      setIsSendingTest(false)
    }
  }

  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [statusMessages, setStatusMessages] = useState({
    novo: "Olá, seu pedido foi recebido!",
    preparando: "Seu pedido está sendo preparado com carinho!",
    pronto: "Seu pedido está pronto para retirada!",
    "em-entrega": "Seu pedido está a caminho!",
    concluidos: "Pedido entregue! Obrigado pela preferência!",
  })

  const [workingHours, setWorkingHours] = useState({
    monday: { open: "18:00", close: "23:00", enabled: true },
    tuesday: { open: "18:00", close: "23:00", enabled: true },
    wednesday: { open: "18:00", close: "23:00", enabled: true },
    thursday: { open: "18:00", close: "23:00", enabled: true },
    friday: { open: "18:00", close: "23:00", enabled: true },
    saturday: { open: "18:00", close: "23:00", enabled: false },
    sunday: { open: "18:00", close: "23:00", enabled: false },
  })

  const [isDarkMode, setIsDarkMode] = useState(false)

  const loadEmpresaData = async () => {
    try {
      console.log("[v0] Settings: Carregando dados da empresa...")
      const response = await fetch("/api/companies", {
        headers: {
          "x-user-email": user?.email || "",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Settings: Dados da empresa recebidos:", data)

        if (data && data.cnpj) {
          const empresaFormatted = {
            cnpj: data.cnpj,
            name: data.name,
            phone: data.phone,
            email: data.email,
          }
          setEmpresaData(empresaFormatted)
          console.log("[v0] Settings: CNPJ encontrado:", data.cnpj)

          const newInstanceName = getInstanceName(data.cnpj)
          setInstanceName(newInstanceName)
          setWhatsappSession((prev) => ({
            ...prev,
            instanceName: newInstanceName,
          }))
        } else {
          console.log("[v0] Settings: CNPJ não encontrado nos dados")
        }
      } else {
        console.error("[v0] Settings: Erro na resposta da API:", response.status)
      }
    } catch (error) {
      console.error("[v0] Settings: Erro ao carregar dados da empresa:", error)
    }
  }

  const checkInstanceStatus = async () => {
    // Implement checkInstanceStatus logic here
  }

  useEffect(() => {
    loadEmpresaData()
  }, [])

  useEffect(() => {
    if (apiKey && instanceName !== "ana-food-instance") {
      checkInstanceStatus()
    }
  }, [apiKey, instanceName])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (
      apiKey &&
      apiKey.trim() &&
      (whatsappSession.status === "connecting" || whatsappSession.status === "qr") &&
      !whatsappSession.error
    ) {
      console.log("Iniciando polling de status WhatsApp (settings)")
      interval = setInterval(() => {
        checkInstanceStatus()
      }, 5000) // Aumentar intervalo de 3s para 5s
    }

    return () => {
      if (interval) {
        console.log("Limpando polling de status WhatsApp (settings)")
        clearInterval(interval)
      }
    }
  }, [whatsappSession.status, whatsappSession.error, apiKey])

  useEffect(() => {
    const handleOpenWhatsAppTab = () => {
      setActiveTab("whatsapp")
    }

    window.addEventListener("openWhatsAppTab", handleOpenWhatsAppTab)

    return () => {
      window.removeEventListener("openWhatsAppTab", handleOpenWhatsAppTab)
    }
  }, [])

  const callWhatsAppAPI = async (action: string, data?: any) => {
    const response = await fetch("/api/whatsapp/instance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        instanceName,
        ...data,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Erro na API")
    }

    return response.json()
  }

  const checkWhatsappStatus = async () => {
    if (isCheckingStatus) return

    setIsCheckingStatus(true)
    try {
      console.log("Verificando status do WhatsApp...")

      const response = await fetch(`/api/whatsapp/status?instance=${instanceName}`)

      if (response.ok) {
        const data = await response.json()
        console.log("Status recebido:", data)

        const connectionState = data.instance?.state || "close"

        setWhatsappSession((prev) => ({
          ...prev,
          status:
            connectionState === "open" ? "connected" : connectionState === "connecting" ? "connecting" : "disconnected",
          lastUpdate: new Date(),
          error: undefined,
        }))
      } else {
        throw new Error(`Erro ${response.status}`)
      }
    } catch (error: any) {
      console.error("Erro ao verificar status:", error)
      setWhatsappSession((prev) => ({
        ...prev,
        error: error.message,
        lastUpdate: new Date(),
      }))
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const createWhatsappSession = async () => {
    setIsConnecting(true)
    try {
      console.log("Verificando se a instância já existe...")

      try {
        await callWhatsAppAPI("status")
        console.log("Instância já existe, conectando diretamente...")
        await connectToExistingInstance()
        return
      } catch (error) {
        console.log("Instância não existe, criando nova...")
      }

      console.log("Criando nova instância...")
      const createResponse = await callWhatsAppAPI("create")
      console.log("Instância criada:", createResponse)

      setTimeout(async () => {
        await connectToExistingInstance()
      }, 2000)
    } catch (error: any) {
      console.error("Erro ao criar sessão:", error)
      setWhatsappSession((prev) => ({
        ...prev,
        error: error.message,
        lastUpdate: new Date(),
      }))
      alert(`Erro ao criar sessão WhatsApp: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const connectToExistingInstance = async () => {
    try {
      const connectResponse = await callWhatsAppAPI("connect")

      console.log("Resposta da conexão:", connectResponse)

      let qrCodeData = null

      if (connectResponse.base64) {
        if (connectResponse.base64.startsWith("data:image")) {
          qrCodeData = connectResponse.base64
        } else {
          qrCodeData = `data:image/png;base64,${connectResponse.base64}`
        }
      } else if (connectResponse.qrcode) {
        if (connectResponse.qrcode.startsWith("data:image")) {
          qrCodeData = connectResponse.qrcode
        } else {
          qrCodeData = `data:image/png;base64,${connectResponse.qrcode}`
        }
      }

      if (qrCodeData) {
        console.log("QR Code processado:", qrCodeData.substring(0, 50) + "...")
        setWhatsappSession((prev) => ({
          ...prev,
          status: "qr",
          qrCode: qrCodeData,
          lastUpdate: new Date(),
          error: undefined,
        }))
        setShowQrModal(true)
      } else {
        await checkWhatsappStatus()
      }
    } catch (error: any) {
      console.error("Erro ao conectar:", error)
      setWhatsappSession((prev) => ({
        ...prev,
        error: error.message,
        lastUpdate: new Date(),
      }))
    }
  }

  const updateWhatsappSession = async () => {
    try {
      const qrResponse = await callWhatsAppAPI("connect")
      console.log("QR Code atualizado:", qrResponse)

      let qrCodeData = null

      if (qrResponse.base64) {
        if (qrResponse.base64.startsWith("data:image")) {
          qrCodeData = qrResponse.base64
        } else {
          qrCodeData = `data:image/png;base64,${qrResponse.base64}`
        }
      } else if (qrResponse.qrcode) {
        if (qrResponse.qrcode.startsWith("data:image")) {
          qrCodeData = qrResponse.qrcode
        } else {
          qrCodeData = `data:image/png;base64,${qrResponse.qrcode}`
        }
      }

      if (qrCodeData) {
        console.log("QR Code atualizado processado:", qrCodeData.substring(0, 50) + "...")
        setWhatsappSession((prev) => ({
          ...prev,
          status: "qr",
          qrCode: qrCodeData,
          lastUpdate: new Date(),
          error: undefined,
        }))
        setShowQrModal(true)
      }
    } catch (error: any) {
      console.error("Erro ao atualizar sessão:", error)
      setWhatsappSession((prev) => ({
        ...prev,
        error: error.message,
        lastUpdate: new Date(),
      }))
      alert(`Erro ao atualizar sessão WhatsApp: ${error.message}`)
    }
  }

  const handleDisconnectSession = async () => {
    if (confirm("Tem certeza que deseja desconectar o WhatsApp?")) {
      try {
        await callWhatsAppAPI("disconnect")
        setWhatsappSession((prev) => ({
          ...prev,
          status: "disconnected",
          qrCode: null,
          lastUpdate: new Date(),
          error: undefined,
        }))
        alert("WhatsApp desconectado com sucesso!")
      } catch (error: any) {
        console.error("Erro ao desconectar:", error)
        alert(`Erro ao desconectar WhatsApp: ${error.message}`)
      }
    }
  }

  const handleDeleteInstance = async () => {
    if (confirm("Tem certeza que deseja deletar completamente a instância? Esta ação não pode ser desfeita.")) {
      try {
        await callEvolutionAPI(`/instance/delete/${instanceName}`, "DELETE")

        setWhatsappSession({
          instanceName: instanceName,
          status: "close",
          lastUpdate: new Date(),
          qrCode: null,
        })

        setShowQrModal(false)
        alert("Instância deletada com sucesso!")
      } catch (error: any) {
        console.error("Erro ao deletar instância:", error)
        alert(`Erro ao deletar instância: ${error.message}`)
      }
    }
  }

  const sendOrderStatusUpdate = async (orderId: string, status: string, customerPhone: string) => {
    if (!apiKey || !autoNotifications.enabled) return

    try {
      const message = customMessages[status as keyof typeof customMessages]

      await callEvolutionAPI(`/message/sendText/${instanceName}`, "POST", {
        number: customerPhone,
        text: message,
      })

      console.log(`Mensagem enviada para ${customerPhone}: Pedido #${orderId} - ${status}`)
    } catch (error) {
      console.error("Erro ao enviar mensagem automática:", error)
    }
  }

  const insertTag = (tag: string) => {
    setTestMessage((prev) => ({
      ...prev,
      message: prev.message + tag,
    }))
  }

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
      console.log("Upload do logo:", file.name)
      alert("Logo enviado com sucesso!")
    }
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setProfileData((prev) => ({ ...prev, avatar: result }))
      toast.success("Foto de perfil atualizada!")
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
          <p className="text-gray-600">Gerencie suas preferências e configurações do sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="estabelecimento" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Estabelecimento</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>Configure seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center overflow-hidden">
                      {profileData.avatar ? (
                        <img
                          src={profileData.avatar || "/placeholder.svg"}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-2xl font-semibold">
                          {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-transparent"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{user?.name || "Usuário"}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>Configure suas preferências pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tema Escuro</Label>
                    <p className="text-sm text-gray-600">Ativar modo escuro para reduzir cansaço visual</p>
                  </div>
                  <Switch
                    checked={profileData.theme === "dark"}
                    onCheckedChange={(checked) => {
                      setProfileData((prev) => ({ ...prev, theme: checked ? "dark" : "light" }))
                      document.documentElement.classList.toggle("dark", checked)
                      toast.success(`Tema ${checked ? "escuro" : "claro"} ativado!`)
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações</Label>
                    <p className="text-sm text-gray-600">Receber notificações do sistema</p>
                  </div>
                  <Switch
                    checked={profileData.notifications}
                    onCheckedChange={(checked) => {
                      setProfileData((prev) => ({ ...prev, notifications: checked }))
                      toast.success(`Notificações ${checked ? "ativadas" : "desativadas"}!`)
                    }}
                  />
                </div>

                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  <User className="w-4 h-4 mr-2" />
                  Salvar Perfil
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Configurações da Empresa
              </CardTitle>
              <CardDescription>Acesse as configurações detalhadas do estabelecimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Configure os dados da sua empresa na seção específica do estabelecimento
                </p>
                <Button
                  onClick={() => (window.location.href = "#estabelecimento")}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Ir para Estabelecimento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estabelecimento">
          <div className="space-y-6">
            <EstabelecimentoScreen />
          </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Status da Sessão WhatsApp
                </CardTitle>
                <CardDescription>Monitoramento em tempo real da conexão</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{getStatusText(whatsappSession.status)}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>
                          {whatsappSession.lastUpdate
                            ? `Atualizado ${whatsappSession.lastUpdate.toLocaleTimeString("pt-BR")}`
                            : "Nunca atualizado"}
                        </span>
                      </div>
                      {whatsappSession.status === "connected" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                          Online
                        </Badge>
                      )}
                      {(whatsappSession.status === "connecting" || whatsappSession.status === "qr") && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Conectando
                        </Badge>
                      )}
                      {whatsappSession.status === "disconnected" && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Desconectado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {whatsappSession.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Erro de Conexão</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{whatsappSession.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Sessão</CardTitle>
                <CardDescription>Controle a conexão com o WhatsApp Business</CardDescription>
              </CardHeader>
              <CardContent>
                {!apiKey ? (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-800 font-medium">❌ API Key não configurada</p>
                    <p className="text-sm text-red-700 mt-1">
                      Configure a variável de ambiente NEXT_PUBLIC_EVOLUTION_API_KEY
                    </p>
                  </div>
                ) : !empresaData?.cnpj ? (
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-amber-800 font-medium">⚠️ CNPJ não configurado</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Configure o CNPJ da empresa na aba "Estabelecimento" para usar a integração WhatsApp
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {whatsappSession.status === "close" ||
                      (whatsappSession.status === "disconnected" && (
                        <Button
                          onClick={createWhatsappSession}
                          disabled={isConnecting}
                          className="flex-1 min-w-[200px]"
                        >
                          {isConnecting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="w-4 h-4 mr-2" />
                          )}
                          {isConnecting ? "Criando Sessão..." : "Criar Sessão"}
                        </Button>
                      ))}

                    {whatsappSession.status !== "close" && whatsappSession.status !== "disconnected" && (
                      <>
                        <Button variant="outline" onClick={updateWhatsappSession}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reconectar
                        </Button>

                        <Button variant="outline" onClick={checkWhatsappStatus} disabled={isCheckingStatus}>
                          {isCheckingStatus ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Atualizar Status
                        </Button>

                        <Button variant="destructive" onClick={handleDisconnectSession}>
                          <Power className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                      </>
                    )}

                    {whatsappSession.qrCode &&
                      (whatsappSession.status === "qr" || whatsappSession.status === "connecting") && (
                        <Button variant="outline" onClick={() => setShowQrModal(true)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Ver QR Code
                        </Button>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            {whatsappSession.status === "connected" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Teste de Envio de Mensagem
                  </CardTitle>
                  <CardDescription>Envie uma mensagem de teste para verificar a conexão</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="test-phone">Número do Telefone</Label>
                      <Input
                        id="test-phone"
                        type="tel"
                        placeholder="5511999999999"
                        value={testMessage.phone}
                        onChange={(e) => setTestMessage((prev) => ({ ...prev, phone: e.target.value }))}
                        autoComplete="off"
                        data-form-type="other"
                      />
                      <p className="text-xs text-gray-500 mt-1">Digite com código do país (ex: 5511999999999)</p>
                    </div>
                    <div>
                      <Label htmlFor="test-message">Mensagem</Label>
                      <textarea
                        id="test-message"
                        className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Digite sua mensagem de teste aqui..."
                        value={testMessage.message}
                        onChange={(e) => setTestMessage((prev) => ({ ...prev, message: e.target.value }))}
                        autoComplete="off"
                        data-form-type="other"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Tags Disponíveis:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => insertTag("{nome}")}
                        className="bg-blue-100 px-2 py-1 rounded text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer text-left"
                      >
                        {"{nome}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{telefone}")}
                        className="bg-blue-100 px-2 py-1 rounded text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer text-left"
                      >
                        {"{telefone}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{pedido}")}
                        className="bg-blue-100 px-2 py-1 rounded text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer text-left"
                      >
                        {"{pedido}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{empresa}")}
                        className="bg-blue-100 px-2 py-1 rounded text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer text-left"
                      >
                        {"{empresa}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{data}")}
                        className="bg-blue-100 px-2 py-1 rounded text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer text-left"
                      >
                        {"{data}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTag("{hora}")}
                        className="bg-blue-100 px-2 py-1 rounded text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer text-left"
                      >
                        {"{hora}"}
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      Clique nas tags para adicioná-las à mensagem. Elas serão substituídas pelos dados reais do
                      cliente/pedido.
                    </p>
                  </div>

                  <Button
                    onClick={sendTestMessage}
                    disabled={isSendingTest || !testMessage.phone || !testMessage.message}
                    className="w-full"
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {isSendingTest ? "Enviando..." : "Enviar Mensagem de Teste"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações Automáticas
                </CardTitle>
                <CardDescription>Configure mensagens automáticas para cada status do pedido</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications-enabled">Ativar Notificações</Label>
                    <p className="text-sm text-gray-600">
                      Enviar mensagens automáticas quando o status do pedido mudar
                    </p>
                  </div>
                  <Switch
                    id="notifications-enabled"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                {notificationsEnabled && (
                  <div className="space-y-4 border-t pt-4">
                    {Object.entries(statusMessages).map(([status, message]) => (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">
                            {status === "novo" && "🆕 Novo Pedido"}
                            {status === "preparando" && "👨‍🍳 Preparando"}
                            {status === "pronto" && "✅ Pronto"}
                            {status === "em-entrega" && "🚚 Em Entrega"}
                            {status === "concluidos" && "🎉 Concluído"}
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingMessage(editingMessage === status ? null : status)}
                          >
                            {editingMessage === status ? "Cancelar" : "Editar"}
                          </Button>
                        </div>

                        {editingMessage === status ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              value={message}
                              onChange={(e) =>
                                setStatusMessages((prev) => ({
                                  ...prev,
                                  [status]: e.target.value,
                                }))
                              }
                              placeholder="Digite a mensagem para este status..."
                              autoComplete="off"
                              data-form-type="other"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  localStorage.setItem("ana-food-status-messages", JSON.stringify(statusMessages))
                                  setEditingMessage(null)
                                }}
                              >
                                Salvar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingMessage(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">{message}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Configurações de Notificação
              </CardTitle>
              <CardDescription>Configure alertas sonoros e visuais do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Alertas do Sistema</h4>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <div>
                      <p className="font-medium">Novos Pedidos</p>
                      <p className="text-sm text-gray-600">Alerta quando um novo pedido chegar</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <div>
                      <p className="font-medium">Alertas Sonoros</p>
                      <p className="text-sm text-gray-600">Reproduzir som para notificações</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <Switch />
                    <div>
                      <p className="font-medium">Notificações por E-mail</p>
                      <p className="text-sm text-gray-600">Receber resumos por e-mail</p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Aparência do Sistema
              </CardTitle>
              <CardDescription>Personalize a aparência da interface</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  As configurações de aparência foram movidas para o seu perfil pessoal
                </p>
                <Button onClick={() => setActiveTab("perfil")} className="bg-orange-500 hover:bg-orange-600">
                  Ir para Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>Escaneie o QR Code com seu WhatsApp para conectar a conta business</DialogDescription>
          </DialogHeader>

          <div className="flex justify-center p-4">
            <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
              {whatsappSession.qrCode ? (
                <img
                  src={whatsappSession.qrCode || "/placeholder.svg"}
                  alt="QR Code WhatsApp"
                  className="w-full h-full object-contain rounded"
                  onError={(e) => {
                    console.error("Erro ao carregar QR Code:", whatsappSession.qrCode?.substring(0, 100))
                    e.currentTarget.src = "/placeholder.svg?height=256&width=256&text=Erro+ao+carregar+QR+Code"
                  }}
                />
              ) : (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Gerando QR Code...</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-yellow-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Aguardando conexão...</span>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p className="font-medium mb-1">Como conectar:</p>
              <ol className="text-left space-y-1">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>
                  2. Vá em <strong>Dispositivos Conectados</strong>
                </li>
                <li>
                  3. Toque em <strong>Conectar um dispositivo</strong>
                </li>
                <li>4. Escaneie este QR Code</li>
              </ol>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={checkWhatsappStatus} disabled={isCheckingStatus}>
                {isCheckingStatus ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Verificar Conexão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return "text-green-600"
    case "connecting":
    case "qr":
      return "text-yellow-600"
    case "close":
      return "text-red-600"
    default:
      return "text-gray-600"
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "open":
      return "🟢 Conectado"
    case "connecting":
      return "🟡 Conectando"
    case "qr":
      return "🟡 Aguardando QR Code"
    case "close":
      return "🔴 Desconectado"
    default:
      return "🔴 Desconectado"
  }
}

export { SettingsScreen }
export default SettingsScreen
