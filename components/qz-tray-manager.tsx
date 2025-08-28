"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Printer, TestTube, RefreshCw, Wifi, WifiOff, Settings } from "lucide-react"
import qzTrayService from "@/lib/qz-tray-service"
import PrinterLayoutEditor from "@/components/printer-layout-editor"

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

  const [savingSettings, setSavingSettings] = useState(false)
  const [printerLayout, setPrinterLayout] = useState(null)

  useEffect(() => {
    loadPrinterSettings()
    checkConnection()
  }, [])

  const loadPrinterSettings = async () => {
    try {
      const response = await fetch("/api/printer-settings", {
        headers: {
          "x-user-email": "tarcisiorp16@gmail.com",
        },
      })

      if (response.ok) {
        const settings = await response.json()
        if (settings.defaultPrinter) {
          setSelectedPrinter(settings.defaultPrinter)
          qzTrayService.setSelectedPrinter(settings.defaultPrinter)
        }
        setPrintSettings({
          showLogo: settings.showLogo,
          showTitle: settings.showTitle,
          showAddress: settings.showAddress,
          showPhone: settings.showPhone,
        })
        qzTrayService.updatePrintSettings({
          showLogo: settings.showLogo,
          showTitle: settings.showTitle,
          showAddress: settings.showAddress,
          showPhone: settings.showPhone,
        })
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de impressora:", error)
    }
  }

  const checkConnection = async () => {
    try {
      console.log("[v0] Verificando conexão QZ Tray...")

      const connected = await qzTrayService.connect()
      console.log("[v0] Resultado da conexão:", connected)

      if (connected === true || (connected && connected.success === true)) {
        // Successful connection returns true or {success: true}
        setIsConnected(true)
        console.log("[v0] Conexão estabelecida, carregando impressoras...")
        await loadPrinters()
      } else if (connected && connected.success === false) {
        // Failed connection returns object with success: false
        setIsConnected(false)
        console.error("[v0] Falha ao conectar com QZ Tray:", connected.error || "Conexão falhou")
      } else {
        // Unexpected return format
        setIsConnected(false)
        console.error("[v0] Formato de resposta inesperado:", connected)
      }
    } catch (error) {
      console.error("[v0] Erro ao verificar conexão QZ Tray:", error)
      setIsConnected(false)
    }
  }

  const loadPrinters = async () => {
    setLoading(true)
    try {
      console.log("[v0] Iniciando carregamento de impressoras...")
      const result = await qzTrayService.listPrinters()
      console.log("[v0] Lista de impressoras recebida:", result)

      let printerList = []

      if (Array.isArray(result)) {
        // Direct array return (legacy format)
        printerList = result
      } else if (result && Array.isArray(result.printers)) {
        // Object with printers array (new format)
        printerList = result.printers
      } else if (typeof result === "string") {
        // String message return (fallback case)
        console.warn("[v0] Received string instead of array:", result)
        printerList = []
      } else {
        // Unexpected format
        console.warn("[v0] Unexpected printer list format:", result)
        printerList = []
      }

      setPrinters(printerList)

      if (printerList.length > 0) {
        if (!selectedPrinter) {
          console.log("[v0] Selecionando primeira impressora automaticamente:", printerList[0])
          setSelectedPrinter(printerList[0])
          qzTrayService.setSelectedPrinter(printerList[0])
        }
      } else {
        console.warn("[v0] Nenhuma impressora encontrada")
        setSelectedPrinter("")
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar impressoras:", error)
      setPrinters([])
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
      await qzTrayService.printOrder(sampleOrder, companyData)
      alert("Teste de impressão enviado com sucesso!")
    } catch (error) {
      console.error("[v0] Erro no teste de impressão:", error)
      alert("Erro ao enviar teste de impressão: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const generatePreview = () => {
    let preview = ""

    if (printSettings.showLogo) {
      preview += "🍔 LOGO DA EMPRESA\n"
    }

    if (printSettings.showTitle) {
      preview += `${companyData?.nome || "RESTAURANTE EXEMPLO"}\n`
    }

    if (printSettings.showAddress) {
      preview += `${companyData?.rua || "Rua Exemplo, 123"}\n`
    }

    if (printSettings.showPhone) {
      preview += `Tel: ${companyData?.telefone || "(11) 99999-9999"}\n`
    }

    preview += "\n" + "=".repeat(32) + "\n"
    preview += `PEDIDO: ${sampleOrder.id}\n`
    preview += `CLIENTE: ${sampleOrder.customerName}\n`
    preview += `TELEFONE: ${sampleOrder.customerPhone}\n`
    preview += `ENDEREÇO: ${sampleOrder.customerAddress}\n`
    preview += "=".repeat(32) + "\n\n"

    sampleOrder.items.forEach((item) => {
      preview += `${item.quantity}x ${item.name}\n`
      preview += `   R$ ${item.price.toFixed(2)}\n`
      if (item.observations) {
        preview += `   OBS: ${item.observations}\n`
      }
      preview += "\n"
    })

    preview += "-".repeat(32) + "\n"
    preview += `SUBTOTAL: R$ ${sampleOrder.subtotal.toFixed(2)}\n`
    preview += `ENTREGA: R$ ${sampleOrder.deliveryFee.toFixed(2)}\n`
    preview += `TOTAL: R$ ${sampleOrder.total.toFixed(2)}\n`
    preview += "-".repeat(32) + "\n"
    preview += `PAGAMENTO: ${sampleOrder.paymentMethod}\n`
    if (sampleOrder.change) {
      preview += `TROCO PARA: R$ ${sampleOrder.change.toFixed(2)}\n`
    }
    if (sampleOrder.observations) {
      preview += `\nOBSERVAÇÕES: ${sampleOrder.observations}\n`
    }

    return preview
  }

  const savePrinterSettings = async () => {
    setSavingSettings(true)
    try {
      const response = await fetch("/api/printer-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "tarcisiorp16@gmail.com",
        },
        body: JSON.stringify({
          defaultPrinter: selectedPrinter,
          ...printSettings,
        }),
      })

      if (response.ok) {
        alert("Configurações salvas com sucesso!")
      } else {
        throw new Error("Erro ao salvar configurações")
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      alert("Erro ao salvar configurações: " + error.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleLayoutChange = (layout) => {
    setPrinterLayout(layout)
    // Update QZ Tray service with new layout
    qzTrayService.updatePrintLayout(layout)
  }

  const handleLayoutTestPrint = async (layout) => {
    if (!selectedPrinter) {
      alert("Selecione uma impressora primeiro!")
      return
    }

    setLoading(true)
    try {
      await qzTrayService.testPrintWithLayout(layout, companyData)
      alert("Teste de impressão com layout personalizado enviado!")
    } catch (error) {
      console.error("[v0] Erro no teste de impressão:", error)
      alert("Erro ao enviar teste de impressão: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const [sampleOrder, setSampleOrder] = useState({
    id: "PED-001",
    customerName: "João Silva",
    customerPhone: "(11) 99999-9999",
    customerAddress: "Rua das Flores, 123 - Centro",
    items: [
      { name: "X-Burger", quantity: 2, price: 15.9, observations: "Sem cebola" },
      { name: "Batata Frita", quantity: 1, price: 8.5, observations: "" },
      { name: "Coca-Cola 350ml", quantity: 2, price: 4.5, observations: "" },
    ],
    subtotal: 48.8,
    deliveryFee: 5.0,
    total: 53.8,
    paymentMethod: "Dinheiro",
    change: 60.0,
    observations: "Entregar no portão azul",
  })

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
            {isConnected
              ? "Conectado e pronto para imprimir"
              : "QZ Tray não está rodando. Instale e execute o QZ Tray para detectar impressoras do Windows."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Conectado" : "QZ Tray Não Disponível"}
            </Badge>
            <Button onClick={checkConnection} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {isConnected ? "Reconectar" : "Tentar Conectar"}
            </Button>
          </div>

          {!isConnected && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Como instalar o QZ Tray:</h4>
              <ol className="text-sm text-orange-700 space-y-1">
                <li>
                  1. Baixe o QZ Tray em:{" "}
                  <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="underline">
                    https://qz.io/download/
                  </a>
                </li>
                <li>2. Instale o aplicativo no seu computador</li>
                <li>3. Execute o QZ Tray (deve aparecer na bandeja do sistema)</li>
                <li>4. Certifique-se de que está rodando na porta 8182</li>
                <li>5. Recarregue esta página para tentar conectar novamente</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Seleção de Impressora
          </CardTitle>
          <CardDescription>
            Escolha a impressora para imprimir os pedidos ({printers.length} encontradas)
          </CardDescription>
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

          <div className="flex justify-end">
            <Button
              onClick={savePrinterSettings}
              disabled={savingSettings || !selectedPrinter}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingSettings ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Impressão
          </CardTitle>
          <CardDescription>Configure o layout e aparência dos cupons impressos</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple">Configuração Simples</TabsTrigger>
              <TabsTrigger value="advanced">Editor de Layout</TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="space-y-4">
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

              <Button
                onClick={handleTestPrint}
                disabled={loading || !isConnected || !selectedPrinter}
                className="w-full"
              >
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                Teste de Impressão Simples
              </Button>
            </TabsContent>

            <TabsContent value="advanced">
              <PrinterLayoutEditor onLayoutChange={handleLayoutChange} onTestPrint={handleLayoutTestPrint} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
