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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Printer,
  Plus,
  Edit,
  Trash2,
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

interface PrinterConfig {
  id: string
  name: string
  type: "USB" | "Rede" | "Bluetooth"
  status: "Conectada" | "Desconectada" | "Erro"
  model: string
  port?: string
  ip?: string
  sector: string
}

interface PrinterSector {
  id: string
  name: string
  printer_name?: string | null
  active: boolean
  user_id?: string
}

interface PrintLocation {
  id: string
  name: string
  printer_name: string
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

  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [printerSectors, setPrinterSectors] = useState<PrinterSector[]>([])
  const [qzTrayConnected, setQzTrayConnected] = useState(false)
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false)
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterConfig | null>(null)
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false)
  const [selectedSector, setSelectedSector] = useState<PrinterSector | null>(null)
  const [isSectorDialogOpen, setIsSectorDialogOpen] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState<{ name: string; status: string }[]>([])

  const [printLocationsList, setPrintLocationsList] = useState<PrintLocation[]>([])
  const [selectedPrintLocation, setSelectedPrintLocation] = useState<PrintLocation | null>(null)
  const [isPrintLocationDialogOpen, setIsPrintLocationDialogOpen] = useState(false)
  const [isPrintLocationSaving, setIsPrintLocationSaving] = useState(false)

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
        await checkWhatsappStatus(currentInstanceName)
      }
    } catch (error: any) {
      console.error("[v0] WhatsApp: Erro ao conectar à instância:", error)
      throw error
    }
  }

  const checkWhatsappStatus = async (instanceNameParam?: string) => {
    if (isCheckingStatus) return

    setIsCheckingStatus(true)
    try {
      console.log("Verificando status do WhatsApp...")

      const currentInstanceName = instanceNameParam || whatsappSession.instanceName || instanceName
      if (!currentInstanceName) {
        throw new Error("Nome da instância não definido")
      }

      console.log("[v0] WhatsApp: Verificando status para instância:", currentInstanceName)

      const response = await fetch(`/api/whatsapp/status?instance=${currentInstanceName}`)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] WhatsApp: Status recebido:", data)

        const connectionState = data.instance?.state || "close"

        setWhatsappSession((prev) => ({
          ...prev,
          status:
            connectionState === "open" || connectionState === "connected"
              ? "connected"
              : connectionState === "connecting"
                ? "connecting"
                : "disconnected",
          lastUpdate: new Date(),
          error: undefined,
        }))
      } else {
        throw new Error(`Erro ${response.status}`)
      }
    } catch (error: any) {
      console.error("[v0] WhatsApp: Erro ao verificar status:", error)
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

  const checkQzTrayConnection = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).qz) {
        const qz = (window as any).qz
        await qz.websocket.connect()
        setQzTrayConnected(true)
        console.log("[v0] QZ Tray conectado com sucesso")
        return true
      } else {
        console.log("[v0] QZ Tray não encontrado")
        setQzTrayConnected(false)
        return false
      }
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error)
      setQzTrayConnected(false)
      return false
    }
  }

  const loadWindowsPrinters = async () => {
    if (!qzTrayConnected) {
      const connected = await checkQzTrayConnection()
      if (!connected) {
        toast.error("QZ Tray não está conectado. Instale e execute o QZ Tray.")
        return []
      }
    }

    try {
      const qz = (window as any).qz
      const printerList = await qz.printers.find()
      console.log("[v0] Impressoras do Windows encontradas:", printerList)
      return printerList
    } catch (error) {
      console.error("[v0] Erro ao buscar impressoras do Windows:", error)
      toast.error("Erro ao buscar impressoras do sistema")
      return []
    }
  }

  const loadPrinters = async () => {
    setIsLoadingPrinters(true)
    try {
      const response = await fetch("/api/printers", {
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPrinters(Array.isArray(data) ? data : [])
      } else {
        console.error("Erro ao carregar impressoras:", response.status)
        setPrinters([])
      }
    } catch (error) {
      console.error("Erro ao carregar impressoras:", error)
      setPrinters([])
    } finally {
      setIsLoadingPrinters(false)
    }
  }

  const loadPrinterSectors = async () => {
    try {
      const response = await fetch("/api/print-locations", {
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPrinterSectors(Array.isArray(data) ? data : [])
      } else {
        console.error("Erro ao carregar setores de impressão:", response.status)
        setPrinterSectors([])
      }
    } catch (error) {
      console.error("Erro ao carregar setores:", error)
      setPrinterSectors([])
    }
  }

  const syncWithQzTray = async () => {
    const windowsPrinters = await loadWindowsPrinters()
    if (windowsPrinters.length === 0) return

    toast.success(`${windowsPrinters.length} impressoras encontradas no sistema`)

    setAvailablePrinters(windowsPrinters.map((name) => ({ name, status: "Disponível" })))
    console.log("[v0] Impressoras disponíveis para configuração:", windowsPrinters)
  }

  const handleUpdateSector = async (sectorId: string, printerName: string | null) => {
    try {
      const response = await fetch("/api/print-locations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({
          id: sectorId,
          printer_name: printerName,
          active: true,
        }),
      })

      if (response.ok) {
        await loadPrinterSectors()
        toast.success("Setor atualizado com sucesso!")
      } else {
        toast.error("Erro ao atualizar setor")
      }
    } catch (error) {
      console.error("Erro ao atualizar setor:", error)
      toast.error("Erro ao atualizar setor")
    }
  }

  const handleAddSector = async (sectorName: string) => {
    try {
      const response = await fetch("/api/print-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({
          name: sectorName,
          active: true,
        }),
      })

      if (response.ok) {
        await loadPrinterSectors()
        toast.success("Setor adicionado com sucesso!")
      } else {
        toast.error("Erro ao adicionar setor")
      }
    } catch (error) {
      console.error("Erro ao adicionar setor:", error)
      toast.error("Erro ao adicionar setor")
    }
  }

  const handleDeleteSector = async (sectorId: string) => {
    try {
      const response = await fetch(`/api/print-locations?id=${sectorId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        await loadPrinterSectors()
        toast.success("Setor removido com sucesso!")
      } else {
        toast.error("Erro ao remover setor")
      }
    } catch (error) {
      console.error("Erro ao remover setor:", error)
      toast.error("Erro ao remover setor")
    }
  }

  const handleSavePrinter = async (printerData: Partial<PrinterConfig>) => {
    try {
      const method = selectedPrinter ? "PUT" : "POST"
      const response = await fetch("/api/printers", {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(selectedPrinter ? { id: selectedPrinter.id, ...printerData } : printerData),
      })

      if (response.ok) {
        toast.success(selectedPrinter ? "Impressora atualizada!" : "Impressora adicionada!")
        setIsPrinterDialogOpen(false)
        setSelectedPrinter(null)
        loadPrinters()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar impressora:", error)
      toast.error("Erro ao salvar impressora")
    }
  }

  const handleDeletePrinter = async (printerId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta impressora?")) return

    try {
      const response = await fetch(`/api/printers?id=${printerId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        toast.success("Impressora removida!")
        loadPrinters()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao excluir impressora:", error)
      toast.error("Erro ao excluir impressora")
    }
  }

  const updateSectorPrinter = (sectorId: string, printerId: string) => {
    setPrinterSectors((prev) =>
      prev.map((sector) =>
        sector.id === sectorId ? { ...sector, printer_id: printerId === "none" ? undefined : printerId } : sector,
      ),
    )
    toast.success("Configuração do setor atualizada!")
  }

  const loadPrintLocations = async () => {
    try {
      const response = await fetch("/api/print-locations", {
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPrintLocationsList(Array.isArray(data) ? data : [])
      } else {
        console.error("Erro ao carregar setores de impressão:", response.status)
        setPrintLocationsList([])
      }
    } catch (error) {
      console.error("Erro ao carregar setores:", error)
      setPrintLocationsList([])
    }
  }

  const handleSavePrintLocation = async (printLocationData: Partial<PrintLocation>) => {
    setIsPrintLocationSaving(true)
    try {
      const method = selectedPrintLocation ? "PUT" : "POST"
      const response = await fetch("/api/print-locations", {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify(
          selectedPrintLocation ? { id: selectedPrintLocation.id, ...printLocationData } : printLocationData,
        ),
      })

      if (response.ok) {
        toast.success(selectedPrintLocation ? "Setor atualizado!" : "Setor adicionado!")
        setIsPrintLocationDialogOpen(false)
        setSelectedPrintLocation(null)
        loadPrintLocations()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar setor:", error)
      toast.error("Erro ao salvar setor")
    } finally {
      setIsPrintLocationSaving(false)
    }
  }

  const handleDeletePrintLocation = async (printLocationId: string) => {
    if (!confirm("Tem certeza que deseja excluir este setor de impressão?")) return

    try {
      const response = await fetch(`/api/print-locations?id=${printLocationId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": user?.email || "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        toast.success("Setor removido!")
        loadPrintLocations()
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao excluir setor:", error)
      toast.error("Erro ao excluir setor")
    }
  }

  useEffect(() => {
    loadEmpresaData()
    loadPrinters()
    loadPrinterSectors()
    checkQzTrayConnection()
    loadPrintLocations()
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="estabelecimento" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Estabelecimento</span>
          </TabsTrigger>
          <TabsTrigger value="impressoras" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Impressoras</span>
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

        <TabsContent value="impressoras" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Configuração de Impressoras</h2>
              <p className="text-sm text-muted-foreground">Configure as impressoras por setor de impressão</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={syncWithQzTray}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className="w-4 h-4" />
                Sincronizar QZ Tray
              </Button>
              <Dialog open={isPrintLocationDialogOpen} onOpenChange={setIsPrintLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setSelectedPrintLocation(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Setor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedPrintLocation ? "Editar Setor" : "Novo Setor de Impressão"}</DialogTitle>
                  </DialogHeader>
                  <PrintLocationDialog
                    printLocation={selectedPrintLocation}
                    onSave={handleSavePrintLocation}
                    onClose={() => setIsPrintLocationDialogOpen(false)}
                    isLoading={isPrintLocationSaving}
                    availablePrinters={availablePrinters}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* QZ Tray Status */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div className={`w-2 h-2 rounded-full ${qzTrayConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm">QZ Tray: {qzTrayConnected ? "Conectado" : "Desconectado"}</span>
            {availablePrinters.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({availablePrinters.length} impressoras disponíveis)
              </span>
            )}
          </div>

          {/* Print Locations List */}
          <div className="grid gap-4">
            {printLocationsList.map((location) => (
              <div key={location.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{location.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Impressora: {location.printer_name || "Não configurada"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPrintLocation(location)
                        setIsPrintLocationDialogOpen(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeletePrintLocation(location.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {printLocationsList.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Printer className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum setor de impressão configurado</p>
              <p className="text-sm">Clique em "Novo Setor" para começar</p>
            </div>
          )}
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
                      <AlertTriangle className="w-4 h-4 mr-2" />
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

function PrinterDialog({
  printer,
  onSave,
  onClose,
}: {
  printer: PrinterConfig | null
  onSave: (data: Partial<PrinterConfig>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: printer?.name || "",
    type: printer?.type || ("USB" as const),
    model: printer?.model || "",
    port: printer?.port || "",
    ip: printer?.ip || "",
    sector: printer?.sector || "Cozinha",
  })

  const sectors = ["Caixa", "Cozinha", "Cozinha 2", "Bar/Copa", "Bebidas"]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.model.trim()) return
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="printer-name">Nome da Impressora</Label>
        <Input
          id="printer-name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Impressora Cozinha"
          required
        />
      </div>

      <div>
        <Label htmlFor="printer-type">Tipo de Conexão</Label>
        <Select
          value={formData.type}
          onValueChange={(value: "USB" | "Rede" | "Bluetooth") => setFormData((prev) => ({ ...prev, type: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USB">USB</SelectItem>
            <SelectItem value="Rede">Rede (IP)</SelectItem>
            <SelectItem value="Bluetooth">Bluetooth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="printer-model">Modelo</Label>
        <Input
          id="printer-model"
          value={formData.model}
          onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
          placeholder="Ex: TM-T20, MP-100S TH"
          required
        />
      </div>

      {formData.type === "USB" ? (
        <div>
          <Label htmlFor="printer-port">Porta USB</Label>
          <Input
            id="printer-port"
            value={formData.port}
            onChange={(e) => setFormData((prev) => ({ ...prev, port: e.target.value }))}
            placeholder="Ex: USB001, COM1"
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="printer-ip">Endereço IP</Label>
          <Input
            id="printer-ip"
            value={formData.ip}
            onChange={(e) => setFormData((prev) => ({ ...prev, ip: e.target.value }))}
            placeholder="Ex: 192.168.1.100"
          />
        </div>
      )}

      <div>
        <Label htmlFor="printer-sector">Setor</Label>
        <Select value={formData.sector} onValueChange={(value) => setFormData((prev) => ({ ...prev, sector: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  )
}

function PrintLocationDialog({
  printLocation,
  onSave,
  onClose,
  isLoading,
  availablePrinters,
}: {
  printLocation: PrintLocation | null
  onSave: (data: Partial<PrintLocation>) => void
  onClose: () => void
  isLoading: boolean
  availablePrinters: { name: string; status: string }[]
}) {
  const [formData, setFormData] = useState({
    name: printLocation?.name || "",
    printer_name: printLocation?.printer_name || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    const dataToSave = {
      ...formData,
      printer_name: formData.printer_name === "none" ? "" : formData.printer_name,
    }
    onSave(dataToSave)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="location-name">Nome do Setor</Label>
        <Input
          id="location-name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Cozinha, Caixa, Bar"
          required
        />
      </div>

      <div>
        <Label htmlFor="printer-select">Impressora</Label>
        <Select
          value={formData.printer_name || "none"}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, printer_name: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma impressora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma impressora</SelectItem>
            {availablePrinters.map((printer) => (
              <SelectItem key={printer.name} value={printer.name}>
                {printer.name} ({printer.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          {isLoading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}

export { SettingsScreen }
export default SettingsScreen
