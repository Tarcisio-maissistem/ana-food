"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Printer, Settings, Zap, Wifi, Usb } from "lucide-react"

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

const sectors = ["Cozinha", "Caixa", "Bar", "Bebidas", "Sobremesas"]

export function PrintersScreen() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterConfig | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadPrinters()
  }, [])

  const loadPrinters = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/printers")
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setPrinters(data)
        } else if (data && Array.isArray(data.data)) {
          // Fallback para formato antigo com propriedade data
          setPrinters(data.data)
        } else {
          console.warn("Dados recebidos não são array:", data)
          setPrinters([])
        }
      } else {
        console.error("Erro na resposta da API:", response.status)
        setPrinters([])
        // @ts-ignore
        window.showToast?.({
          type: "error",
          title: "Erro",
          description: "Erro ao carregar impressoras",
        })
      }
    } catch (error) {
      console.error("Erro ao carregar impressoras:", error)
      setPrinters([])
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao conectar com o servidor",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Conectada":
        return "bg-green-500"
      case "Desconectada":
        return "bg-gray-500"
      case "Erro":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "USB":
        return <Usb className="w-4 h-4" />
      case "Rede":
        return <Wifi className="w-4 h-4" />
      case "Bluetooth":
        return <Wifi className="w-4 h-4" />
      default:
        return <Printer className="w-4 h-4" />
    }
  }

  const testPrinter = (printer: PrinterConfig) => {
    console.log(`🖨️ Testando impressora: ${printer.name}`)
    // @ts-ignore
    window.showToast?.({
      type: "info",
      title: "Teste de Impressão",
      description: `Teste enviado para ${printer.name}`,
    })
  }

  const syncPrinters = () => {
    console.log("🔄 Sincronizando impressoras...")
    loadPrinters()
    // @ts-ignore
    window.showToast?.({
      type: "success",
      title: "Sincronização",
      description: "Impressoras sincronizadas com sucesso!",
    })
  }

  const handleSavePrinter = async (printerData: Partial<PrinterConfig>) => {
    try {
      if (selectedPrinter) {
        // Editar impressora existente
        const response = await fetch("/api/printers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedPrinter.id, ...printerData }),
        })

        if (response.ok) {
          const updatedPrinter = await response.json()
          setPrinters((prev) => prev.map((p) => (p.id === selectedPrinter.id ? updatedPrinter : p)))
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Impressora atualizada com sucesso!",
          })
        } else {
          throw new Error("Erro ao atualizar impressora")
        }
      } else {
        // Adicionar nova impressora
        const response = await fetch("/api/printers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(printerData),
        })

        if (response.ok) {
          const newPrinter = await response.json()
          setPrinters((prev) => [...prev, newPrinter])
          // @ts-ignore
          window.showToast?.({
            type: "success",
            title: "Sucesso",
            description: "Impressora adicionada com sucesso!",
          })
        } else {
          throw new Error("Erro ao criar impressora")
        }
      }

      setIsDialogOpen(false)
      setSelectedPrinter(null)
    } catch (error) {
      console.error("Erro ao salvar impressora:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao salvar impressora",
      })
    }
  }

  const handleDeletePrinter = async (printerId: string) => {
    try {
      const response = await fetch(`/api/printers?id=${printerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setPrinters((prev) => prev.filter((p) => p.id !== printerId))
        // @ts-ignore
        window.showToast?.({
          type: "success",
          title: "Sucesso",
          description: "Impressora removida com sucesso!",
        })
      } else {
        throw new Error("Erro ao deletar impressora")
      }
    } catch (error) {
      console.error("Erro ao deletar impressora:", error)
      // @ts-ignore
      window.showToast?.({
        type: "error",
        title: "Erro",
        description: "Erro ao remover impressora",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Impressoras</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncPrinters}>
            <Zap className="w-4 h-4 mr-2" />
            Sincronizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedPrinter(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Impressora
              </Button>
            </DialogTrigger>
            <PrinterDialog
              printer={selectedPrinter}
              onSave={handleSavePrinter}
              onClose={() => setIsDialogOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      {/* Lista de Impressoras */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">Tipo</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Setor</th>
                <th className="text-left p-4 font-semibold">Configuração</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(printers) &&
                printers.map((printer) => (
                  <tr key={printer.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Printer className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{printer.name}</div>
                          <div className="text-sm text-gray-600">{printer.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(printer.type)}
                        <span>{printer.type}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${getStatusColor(printer.status)} text-white`}>{printer.status}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{printer.sector}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600">
                        {printer.type === "USB" ? `Porta: ${printer.port}` : `IP: ${printer.ip}`}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPrinter(printer)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testPrinter(printer)}
                          disabled={printer.status !== "Conectada"}
                        >
                          Testar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePrinter(printer.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {printers.length === 0 && (
          <div className="text-center py-12">
            <Printer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma impressora configurada</p>
          </div>
        )}
      </div>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{printer ? "Configurar Impressora" : "Adicionar Impressora"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Impressora Cozinha"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Tipo</label>
          <Select
            value={formData.type}
            onValueChange={(value: "USB" | "Rede" | "Bluetooth") => setFormData((prev) => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USB">USB</SelectItem>
              <SelectItem value="Rede">Rede</SelectItem>
              <SelectItem value="Bluetooth">Bluetooth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Modelo</label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            placeholder="Ex: TM-T20"
            required
          />
        </div>

        {formData.type === "USB" ? (
          <div>
            <label className="text-sm font-medium">Porta</label>
            <Input
              value={formData.port}
              onChange={(e) => setFormData((prev) => ({ ...prev, port: e.target.value }))}
              placeholder="Ex: USB001"
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium">Endereço IP</label>
            <Input
              value={formData.ip}
              onChange={(e) => setFormData((prev) => ({ ...prev, ip: e.target.value }))}
              placeholder="Ex: 192.168.1.100"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Setor</label>
          <Select
            value={formData.sector}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, sector: value }))}
          >
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
    </DialogContent>
  )
}
