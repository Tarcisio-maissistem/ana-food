"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Save,
  RefreshCw,
  Upload,
  ImageIcon,
  Clock,
  Truck,
  MapPin,
  QrCode,
  Plus,
  Edit,
  Trash2,
  Building,
} from "lucide-react"
import type { EmpresaData } from "@/utils/cache-empresa"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

const formatCPF = (cpf: string) => {
  if (!cpf) return ""
  const cleaned = cpf.replace(/\D/g, "")
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/)
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`
  }
  return cleaned
}

const validateMenuUrl = async (url: string): Promise<{ isValid: boolean; suggestion?: string }> => {
  if (!url.trim()) return { isValid: true }

  try {
    const response = await fetch("/api/validate-menu-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": "tarcisiorp16@gmail.com" || "",
      },
      body: JSON.stringify({ url: url.trim() }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error("[v0] EstabelecimentoScreen: Erro ao validar URL:", error)
    return { isValid: true }
  }
}

export function EstabelecimentoScreen() {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)
  const user = { email: "tarcisiorp16@gmail.com" }

  const BUCKET_NAME = "avatars"

  const [bairros, setBairros] = useState<any[]>([])
  const [showBairroForm, setShowBairroForm] = useState(false)
  const [editingBairro, setEditingBairro] = useState<any>(null)
  const [bairroForm, setBairroForm] = useState({
    zone: "",
    price: "",
    active: true,
  })

  const [formData, setFormData] = useState({
    // Informações básicas
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    cpf: "",
    telefone: "",
    whatsapp: "",
    email: "",
    site: "",
    instagram: "",
    facebook: "",

    // Endereço
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    locationLink: "",

    // Funcionamento
    horarios: {
      segunda: { abertura: "10:00", fechamento: "14:00", fechado: false },
      terca: { abertura: "10:00", fechamento: "14:00", fechado: false },
      quarta: { abertura: "10:00", fechamento: "14:00", fechado: false },
      quinta: { abertura: "10:00", fechamento: "14:00", fechado: false },
      sexta: { abertura: "10:00", fechamento: "14:00", fechado: false },
      sabado: { abertura: "10:00", fechamento: "14:00", fechado: false },
      domingo: { abertura: "10:00", fechamento: "14:00", fechado: true },
    },

    // Operação
    tempoMedioPreparo: "30",
    retiradaLocal: true,
    entregaPropria: true,
    entregaMotoboy: false,
    aceiteAutomatico: false,

    // Cardápio digital
    linkCardapio: "",

    name: "",
    phone: "",
    address: "",
    location_link: "",
    notes: "",
    on_off: true,
  })

  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, name: "Dinheiro", type: "com_troco", active: true },
    { id: 2, name: "Cartão de Crédito", type: "sem_troco", active: true },
    { id: 3, name: "Cartão de Débito", type: "sem_troco", active: true },
    { id: 4, name: "PIX", type: "sem_troco", active: true },
  ])
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const handleMenuUrlChange = async (newUrl: string) => {
    setFormData((prev) => ({ ...prev, linkCardapio: newUrl }))

    if (newUrl.trim()) {
      const validation = await validateMenuUrl(newUrl)
      if (!validation.isValid && validation.suggestion) {
        toast({
          title: "URL já existe",
          description: `Esta URL já está em uso. Sugestão: ${validation.suggestion}`,
          variant: "destructive",
        })
      }
    }
  }

  useEffect(() => {
    loadEmpresaData()
    loadPaymentMethods()
    loadBairros()
  }, [])

  useEffect(() => {
    if (formData.cnpj && formData.cnpj.length >= 14) {
      loadLogo()
    }
  }, [formData.cnpj])

  const loadEmpresaData = async () => {
    try {
      console.log("[v0] EstabelecimentoScreen: Iniciando carregamento dos dados da empresa...")
      setLoading(true)

      const response = await fetch("/api/companies", {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      console.log("[v0] EstabelecimentoScreen: Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log(
          "[v0] EstabelecimentoScreen: Dados recebidos da API:",
          JSON.stringify(data).substring(0, 500) + "...",
        )

        if (data && Object.keys(data).length > 0) {
          console.log("[v0] EstabelecimentoScreen: Dados válidos encontrados, atualizando formulário")

          let horariosFormatados = formData.horarios // usar horários padrão como fallback

          if (data.horarios && typeof data.horarios === "object") {
            // Se horarios existe como objeto JSON, usar diretamente
            horariosFormatados = data.horarios
          } else if (data.working_hours && typeof data.working_hours === "string") {
            // Se working_hours existe como string, tentar parsear ou usar padrão
            console.log(
              "[v0] EstabelecimentoScreen: Usando horários padrão pois working_hours é string:",
              data.working_hours,
            )
          }

          setFormData({
            ...formData,
            nomeFantasia: data.name || "",
            razaoSocial: data.legal_name || data.name || "",
            cnpj: data.cnpj || "",
            telefone: data.phone || "",
            email: data.email || "",
            rua: data.address?.split("\n")[0] || data.address || "",
            numero: data.number || "",
            bairro: data.neighborhood || "",
            cidade: data.city || "",
            uf: data.state || "",
            cep: data.zip_code || "",
            locationLink: data.location_link || "",
            horarios: horariosFormatados, // Usando horários formatados
            tempoMedioPreparo: data.delivery_time?.replace(" min", "") || "30",
            retiradaLocal: data.retiradaLocal,
            entregaPropria: data.entregaPropria,
            entregaMotoboy: false,
            aceiteAutomatico: data.aceite_automatico || false,
            linkCardapio: data.linkCardapio,
            name: data.name || "",
            phone: data.phone || "",
            address: data.address || "",
            location_link: data.location_link || "",
            notes: data.notes || "",
            on_off: data.on_off || true,
          })

          console.log("[v0] EstabelecimentoScreen: FormData atualizado com sucesso")
        }
      }
    } catch (error) {
      console.error("[v0] EstabelecimentoScreen: Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da empresa",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.log("[v0] EstabelecimentoScreen: Carregamento finalizado")
    }
  }

  const loadBairros = async () => {
    try {
      const response = await fetch("/api/delivery-zones", {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setBairros(data)
      }
    } catch (error) {
      console.error("Erro ao carregar bairros:", error)
    }
  }

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch("/api/payment-methods", {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data)
      }
    } catch (error) {
      console.error("Erro ao carregar formas de pagamento:", error)
    }
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    setFormData((prev) => ({ ...prev, cnpj: value }))
  }

  const handleSaveBairro = async () => {
    try {
      const method = editingBairro ? "PUT" : "POST"
      const url = editingBairro ? `/api/delivery-zones/${editingBairro.id}` : "/api/delivery-zones"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({
          zone: bairroForm.zone,
          price: Number.parseFloat(bairroForm.price),
          active: bairroForm.active,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: editingBairro ? "Bairro atualizado com sucesso!" : "Bairro cadastrado com sucesso!",
        })
        setShowBairroForm(false)
        setEditingBairro(null)
        setBairroForm({ zone: "", price: "", active: true })
        loadBairros()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar bairro",
        variant: "destructive",
      })
    }
  }

  const handleEditBairro = (bairro: any) => {
    setEditingBairro(bairro)
    setBairroForm({
      zone: bairro.zone,
      price: bairro.price.toString(),
      active: bairro.active,
    })
    setShowBairroForm(true)
  }

  const handleDeleteBairro = async (id: string) => {
    try {
      const response = await fetch(`/api/delivery-zones/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Bairro excluído com sucesso!",
        })
        loadBairros()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir bairro",
        variant: "destructive",
      })
    }
  }

  const loadLogo = async () => {
    if (!formData.cnpj || formData.cnpj.length < 14) return

    try {
      const logoKey = `logo_${formData.cnpj}`
      const savedLogo = localStorage.getItem(logoKey)
      if (savedLogo) {
        setLogoUrl(savedLogo)
      }
    } catch (error) {
      console.error("Erro ao carregar logo:", error)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !formData.cnpj || formData.cnpj.length < 14) return

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      alert("Formato de arquivo não suportado. Use JPG, PNG ou WebP.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.")
      return
    }

    setUploadingLogo(true)
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target?.result as string
        const logoKey = `logo_${formData.cnpj}`
        localStorage.setItem(logoKey, base64String)
        setLogoUrl(base64String)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        alert("Logo enviado com sucesso!")
        setUploadingLogo(false)
      }
      reader.onerror = () => {
        alert("Erro ao processar a imagem")
        setUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error)
      alert(`Erro ao fazer upload do logo: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!formData.cnpj || !logoUrl) return

    try {
      const logoKey = `logo_${formData.cnpj}`
      localStorage.removeItem(logoKey)
      setLogoUrl(null)
      alert("Logo removido com sucesso!")
    } catch (error) {
      console.error("Erro ao remover logo:", error)
      alert(`Erro ao remover logo: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  const handlePhotosUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingPhotos(true)
    try {
      const newPhotos: string[] = []

      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i]

        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
          continue
        }

        if (file.size > 5 * 1024 * 1024) {
          continue
        }

        const reader = new FileReader()
        await new Promise((resolve) => {
          reader.onload = (e) => {
            const base64String = e.target?.result as string
            newPhotos.push(base64String)
            resolve(null)
          }
          reader.readAsDataURL(file)
        })
      }

      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5))
      if (photosInputRef.current) {
        photosInputRef.current.value = ""
      }

      toast({
        type: "success",
        title: "Sucesso",
        description: `${newPhotos.length} foto(s) adicionada(s)!`,
      })
    } catch (error) {
      console.error("Erro ao fazer upload das fotos:", error)
      toast({
        type: "error",
        title: "Erro",
        description: "Erro ao fazer upload das fotos",
      })
    } finally {
      setUploadingPhotos(false)
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/companies", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({
          name: formData.nomeFantasia,
          razao_social: formData.razaoSocial,
          cnpj: formData.cnpj,
          cpf: formData.cpf,
          phone: formData.telefone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          site: formData.site,
          instagram: formData.instagram,
          facebook: formData.facebook,

          rua: formData.rua,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          uf: formData.uf,
          cep: formData.cep,
          location_link: formData.locationLink,

          horarios: formData.horarios,
          tempo_medio_preparo: formData.tempoMedioPreparo,
          retirada_local: formData.retiradaLocal,
          entrega_propria: formData.entregaPropria,
          aceite_automatico: formData.aceiteAutomatico,
          link_cardapio: formData.linkCardapio,
          logo_url: logoUrl,
          photos: photos,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setEmpresa(updated)
        toast({
          type: "success",
          title: "Sucesso",
          description: "Dados da empresa salvos com sucesso!",
        })
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar dados da empresa:", error)
      toast({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar dados da empresa",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddPayment = () => {
    setEditingPayment({ name: "", type: "sem_troco", active: true })
    setShowPaymentDialog(true)
  }

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment)
    setShowPaymentDialog(true)
  }

  const handleDeletePayment = (id: number) => {
    setPaymentMethods((prev) => prev.filter((p) => p.id !== id))
    toast({
      title: "Sucesso",
      description: "Forma de pagamento removida!",
    })
  }

  const handleSavePayment = () => {
    if (!editingPayment?.name) return

    if (editingPayment.id) {
      // Edit existing
      setPaymentMethods((prev) => prev.map((p) => (p.id === editingPayment.id ? editingPayment : p)))
    } else {
      // Add new
      const newId = Math.max(...paymentMethods.map((p) => p.id), 0) + 1
      setPaymentMethods((prev) => [...prev, { ...editingPayment, id: newId }])
    }

    setShowPaymentDialog(false)
    setEditingPayment(null)
    toast({
      title: "Sucesso",
      description: "Forma de pagamento salva!",
    })
  }

  const togglePaymentActive = (id: number) => {
    setPaymentMethods((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
  }

  if (loading) {
    console.log("[v0] EstabelecimentoScreen: Renderizando estado de loading")
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const diasSemana = [
    { key: "segunda", label: "Segunda-feira" },
    { key: "terca", label: "Terça-feira" },
    { key: "quarta", label: "Quarta-feira" },
    { key: "quinta", label: "Quinta-feira" },
    { key: "sexta", label: "Sexta-feira" },
    { key: "sabado", label: "Sábado" },
    { key: "domingo", label: "Domingo" },
  ]

  console.log(
    "[v0] EstabelecimentoScreen: Renderizando formulário com dados:",
    formData.nomeFantasia ? "COM DADOS" : "SEM DADOS",
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estabelecimento</h2>
          <p className="text-gray-600">Configure os dados completos da sua empresa</p>
        </div>
      </div>

      <Tabs defaultValue="basico" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="bairros">Bairros de Entrega</TabsTrigger>
        </TabsList>

        <TabsContent value="basico" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo Section - Primeira coluna */}
            <div className="space-y-6">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Logo do Estabelecimento
                  </CardTitle>
                  <CardDescription>Faça upload da logo da sua empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Fazer Upload
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horários de Funcionamento
                  </CardTitle>
                  <CardDescription>Configure os horários de abertura e fechamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {diasSemana.map((dia) => {
                      const horarioDia = formData.horarios[dia.key as keyof typeof formData.horarios]
                      if (!horarioDia) return null

                      return (
                        <div key={dia.key} className="flex flex-col gap-2 p-3 border rounded-lg">
                          <Label className="font-medium">{dia.label}</Label>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!horarioDia.fechado}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  horarios: {
                                    ...prev.horarios,
                                    [dia.key]: {
                                      ...prev.horarios[dia.key as keyof typeof prev.horarios],
                                      fechado: !checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <Label className="text-sm">Aberto</Label>
                          </div>

                          {!horarioDia.fechado && (
                            <>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Abertura:</Label>
                                <Input
                                  type="time"
                                  value={horarioDia.abertura}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      horarios: {
                                        ...prev.horarios,
                                        [dia.key]: {
                                          ...prev.horarios[dia.key as keyof typeof prev.horarios],
                                          abertura: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-32"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Fechamento:</Label>
                                <Input
                                  type="time"
                                  value={horarioDia.fechamento}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      horarios: {
                                        ...prev.horarios,
                                        [dia.key]: {
                                          ...prev.horarios[dia.key as keyof typeof prev.horarios],
                                          fechamento: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-32"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informações Básicas - Segunda coluna */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informações Básicas
                  </CardTitle>
                  <CardDescription>Dados principais do estabelecimento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Estabelecimento</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={handleCnpjChange}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="contato@empresa.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço Completo</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="Rua, número, bairro, cidade - UF"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location_link">Link de Localização</Label>
                      <Input
                        id="location_link"
                        value={formData.location_link}
                        onChange={(e) => setFormData((prev) => ({ ...prev, location_link: e.target.value }))}
                        placeholder="Link do Google Maps"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Informações adicionais"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="on_off">Estabelecimento Ativo</Label>
                      <Switch
                        id="on_off"
                        checked={formData.on_off}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, on_off: checked }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tempo de Preparo
                </CardTitle>
                <CardDescription>Configurações de tempo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tempoMedioPreparo">Tempo Médio de Preparo (minutos)</Label>
                  <Input
                    id="tempoMedioPreparo"
                    type="number"
                    value={formData.tempoMedioPreparo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tempoMedioPreparo: e.target.value }))}
                    placeholder="30"
                    min="1"
                    max="180"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Opções de Entrega
                </CardTitle>
                <CardDescription>Como os clientes podem receber os pedidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="retiradaLocal">Retirada no Local</Label>
                  <Switch
                    id="retiradaLocal"
                    checked={formData.retiradaLocal}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, retiradaLocal: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="entregaPropria">Entrega Própria</Label>
                  <Switch
                    id="entregaPropria"
                    checked={formData.entregaPropria}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, entregaPropria: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="aceiteAutomatico">Aceite Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Aceitar pedidos automaticamente sem confirmação manual
                    </p>
                  </div>
                  <Switch
                    id="aceiteAutomatico"
                    checked={formData.aceiteAutomatico}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, aceiteAutomatico: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
                  <CardDescription>Configure as formas de pagamento aceitas</CardDescription>
                </div>
                <Button onClick={handleAddPayment} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.name}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              payment.type === "com_troco" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                            }`}
                          >
                            {payment.type === "com_troco" ? "Com Troco" : "Sem Troco"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch checked={payment.active} onCheckedChange={() => togglePaymentActive(payment.id)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPayment(payment)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Cardápio Digital
                </CardTitle>
                <CardDescription>Link para compartilhamento do cardápio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkCardapio">Link do Cardápio Digital</Label>
                    <Input
                      id="linkCardapio"
                      value={formData.linkCardapio}
                      onChange={(e) => handleMenuUrlChange(e.target.value)}
                      placeholder="Ex: meurestaurante"
                    />
                    <p className="text-sm text-muted-foreground mt-1">URL única para seu cardápio digital</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bairros" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Bairros de Entrega
              </CardTitle>
              <CardDescription>Gerencie os bairros atendidos e valores de entrega</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => setShowBairroForm(true)} className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Bairro
                </Button>

                {showBairroForm && (
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="zone">Nome do Bairro</Label>
                        <Input
                          id="zone"
                          value={bairroForm.zone}
                          onChange={(e) => setBairroForm({ ...bairroForm, zone: e.target.value })}
                          placeholder="Digite o nome do bairro"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Valor da Entrega (R$)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={bairroForm.price}
                          onChange={(e) => setBairroForm({ ...bairroForm, price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={bairroForm.active}
                          onCheckedChange={(checked) => setBairroForm({ ...bairroForm, active: checked })}
                        />
                        <Label htmlFor="active">Ativo</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveBairro}>{editingBairro ? "Atualizar" : "Salvar"}</Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowBairroForm(false)
                            setEditingBairro(null)
                            setBairroForm({ zone: "", price: "", active: true })
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-2">
                  {bairros.map((bairro) => (
                    <div key={bairro.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{bairro.zone}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {Number.parseFloat(bairro.price).toFixed(2)}
                          </p>
                        </div>
                        <Badge variant={bairro.active ? "default" : "secondary"}>
                          {bairro.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditBairro(bairro)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteBairro(bairro.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingPayment?.id ? "Editar" : "Adicionar"} Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentName">Nome</Label>
                <Input
                  id="paymentName"
                  value={editingPayment?.name || ""}
                  onChange={(e) => setEditingPayment((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Cartão de Crédito"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentType">Tipo</Label>
                <Select
                  value={editingPayment?.type || "sem_troco"}
                  onValueChange={(value) => setEditingPayment((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="com_troco">Com Troco</SelectItem>
                    <SelectItem value="sem_troco">Sem Troco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="paymentActive"
                  checked={editingPayment?.active || false}
                  onCheckedChange={(checked) => setEditingPayment((prev) => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="paymentActive">Ativo</Label>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePayment}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium"
        >
          {saving ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Salvando Alterações...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Salvar Dados da Empresa
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
