"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface LayoutSection {
  text: string
  bold: boolean
  size: number
  align: "left" | "center" | "right"
  enabled: boolean
}

interface PrintLayout {
  width: "55" | "80"
  sections: {
    header: LayoutSection
    address: LayoutSection
    phone: LayoutSection
    date: LayoutSection
    client: LayoutSection
    items: LayoutSection
    total: LayoutSection
    footer: LayoutSection
  }
}

interface PrinterLayoutEditorProps {
  onLayoutChange?: (layout: PrintLayout) => void
  onTestPrint?: (layout: PrintLayout) => void
}

export default function PrinterLayoutEditor({ onLayoutChange, onTestPrint }: PrinterLayoutEditorProps) {
  const [layout, setLayout] = useState<PrintLayout>({
    width: "80",
    sections: {
      header: { text: "{{empresa_nome}}", bold: true, size: 18, align: "center", enabled: true },
      address: { text: "{{empresa_endereco}}", bold: false, size: 12, align: "center", enabled: true },
      phone: { text: "Tel: {{empresa_telefone}}", bold: false, size: 12, align: "center", enabled: true },
      date: { text: "Data: {{data}} - {{hora}}", bold: false, size: 12, align: "left", enabled: true },
      client: { text: "Cliente: {{cliente_nome}}", bold: false, size: 12, align: "left", enabled: true },
      items: { text: "{{itens_pedido}}", bold: false, size: 12, align: "left", enabled: true },
      total: { text: "TOTAL: R$ {{valor_total}}", bold: true, size: 14, align: "right", enabled: true },
      footer: { text: "Obrigado pela preferência!", bold: false, size: 12, align: "center", enabled: true },
    },
  })

  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  useEffect(() => {
    // Load saved layout from localStorage
    const savedLayout = localStorage.getItem("printer-layout")
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout))
      } catch (error) {
        console.error("Erro ao carregar layout salvo:", error)
      }
    }
  }, [])

  const handleEdit = (section: string, field: keyof LayoutSection, value: any) => {
    const newLayout = {
      ...layout,
      sections: {
        ...layout.sections,
        [section]: { ...layout.sections[section as keyof typeof layout.sections], [field]: value },
      },
    }
    setLayout(newLayout)

    // Save to localStorage
    localStorage.setItem("printer-layout", JSON.stringify(newLayout))

    // Notify parent component
    onLayoutChange?.(newLayout)
  }

  const handleWidthChange = (width: "55" | "80") => {
    const newLayout = { ...layout, width }
    setLayout(newLayout)
    localStorage.setItem("printer-layout", JSON.stringify(newLayout))
    onLayoutChange?.(newLayout)
  }

  const getSectionLabel = (key: string) => {
    const labels: Record<string, string> = {
      header: "Cabeçalho",
      address: "Endereço",
      phone: "Telefone",
      date: "Data/Hora",
      client: "Cliente",
      items: "Itens",
      total: "Total",
      footer: "Rodapé",
    }
    return labels[key] || key
  }

  const generatePreviewContent = (section: LayoutSection, key: string) => {
    const sampleData: Record<string, string> = {
      "{{empresa_nome}}": "Restaurante Exemplo",
      "{{empresa_endereco}}": "Rua das Flores, 123 - Centro",
      "{{empresa_telefone}}": "(11) 99999-9999",
      "{{data}}": "15/01/2025",
      "{{hora}}": "19:30",
      "{{cliente_nome}}": "João Silva",
      "{{itens_pedido}}": "1x Hambúrguer Especial - R$ 25,00\n1x Batata Frita - R$ 12,00\n1x Refrigerante - R$ 8,00",
      "{{valor_total}}": "45,00",
    }

    let text = section.text
    Object.entries(sampleData).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value)
    })

    return text
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização do Cupom</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed border-gray-300 p-4 bg-white font-mono text-black ${
              layout.width === "55" ? "w-[200px]" : "w-[280px]"
            } mx-auto`}
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {Object.entries(layout.sections).map(([key, section]) => {
              if (!section.enabled) return null

              return (
                <div
                  key={key}
                  className={`cursor-pointer hover:bg-gray-100 p-1 rounded ${
                    selectedSection === key ? "bg-blue-100 border border-blue-300" : ""
                  }`}
                  style={{
                    fontWeight: section.bold ? "bold" : "normal",
                    fontSize: `${section.size}px`,
                    textAlign: section.align,
                    whiteSpace: "pre-line",
                  }}
                  onClick={() => setSelectedSection(selectedSection === key ? null : key)}
                >
                  {generatePreviewContent(section, key)}
                </div>
              )
            })}
            <div className="border-t-2 border-dashed border-gray-400 mt-4 pt-2 text-center text-xs text-gray-500">
              [CORTE DO PAPEL]
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paper Width */}
          <div className="space-y-2">
            <Label>Largura da Bobina</Label>
            <Select value={layout.width} onValueChange={handleWidthChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="55">55mm (Compacta)</SelectItem>
                <SelectItem value="80">80mm (Padrão)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Seções do Cupom</Label>
            {Object.entries(layout.sections).map(([key, section]) => (
              <Card key={key} className={`p-3 ${selectedSection === key ? "border-blue-300 bg-blue-50" : ""}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{getSectionLabel(key)}</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={section.enabled}
                        onCheckedChange={(checked) => handleEdit(key, "enabled", checked)}
                      />
                      <Label className="text-sm">Ativo</Label>
                    </div>
                  </div>

                  {section.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm">Texto</Label>
                        <Input
                          value={section.text}
                          onChange={(e) => handleEdit(key, "text", e.target.value)}
                          className="text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Tamanho</Label>
                          <Input
                            type="number"
                            value={section.size}
                            onChange={(e) => handleEdit(key, "size", Number.parseInt(e.target.value) || 12)}
                            min="8"
                            max="24"
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Alinhamento</Label>
                          <Select value={section.align} onValueChange={(value) => handleEdit(key, "align", value)}>
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Esquerda</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                              <SelectItem value="right">Direita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Negrito</Label>
                          <div className="flex items-center justify-center h-9">
                            <Checkbox
                              checked={section.bold}
                              onCheckedChange={(checked) => handleEdit(key, "bold", checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Test Print Button */}
          <Button onClick={() => onTestPrint?.(layout)} className="w-full" size="lg">
            Testar Impressão
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
