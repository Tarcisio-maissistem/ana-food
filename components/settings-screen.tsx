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
  MessageSquare,
  QrCode,
  RefreshCw,
  Clock,
  User,
  Camera,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useUser } from "./main-dashboard"
import { EstabelecimentoScreen } from "./estabelecimento-screen"

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

interface TestMessage {
  phone: string
  message: string
  tags: string
}

interface EmpresaData {
  id?: string
  name?: string
  cnpj?: string
  address?: string
  phone?: string
  email?: string
}

const EVOLUTION_API_BASE_URL = "https://evo.anafood.vip"

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

  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null)
  const [instanceName, setInstanceName] = useState("")

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

  const [showQrModal, setShowQrModal] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const [testMessage, setTestMessage] = useState<TestMessage>({
    phone: "",
    message: "",
    tags: "",
  })
  const [isSendingTest, setIsSendingTest] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadEmpresaData = async () => {
    try {
      console.log("[v0] Settings: Carregando dados da empresa...")

      const response = await fetch("/api/companies", {
        headers: {
          "user-email": user?.email || "",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Settings: Dados da empresa recebidos:", data)

        if (data.cnpj) {
          console.log("[v0] Settings: CNPJ encontrado:", data.cnpj)
          setEmpresaData(data)

          const cnpjInstance = `whatsapp-${data.cnpj.replace(/[^\d]/g, "")}`
          setInstanceName(cnpjInstance)
          setWhatsappSession((prev) => ({
            ...prev,
            instanceName: cnpjInstance,
          }))

          setTimeout(() => {
            validateAndCreateSession(cnpjInstance)
          }, 1000)
        } else {
          console.log("[v0] Settings: CNPJ não encontrado nos dados")
        }
      } else {
        console.error("[v0] Settings: Erro ao carregar dados da empresa")
      }
    } catch (error) {
      console.error("[v0] Settings: Erro:", error)
    }
  }

  const validateAndCreateSession = async (cnpjInstanceName: string) => {
    try {
      console.log("[v0] WhatsApp: Iniciando validação robusta para instância:", cnpjInstanceName)

      // Primeiro, buscar todas as instâncias existentes
      const instancesResponse = await fetch("/api/whatsapp/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetchInstances",
          instanceName: cnpjInstanceName,
        }),
      })

      if (instancesResponse.ok) {
        const instances = await instancesResponse.json()
        console.log("[v0] WhatsApp: Instâncias encontradas:", instances)

        // Procurar nossa instância específica na lista
        const existingInstance = instances.find(
          (instance: any) => instance.name === cnpjInstanceName || instance.instanceName === cnpjInstanceName,
        )

        if (existingInstance) {
          console.log("[v0] WhatsApp: Instância encontrada:", existingInstance)

          // Se a instância existe, tentar conectar diretamente
          try {
            await connectToExistingInstance(cnpjInstanceName)
            return
          } catch (connectError) {
            console.log("[v0] WhatsApp: Falha ao conectar, deletando instância corrompida...")

            // Se falhar ao conectar, deletar e recriar
            await forceDeleteAndRecreate(cnpjInstanceName)
            return
          }
        }
      }

      // Se chegou aqui, a instância não existe - criar nova
      console.log("[v0] WhatsApp: Instância não encontrada, criando nova...")
      await createNewInstance(cnpjInstanceName)
    } catch (error) {
      console.error("[v0] WhatsApp: Erro na validação:", error)
      // Em caso de erro na validação, tentar criar diretamente
      await createNewInstance(cnpjInstanceName)
    }
  }

  const forceDeleteAndRecreate = async (cnpjInstanceName: string) => {
    try {
      console.log("[v0] WhatsApp: Forçando deleção da instância:", cnpjInstanceName)

      // Tentar deletar a instância existente
      const deleteResponse = await fetch("/api/whatsapp/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          instanceName: cnpjInstanceName,
        }),
      })

      if (deleteResponse.ok) {
        console.log("[v0] WhatsApp: Instância deletada com sucesso")

        // Aguardar um momento para garantir que foi deletada
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Criar nova instância
        await createNewInstance(cnpjInstanceName)
      } else {
        console.log("[v0] WhatsApp: Falha ao deletar, tentando criar mesmo assim...")
        await createNewInstance(cnpjInstanceName)
      }
    } catch (error) {
      console.error("[v0] WhatsApp: Erro ao deletar e recriar:", error)
      throw error
    }
  }

  const createNewInstance = async (cnpjInstanceName: string) => {
    setIsConnecting(true)

    try {
      console.log("[v0] WhatsApp: Criando nova instância:", cnpjInstanceName)

      const createResponse = await fetch("/api/whatsapp/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          instanceName: cnpjInstanceName,
        }),
      })

      const responseText = await createResponse.text()
      console.log("[v0] WhatsApp: Resposta da criação:", createResponse.status, responseText)

      if (createResponse.ok) {
        const createData = JSON.parse(responseText)
        console.log("[v0] WhatsApp: Instância criada com sucesso:", createData)

        setWhatsappSession((prev) => ({
          ...prev,
          status: "connecting",
          lastUpdate: new Date(),
          error: undefined,
        }))

        // Aguardar um momento e tentar conectar
        setTimeout(async () => {
          await connectToExistingInstance(cnpjInstanceName)
        }, 5000)
      } else if (createResponse.status === 403 && responseText.includes("already in use")) {
        console.log("[v0] WhatsApp: Instância já existe (403), forçando deleção e recriação...")

        // Se receber 403 "already in use", forçar deleção e tentar novamente
        await forceDeleteAndRecreate(cnpjInstanceName)
      } else {
        // Outros erros
        let errorMessage = "Erro ao criar instância WhatsApp"

        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = responseText || errorMessage
        }

        if (createResponse.status === 401) {
          errorMessage = "Erro de autenticação: Verifique a configuração da API Key"
        } else if (createResponse.status === 404) {
          errorMessage = "Evolution API não encontrado: Verifique se está rodando"
        }

        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error("[v0] WhatsApp: Erro ao criar instância:", error)

      setWhatsappSession((prev) => ({
        ...prev,
        status: "disconnected",
        error: error.message,
        lastUpdate: new Date(),
      }))

      toast.error(`Erro ao criar sessão WhatsApp: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const connectToExistingInstance = async (instanceName?: string) => {
    try {
      const currentInstanceName = instanceName || whatsappSession.instanceName
      if (!currentInstanceName) {
        throw new Error("Nome da instância não definido")
      }

      console.log("[v0] WhatsApp: Conectando à instância existente:", currentInstanceName)

      const connectResponse = await fetch("/api/whatsapp/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          instanceName: currentInstanceName,
        }),
      })

      if (!connectResponse.ok) {
        const errorText = await connectResponse.text()
        throw new Error(`Erro ${connectResponse.status}: ${errorText}`)
      }

      const connectData = await connectResponse.json()
      console.log("[v0] WhatsApp: Resposta da conexão:", connectData)

      // Processar QR Code se disponível
      let qrCodeData = null
      if (connectData.base64) {
        qrCodeData = connectData.base64.startsWith("data:image")
          ? connectData.base64
          : `data:image/png;base64,${connectData.base64}`
      } else if (connectData.qrcode) {
        qrCodeData = connectData.qrcode.startsWith("data:image")
          ? connectData.qrcode
          : `data:image/png;base64,${connectData.qrcode}`
      }

      if (qrCodeData) {
        console.log("[v0] WhatsApp: QR Code obtido com sucesso")
        setWhatsappSession((prev) => ({
          ...prev,
          status: "qr",
          qrCode: qrCodeData,
          lastUpdate: new Date(),
          error: undefined,
        }))
        setShowQrModal(true)
      } else {
        // Se não há QR Code, verificar status
        await checkWhatsappStatus()
      }
    } catch (error: any) {
      console.error("[v0] WhatsApp: Erro ao conectar à instância:", error)
      throw error
    }
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

  const sendTestMessage = async () => {
    if (!testMessage.phone || !testMessage.message) {
      toast.error("Preencha o telefone e a mensagem")
      return
    }

    setIsSendingTest(true)
    try {
      console.log("[v0] WhatsApp: Enviando mensagem de teste:", testMessage)

      // Processar tags na mensagem
      let processedMessage = testMessage.message
      if (testMessage.tags) {
        const tags = testMessage.tags.split(",").map((tag) => tag.trim())
        tags.forEach((tag) => {
          processedMessage = processedMessage.replace(`{${tag}}`, `[${tag.toUpperCase()}]`)
        })
      }

      const response = await fetch("/api/whatsapp/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: instanceName,
          phone: testMessage.phone,
          message: processedMessage,
        }),
      })

      if (response.ok) {
        toast.success("Mensagem de teste enviada com sucesso!")
        setTestMessage({ phone: "", message: "", tags: "" })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao enviar mensagem")
      }
    } catch (error: any) {
      console.error("[v0] WhatsApp: Erro ao enviar teste:", error)
      toast.error(`Erro ao enviar: ${error.message}`)
    } finally {
      setIsSendingTest(false)
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

  const createWhatsappSession = async () => {
    if (!empresaData?.cnpj) {
      toast.error("Configure o CNPJ da empresa primeiro")
      return
    }

    const cnpjInstance = `whatsapp-${empresaData.cnpj.replace(/[^\d]/g, "")}`
    setInstanceName(cnpjInstance)
    setWhatsappSession((prev) => ({
      ...prev,
      instanceName: cnpjInstance,
    }))

    await createNewInstance(cnpjInstance)
  }

  useEffect(() => {
    loadEmpresaData()
  }, [])

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
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-gray-900">{getStatusText(whatsappSession.status)}</p>
                        {whatsappSession.status === "open" || whatsappSession.status === "connected" ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                            Online
                          </Badge>
                        ) : whatsappSession.status === "connecting" || whatsappSession.status === "qr" ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Conectando
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Desconectado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>
                          {whatsappSession.lastUpdate
                            ? `Atualizado ${whatsappSession.lastUpdate.toLocaleTimeString("pt-BR")}`
                            : "Nunca atualizado"}
                        </span>
                      </div>
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

            {whatsappSession.status === "open" || whatsappSession.status === "connected" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Teste de Mensagens
                  </CardTitle>
                  <CardDescription>Envie mensagens de teste com tags personalizadas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="test-phone">Telefone (com código do país)</Label>
                    <Input
                      id="test-phone"
                      placeholder="5562999999999"
                      value={testMessage.phone}
                      onChange={(e) => setTestMessage((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Exemplo: 5562999999999 (Brasil + DDD + número)</p>
                  </div>

                  <div>
                    <Label htmlFor="test-tags">Tags Disponíveis (separadas por vírgula)</Label>
                    <Input
                      id="test-tags"
                      placeholder="nome, pedido, valor, data"
                      value={testMessage.tags}
                      onChange={(e) => setTestMessage((prev) => ({ ...prev, tags: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use {`{nome}`}, {`{pedido}`}, etc. na mensagem
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="test-message">Mensagem de Teste</Label>
                    <textarea
                      id="test-message"
                      className="w-full p-3 border border-gray-300 rounded-md resize-none"
                      rows={4}
                      placeholder="Olá {nome}! Seu pedido {pedido} no valor de {valor} está pronto!"
                      value={testMessage.message}
                      onChange={(e) => setTestMessage((prev) => ({ ...prev, message: e.target.value }))}
                    />
                  </div>

                  <Button
                    onClick={sendTestMessage}
                    disabled={isSendingTest || !testMessage.phone || !testMessage.message}
                    className="w-full"
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    {isSendingTest ? "Enviando..." : "Enviar Teste"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Sessão</CardTitle>
                <CardDescription>Controle a conexão com o WhatsApp Business</CardDescription>
              </CardHeader>
              <CardContent>
                {!empresaData?.cnpj ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">⚠️ CNPJ não configurado</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Configure o CNPJ da empresa na aba "Estabelecimento" para usar a integração WhatsApp
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        <span className="font-medium">Instância WhatsApp</span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        ID da Instância: <code className="bg-blue-100 px-1 rounded">{instanceName}</code>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Baseado no CNPJ: {empresaData.cnpj}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {(whatsappSession.status === "close" || whatsappSession.status === "disconnected") && (
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
                      )}

                      {whatsappSession.status !== "close" && whatsappSession.status !== "disconnected" && (
                        <>
                          <Button variant="outline" onClick={checkWhatsappStatus} disabled={isCheckingStatus}>
                            {isCheckingStatus ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Atualizar Status
                          </Button>

                          {whatsappSession.qrCode &&
                            (whatsappSession.status === "qr" || whatsappSession.status === "connecting") && (
                              <Button variant="outline" onClick={() => setShowQrModal(true)}>
                                <QrCode className="w-4 h-4 mr-2" />
                                Ver QR Code
                              </Button>
                            )}
                        </>
                      )}
                    </div>
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
                    <Switch
                      checked={notifications.newOrders}
                      onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, newOrders: checked }))}
                    />
                    <div>
                      <p className="font-medium">Novos Pedidos</p>
                      <p className="text-sm text-gray-600">Alerta quando um novo pedido chegar</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <Switch
                      checked={notifications.soundEnabled}
                      onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, soundEnabled: checked }))}
                    />
                    <div>
                      <p className="font-medium">Alertas Sonoros</p>
                      <p className="text-sm text-gray-600">Reproduzir som para notificações</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, emailNotifications: checked }))
                      }
                    />
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

export { SettingsScreen }
export default SettingsScreen
