"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Save,
  RefreshCw,
  Upload,
  ImageIcon,
  X,
  Lock,
  Clock,
  Truck,
  MapPin,
  Camera,
  QrCode,
} from "lucide-react"
import { formatCNPJ, formatTelefone, type EmpresaData } from "@/utils/cache-empresa"
import { toast } from "@/components/ui/use-toast"
import { PaymentMethodsScreen } from "@/components/payment-methods-screen"

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
      segunda: { abertura: "08:00", fechamento: "22:00", fechado: false },
      terca: { abertura: "08:00", fechamento: "22:00", fechado: false },
      quarta: { abertura: "08:00", fechamento: "22:00", fechado: false },
      quinta: { abertura: "08:00", fechamento: "22:00", fechado: false },
      sexta: { abertura: "08:00", fechamento: "22:00", fechado: false },
      sabado: { abertura: "08:00", fechamento: "22:00", fechado: true },
      domingo: { abertura: "08:00", fechamento: "22:00", fechado: true },
    },

    // Operação
    tempoMedioPreparo: "30",
    retiradaLocal: true,
    entregaPropria: true,
    entregaMotoboy: false,

    // Cardápio digital
    linkCardapio: "",
  })

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
    console.log("[v0] EstabelecimentoScreen: Componente montado, iniciando carregamento")
    loadEmpresaData()
  }, [])

  useEffect(() => {
    if (formData.cnpj && formData.cnpj.length >= 14) {
      loadLogo()
    }
  }, [formData.cnpj])

  const loadEmpresaData = async () => {
    setLoading(true)
    try {
      console.log("[v0] EstabelecimentoScreen: Iniciando carregamento dos dados da empresa...")
      const response = await fetch("/api/companies", {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })

      console.log("[v0] EstabelecimentoScreen: Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] EstabelecimentoScreen: Dados recebidos da API:", data)

        if (data && (data.name || data.cnpj)) {
          console.log("[v0] EstabelecimentoScreen: Dados válidos encontrados, atualizando formulário")
          setEmpresa(data)
          setFormData({
            nomeFantasia: data.name || "",
            razaoSocial: data.razao_social || data.name || "",
            cnpj: data.cnpj || "",
            cpf: data.cpf || "",
            telefone: data.phone || "",
            whatsapp: data.whatsapp || data.phone || "",
            email: data.email || "",
            site: data.site || "",
            instagram: data.instagram || "",
            facebook: data.facebook || "",

            rua: data.rua || (data.address ? data.address.split(",")[0] : ""),
            numero: data.numero || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            cidade: data.cidade || "",
            uf: data.uf || "",
            cep: data.cep || "",
            locationLink: data.location_link || "",

            horarios: data.horarios || {
              segunda: { abertura: "08:00", fechamento: "22:00", fechado: false },
              terca: { abertura: "08:00", fechamento: "22:00", fechado: false },
              quarta: { abertura: "08:00", fechamento: "22:00", fechado: false },
              quinta: { abertura: "08:00", fechamento: "22:00", fechado: false },
              sexta: { abertura: "08:00", fechamento: "22:00", fechado: false },
              sabado: { abertura: "08:00", fechamento: "22:00", fechado: true },
              domingo: { abertura: "08:00", fechamento: "22:00", fechado: true },
            },

            tempoMedioPreparo: data.tempo_medio_preparo || data.delivery_time?.replace(/\D/g, "") || "30",
            retiradaLocal: data.retirada_local !== false,
            entregaPropria: data.entrega_propria !== false,
            entregaMotoboy: data.entrega_motoboy || false,

            linkCardapio: data.link_cardapio || "",
          })
          console.log("[v0] EstabelecimentoScreen: FormData atualizado com sucesso")
        } else {
          console.log("[v0] EstabelecimentoScreen: Nenhum dado válido encontrado, usando dados padrão")
        }
      } else {
        console.log("[v0] EstabelecimentoScreen: Erro na resposta da API:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("[v0] EstabelecimentoScreen: Erro ao carregar dados da empresa:", error)
      toast({
        type: "error",
        title: "Erro",
        description: "Erro ao carregar dados da empresa",
      })
    } finally {
      setLoading(false)
      console.log("[v0] EstabelecimentoScreen: Carregamento finalizado")
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
          entrega_motoboy: formData.entregaMotoboy,

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="funcionamento">Funcionamento</TabsTrigger>
          <TabsTrigger value="operacao">Operação</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="midia">Mídia</TabsTrigger>
        </TabsList>

        <TabsContent value="basico" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo Section */}
            <div className="lg:col-span-1">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">Logotipo</CardTitle>
                  <CardDescription>Logo da empresa (máx. 5MB)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logoUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <img
                          src={logoUrl || "/placeholder.svg"}
                          alt="Logo da empresa"
                          className="max-h-36 max-w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo || !formData.cnpj || formData.cnpj.length < 14}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Alterar Logo
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleRemoveLogo}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 text-center">
                          Clique para adicionar
                          <br />o logo da empresa
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo || !formData.cnpj || formData.cnpj.length < 14}
                        className="w-full"
                      >
                        {uploadingLogo ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Adicionar Logo
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Basic Information */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  <CardDescription>Dados principais da empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
                      <Input
                        id="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={(e) => setFormData((prev) => ({ ...prev, nomeFantasia: e.target.value }))}
                        placeholder="Nome do restaurante"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="razaoSocial">Razão Social</Label>
                      <Input
                        id="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={(e) => setFormData((prev) => ({ ...prev, razaoSocial: e.target.value }))}
                        placeholder="Razão social da empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj" className="flex items-center gap-2">
                        CNPJ <Lock className="h-3 w-3 text-gray-400" />
                      </Label>
                      <Input
                        id="cnpj"
                        value={formatCNPJ(formData.cnpj)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: e.target.value.replace(/\D/g, "") }))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        readOnly
                        className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF (se pessoa física)</Label>
                      <Input
                        id="cpf"
                        value={formatCPF(formData.cpf)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cpf: e.target.value.replace(/\D/g, "") }))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input
                        id="telefone"
                        value={formatTelefone(formData.telefone)}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, telefone: e.target.value.replace(/\D/g, "") }))
                        }
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp Oficial</Label>
                      <Input
                        id="whatsapp"
                        value={formatTelefone(formData.whatsapp)}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, "") }))
                        }
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="contato@restaurante.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="site">Site/URL</Label>
                      <Input
                        id="site"
                        value={formData.site}
                        onChange={(e) => setFormData((prev) => ({ ...prev, site: e.target.value }))}
                        placeholder="https://www.restaurante.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={formData.instagram}
                        onChange={(e) => setFormData((prev) => ({ ...prev, instagram: e.target.value }))}
                        placeholder="@restaurante"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        value={formData.facebook}
                        onChange={(e) => setFormData((prev) => ({ ...prev, facebook: e.target.value }))}
                        placeholder="facebook.com/restaurante"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço e Localização
              </CardTitle>
              <CardDescription>Localização do estabelecimento para cálculo de entrega</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="rua">Rua/Avenida *</Label>
                  <Input
                    id="rua"
                    value={formData.rua}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rua: e.target.value }))}
                    placeholder="Nome da rua ou avenida"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData((prev) => ({ ...prev, numero: e.target.value }))}
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, complemento: e.target.value }))}
                    placeholder="Apto, sala, loja..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bairro: e.target.value }))}
                    placeholder="Nome do bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Nome da cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf">UF *</Label>
                  <Input
                    id="uf"
                    value={formData.uf}
                    onChange={(e) => setFormData((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cep: e.target.value.replace(/\D/g, "") }))}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="locationLink" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Link de Localização (Google Maps)
                  </Label>
                  <Input
                    id="locationLink"
                    value={formData.locationLink}
                    onChange={(e) => setFormData((prev) => ({ ...prev, locationLink: e.target.value }))}
                    placeholder="https://maps.google.com/..."
                  />
                  <p className="text-xs text-gray-500">
                    Cole o link do Google Maps para cálculo automático de taxa de entrega por distância
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funcionamento" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="operacao" className="space-y-6">
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
                  <Label htmlFor="entregaMotoboy">Entrega por Motoboy Parceiro</Label>
                  <Switch
                    id="entregaMotoboy"
                    checked={formData.entregaMotoboy}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, entregaMotoboy: checked }))}
                  />
                </div>
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

        <TabsContent value="pagamentos" className="space-y-6">
          <PaymentMethodsScreen user={user} />
        </TabsContent>

        <TabsContent value="midia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos do Estabelecimento
              </CardTitle>
              <CardDescription>Adicione fotos da fachada, ambiente e produtos (máx. 5 fotos)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo || "/placeholder.svg"}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {photos.length < 5 && (
                  <div
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => photosInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 text-center">Adicionar Foto</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => photosInputRef.current?.click()}
                disabled={uploadingPhotos || photos.length >= 5}
                className="w-full"
              >
                {uploadingPhotos ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Fotos ({photos.length}/5)
                  </>
                )}
              </Button>

              <input
                ref={photosInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handlePhotosUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
