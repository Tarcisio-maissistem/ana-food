"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Printer, TestTube, RefreshCw, Wifi, WifiOff } from "lucide-react"
import qzTrayService from "@/lib/qz-tray-service"

interface QZTrayManagerProps {
  companyData?: any
}

export default function QZTrayManager({ companyData }: QZTrayManagerProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [printers, setPrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [printSettings, setPrintSettings] = useState({
    showLogo: true,
    showTitle: true,
    showAddress: true,
    showPhone: true,
  })

  // Load QZ Tray script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.3/qz-tray.js"
    script.async = true
    script.onload = () => {
      console.log("[v0] QZ Tray script carregado")
      checkConnection()
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const checkConnection = async () => {
    try {
      const connected = await qzTrayService.connect()
      setIsConnected(connected)
      if (connected) {
        await loadPrinters()
      }
    } catch (error) {
      console.error("[v0] Erro ao verificar conexão QZ Tray:", error)
      setIsConnected(false)
    }
  }

  const loadPrinters = async () => {
    setLoading(true)
    try {
      const printerList = await qzTrayService.listPrinters()
      setPrinters(printerList)
      console.log("[v0] Impressoras carregadas:", printerList)
    } catch (error) {
      console.error("[v0] Erro ao carregar impressoras:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrinterSelect = (printerName: string) => {
    setSelectedPrinter(printerName)
    qzTrayService.setSelectedPrinter(printerName)
  }

  const handleSettingChange = (setting: string, value: boolean) => {
    const newSettings = { ...printSettings, [setting]: value }
    setPrintSettings(newSettings)
    qzTrayService.updatePrintSettings(newSettings)
  }

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      alert("Selecione uma impressora primeiro!")
      return
    }

    setLoading(true)
    try {
      await qzTrayService.testPrint(companyData)
      alert("Teste de impressão enviado com sucesso!")
    } catch (error) {
      console.error("[v0] Erro no teste de impressão:", error)
      alert("Erro ao enviar teste de impressão: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            Status da Conexão QZ Tray
          </CardTitle>
          <CardDescription>
            {isConnected ? "Conectado e pronto para imprimir" : "Desconectado - Verifique se o QZ Tray está ativo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
            <Button onClick={checkConnection} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Reconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Printer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Seleção de Impressora
          </CardTitle>
          <CardDescription>Escolha a impressora para imprimir os pedidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedPrinter} onValueChange={handlePrinterSelect}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma impressora" />
              </SelectTrigger>
              <SelectContent>
                {printers.map((printer) => (
                  <SelectItem key={printer} value={printer}>
                    {printer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={loadPrinters} disabled={loading || !isConnected} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {selectedPrinter && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                Impressora selecionada: <strong>{selectedPrinter}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Impressão</CardTitle>
          <CardDescription>Personalize o que será impresso nos pedidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-logo"
                checked={printSettings.showLogo}
                onCheckedChange={(checked) => handleSettingChange("showLogo", checked)}
              />
              <Label htmlFor="show-logo">Mostrar Logo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-title"
                checked={printSettings.showTitle}
                onCheckedChange={(checked) => handleSettingChange("showTitle", checked)}
              />
              <Label htmlFor="show-title">Mostrar Título</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-address"
                checked={printSettings.showAddress}
                onCheckedChange={(checked) => handleSettingChange("showAddress", checked)}
              />
              <Label htmlFor="show-address">Mostrar Endereço</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-phone"
                checked={printSettings.showPhone}
                onCheckedChange={(checked) => handleSettingChange("showPhone", checked)}
              />
              <Label htmlFor="show-phone">Mostrar Telefone</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Print */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste de Impressão
          </CardTitle>
          <CardDescription>Envie um pedido de teste para verificar a impressão</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestPrint} disabled={loading || !isConnected || !selectedPrinter} className="w-full">
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
            Imprimir Teste
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
