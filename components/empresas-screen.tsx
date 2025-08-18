"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { supabaseAdmin, type Empresa } from "@/lib/supabase"
import { Search, Building2, Phone, Mail, MapPin, Plus, RefreshCw } from "lucide-react"

export function EmpresasScreen() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchEmpresas = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabaseAdmin.from("empresas").select("*").order("nome", { ascending: true })

      if (error) {
        throw error
      }

      setEmpresas(data || [])
    } catch (err) {
      console.error("Erro ao buscar empresas:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const filteredEmpresas = empresas.filter(
    (empresa) =>
      empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.cnpj.includes(searchTerm) ||
      empresa.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-2 text-lg">Carregando empresas...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Erro ao carregar empresas</span>
            </div>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Button onClick={fetchEmpresas} variant="outline" size="sm" className="mt-4 bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Gerencie as empresas cadastradas no sistema</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, CNPJ ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Total de Empresas</p>
                <p className="text-2xl font-bold">{empresas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Ativas
              </Badge>
              <div>
                <p className="text-sm text-gray-600">Empresas Ativas</p>
                <p className="text-2xl font-bold">{empresas.filter((e) => e.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Inativas
              </Badge>
              <div>
                <p className="text-sm text-gray-600">Empresas Inativas</p>
                <p className="text-2xl font-bold">{empresas.filter((e) => !e.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEmpresas.map((empresa) => (
          <Card key={empresa.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{empresa.nome}</CardTitle>
                <Badge
                  variant={empresa.ativo ? "default" : "secondary"}
                  className={empresa.ativo ? "bg-green-500" : "bg-gray-500"}
                >
                  {empresa.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                <span>CNPJ: {formatCNPJ(empresa.cnpj)}</span>
              </div>

              {empresa.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{empresa.email}</span>
                </div>
              )}

              {empresa.telefone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhone(empresa.telefone)}</span>
                </div>
              )}

              {empresa.endereco && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{empresa.endereco}</span>
                  {empresa.cidade && empresa.estado && (
                    <span>
                      - {empresa.cidade}/{empresa.estado}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-500">
                  Criada em {new Date(empresa.created_at).toLocaleDateString("pt-BR")}
                </span>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmpresas.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Tente ajustar os termos de busca." : "Comece cadastrando sua primeira empresa no sistema."}
            </p>
            {!searchTerm && (
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeira Empresa
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
