"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AuditLog {
  id: string
  user_id: string
  company_id: string
  table_name: string
  record_id?: string
  action_type: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export default function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    search: "",
    action_type: "all", // Updated default value
    table_name: "all", // Updated default value
    date_from: "",
    date_to: "",
  })
  const { toast } = useToast()

  const limit = 20

  useEffect(() => {
    loadAuditLogs()
  }, [page, filters])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== "")),
      })

      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      if (!response.ok) throw new Error("Erro ao carregar logs")

      const data = await response.json()
      setLogs(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      console.error("Erro ao carregar logs:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar logs de auditoria",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800"
      case "UPDATE":
        return "bg-blue-100 text-blue-800"
      case "DELETE":
        return "bg-red-100 text-red-800"
      case "LOGIN":
        return "bg-purple-100 text-purple-800"
      case "LOGOUT":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        export: "true",
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== "")),
      })

      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      if (!response.ok) throw new Error("Erro ao exportar logs")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Sucesso",
        description: "Logs exportados com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar logs",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
        <Button onClick={exportLogs} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.action_type}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, action_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="CREATE">Criar</SelectItem>
                <SelectItem value="UPDATE">Atualizar</SelectItem>
                <SelectItem value="DELETE">Excluir</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.table_name}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, table_name: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="products">Produtos</SelectItem>
                <SelectItem value="categories">Categorias</SelectItem>
                <SelectItem value="customers">Clientes</SelectItem>
                <SelectItem value="orders">Pedidos</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              placeholder="Data inicial"
            />

            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              placeholder="Data final"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-medium">Data/Hora</th>
                  <th className="p-4 text-left font-medium">Ação</th>
                  <th className="p-4 text-left font-medium">Tabela</th>
                  <th className="p-4 text-left font-medium">Registro</th>
                  <th className="p-4 text-left font-medium">IP</th>
                  <th className="p-4 text-left font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Carregando logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-4">
                        <Badge className={getActionBadgeColor(log.action_type)}>{log.action_type}</Badge>
                      </td>
                      <td className="p-4 font-medium">{log.table_name}</td>
                      <td className="p-4 text-sm text-gray-600">{log.record_id?.slice(0, 8)}...</td>
                      <td className="p-4 text-sm text-gray-600">{log.ip_address}</td>
                      <td className="p-4">
                        <Button variant="outline" size="sm">
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} logs
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <span className="px-3 py-1 bg-gray-100 rounded">
              {page} de {Math.ceil(total / limit)}
            </span>
            <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
