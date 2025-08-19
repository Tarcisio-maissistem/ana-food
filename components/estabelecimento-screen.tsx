"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Save, RefreshCw, Upload, ImageIcon, X, Lock } from "lucide-react"
import { formatCNPJ, formatTelefone, type EmpresaData } from "@/utils/cache-empresa"

export function EstabelecimentoScreen() {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const BUCKET_NAME = "avatars"

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    endereco: "",
    email: "",
  })

  useEffect(() => {
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
      console.log("Carregando dados da empresa...")
      const response = await fetch("/api/companies", {
        headers: {
          "X-User-Email": "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Dados recebidos:", data)

        if (data && (data.name || data.cnpj)) {
          setEmpresa(data)
          setFormData({
            nome: data.name || "",
            cnpj: data.cnpj || "",
            telefone: data.phone || "",
            endereco: data.address || "",
            email: data.email || "",
          })
          console.log("FormData atualizado:", {
            nome: data.name || "",
            cnpj: data.cnpj || "",
            telefone: data.phone || "",
            endereco: data.address || "",
            email: data.email || "",
          })
        } else {
          console.log("Nenhum dado encontrado, usando dados vazios")
          setFormData({
            nome: "",
            cnpj: "",
            telefone: "",
            endereco: "",
            email: "",
          })
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao carregar dados da empresa",
      })
    } finally {
      setLoading(false)
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
          name: formData.nome,
          cnpj: formData.cnpj,
          phone: formData.telefone,
          address: formData.endereco,
          email: formData.email,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setEmpresa(updated)
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: "Dados da empresa salvos com sucesso!",
        })
      } else {
        throw new Error("Erro na resposta da API")
      }
    } catch (error) {
      console.error("Erro ao salvar dados da empresa:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar dados da empresa",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estabelecimento</h2>
          <p className="text-gray-600">Configure os dados da sua empresa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo Section - Takes 1 column */}
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

              {(!formData.cnpj || formData.cnpj.length < 14) && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <p className="font-medium">CNPJ necessário</p>
                  <p>Configure o CNPJ primeiro para adicionar o logo</p>
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

        {/* Company Information - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
              <CardDescription>Dados básicos do estabelecimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium">
                    Nome da Empresa
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do restaurante"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-sm font-medium flex items-center gap-2">
                    CNPJ
                    <Lock className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Input
                    id="cnpj"
                    value={formatCNPJ(formData.cnpj)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: e.target.value.replace(/\D/g, "") }))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    readOnly
                    className="h-11 bg-gray-50 text-gray-600 cursor-not-allowed"
                    title="CNPJ não pode ser alterado - usado como identificador único"
                  />
                  <p className="text-xs text-gray-500">Campo não editável - usado como identificador</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium">
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    value={formatTelefone(formData.telefone)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, telefone: e.target.value.replace(/\D/g, "") }))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@restaurante.com"
                    className="h-11"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="endereco" className="text-sm font-medium">
                    Endereço Completo
                  </Label>
                  <Textarea
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="md:col-span-2 pt-4">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
