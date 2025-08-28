// QZ Tray Service for printer management and order printing
class QZTrayService {
  constructor() {
    this.isConnected = false
    this.printers = []
    this.selectedPrinter = null
    this.printSettings = {
      showLogo: true,
      showTitle: true,
      showAddress: true,
      showPhone: true,
    }
  }

  // Load QZ Tray script dynamically
  async loadQzTrayScript() {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.qz) {
        console.log("[v0] QZ Tray script já carregado")
        resolve(true)
        return
      }

      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.3/qz-tray.js"
      script.onload = () => {
        console.log("[v0] QZ Tray script carregado")
        resolve(true)
      }
      script.onerror = () => {
        console.error("[v0] Erro ao carregar QZ Tray script")
        reject(new Error("Failed to load QZ Tray script"))
      }
      document.head.appendChild(script)
    })
  }

  async setupSecurity() {
    try {
      if (!window.qz) {
        throw new Error("QZ Tray not loaded")
      }

      window.qz.security.setCertificatePromise((resolve, reject) => {
        // Development certificate for testing
        const devCert = `-----BEGIN CERTIFICATE-----
MIIC2DCCAcCgAwIBAgIJAJbC3gkP3eGOMA0GCSqGSIb3DQEBCwUAMB0xGzAZBgNV
BAMMEnF6LWRldmVsb3BtZW50LWNlcnQwHhcNMjUwMTAxMDAwMDAwWhcNMzUwMTAx
MDAwMDAwWjAdMRswGQYDVQQDDBJxei1kZXZlbG9wbWVudC1jZXJ0MIIBIjANBgkq
hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0DukMxMRklkghH9GCOcN5G6+cDEb2nEC
+YTdHeVV3sDjffmv0x8XCN1L4O9h1yVq9ZDb8rXz+7CnPG5mOyeT6f6j5px8TmCa
Xz3iMUSIYFVZT5WY2lx3rGdQYMuEIA8LV7iSNGzEY5cDszWb9Jo2KQBNtAcd8cT7
0FzjQvR5/nhczxGQh6I5oL9RW6mRzOFr4G19x6pCgAT6X9YHj8i52L8crdG7Qk4y
yYQJ7T3d+OoylHQt+ppb3tz4MQclHL3g7IpBxTlv5Gmfa1z2y3VYmKiBN3Q6CTh2
tJmXFYqD8cKukK6FJSg9d2L+J7g0c93whnmCkh7VZwCCVWWvFGUGuwIDAQABo1Aw
TjAdBgNVHQ4EFgQUswlKCF2s5rQbR1N7pOj3EsyF3wAwHwYDVR0jBBgwFoAUswlK
CF2s5rQbR1N7pOj3EsyF3wAwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOC
AQEAAKwXbVtvUoU4QzIc9HyUuFK4XU/DTaQptxY8Ardx1BlOsXsHoFwOpzDQFgk3
dE9/6X1PpaHz8XW6WREMBYuEt77JCu7Xn5AOx+0z4OfuD0VAgY8m2PJK2AlWy9jR
jwoyWkYc6dSrhT8y5p6Bdg37NEuyFO7BtE9rkS9o6iXhhQyfGu8Pv6Q9t9P6b2Ti
d74ep1Tx4xAmdFOcSFr6CNB7aSTVYpX0uSmw4oCcSM/z3a9+2GJ0oMewHQ9JCGKv
4TO2vFZisKh3aHTdVyjSwdnS2sOOVOaHRZqBz9szw2u3CBLrQFgzv++SyHLKDzSb
qNj4Qj8Tw+3yBrbMB43SuDPlVw==
-----END CERTIFICATE-----`
        resolve(devCert)
      })

      window.qz.security.setSignaturePromise((toSign) => {
        return Promise.resolve(toSign)
      })

      console.log("[v0] QZ Tray security configurado")
      return true
    } catch (error) {
      console.error("[v0] Erro ao configurar segurança QZ Tray:", error)
      return false
    }
  }

  async connect() {
    try {
      console.log("[v0] Iniciando conexão QZ Tray...")

      // Load script first
      await this.loadQzTrayScript()

      // Wait for QZ Tray to initialize
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (!window.qz) {
        throw new Error("QZ Tray script não carregado")
      }

      // Check if already connected
      if (window.qz.websocket.isActive()) {
        console.log("[v0] QZ Tray já está conectado")
        this.isConnected = true
        return true
      }

      // Setup security
      await this.setupSecurity()

      await window.qz.websocket.connect({
        host: "localhost",
        port: 8182, // Non-secure port as in working example
        usingSecure: false,
      })

      this.isConnected = true
      console.log("[v0] QZ Tray conectado com sucesso")
      return true
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      this.isConnected = false

      const guidance = {
        isInstalled: false,
        downloadUrl: "https://qz.io/download/",
        instructions: [
          "1. Baixe o QZ Tray em: https://qz.io/download/",
          "2. Instale o aplicativo no seu computador",
          "3. Execute o QZ Tray (deve aparecer na bandeja do sistema)",
          "4. Recarregue esta página para tentar conectar novamente",
        ],
      }

      return { success: false, error: error.message, guidance }
    }
  }

  async listPrinters() {
    try {
      console.log("[v0] Iniciando listagem de impressoras...")

      if (!window.qz || !window.qz.websocket.isActive()) {
        const connectionResult = await this.connect()
        if (!connectionResult || connectionResult.success === false) {
          console.log("[v0] Falha na conexão QZ Tray")
          return {
            printers: [],
            isDemo: false,
            error: "QZ Tray não está conectado",
            guidance: connectionResult.guidance,
          }
        }
      }

      console.log("[v0] Buscando impressoras do Windows...")

      const printers = await window.qz.printers.findAll()

      console.log("[v0] Impressoras encontradas:", printers)

      if (printers && printers.length > 0) {
        this.printers = printers
        console.log("[v0] Total de impressoras detectadas:", printers.length)
        return { printers: this.printers, isDemo: false }
      } else {
        console.log("[v0] Nenhuma impressora encontrada")
        return {
          printers: [],
          isDemo: false,
          error: "Nenhuma impressora foi detectada no Windows",
        }
      }
    } catch (error) {
      console.error("[v0] Erro ao listar impressoras:", error.message)
      return {
        printers: [],
        isDemo: false,
        error: `Erro ao detectar impressoras: ${error.message}`,
      }
    }
  }

  setSelectedPrinter(printerName) {
    this.selectedPrinter = printerName
    console.log("[v0] Impressora selecionada:", printerName)
  }

  updatePrintSettings(settings) {
    this.printSettings = { ...this.printSettings, ...settings }
    console.log("[v0] Configurações de impressão atualizadas:", this.printSettings)
  }

  generatePrintContent(order) {
    const { showLogo, showTitle, showAddress, showPhone } = this.printSettings

    let content = ""

    if (showLogo) {
      content += "================================\n"
      content += "         RESTAURANTE\n"
      content += "================================\n\n"
    }

    if (showTitle) {
      content += `PEDIDO #${order.id || "TESTE"}\n`
      content += `Data: ${new Date().toLocaleString("pt-BR")}\n\n`
    }

    content += `Cliente: ${order.customer_name || "Cliente Teste"}\n`
    content += `Telefone: ${order.phone || "(11) 99999-9999"}\n\n`

    content += "ITENS:\n"
    content += "--------------------------------\n"

    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        content += `${item.quantity}x ${item.name}\n`
        content += `   R$ ${item.price.toFixed(2)}\n`
      })
    } else {
      content += "1x Hambúrguer Especial\n"
      content += "   R$ 25,00\n"
      content += "1x Batata Frita\n"
      content += "   R$ 12,00\n"
    }

    content += "--------------------------------\n"
    content += `TOTAL: R$ ${order.total || "37,00"}\n\n`

    if (showAddress) {
      content += "ENDEREÇO DE ENTREGA:\n"
      content += `${order.address || "Rua Exemplo, 123 - Centro"}\n\n`
    }

    if (showPhone) {
      content += "CONTATO:\n"
      content += "(11) 1234-5678\n\n"
    }

    content += "================================\n"
    content += "    Obrigado pela preferência!\n"
    content += "================================\n"

    return content
  }

  async printOrder(order) {
    try {
      if (!this.selectedPrinter) {
        throw new Error("Nenhuma impressora selecionada")
      }

      if (!window.qz || !window.qz.websocket.isActive()) {
        throw new Error("QZ Tray não está conectado")
      }

      const content = this.generatePrintContent(order)
      console.log("[v0] Imprimindo pedido na impressora:", this.selectedPrinter)

      const config = window.qz.configs.create(this.selectedPrinter)
      const data = [
        {
          type: "raw",
          format: "plain",
          data: content,
        },
      ]

      await window.qz.print(config, data)
      console.log("[v0] Pedido impresso com sucesso")
      return { success: true, isDemo: false }
    } catch (error) {
      console.error("[v0] Erro ao imprimir pedido:", error.message)
      throw error
    }
  }

  async testPrint() {
    const testOrder = {
      id: "TESTE-001",
      customer_name: "Cliente Teste",
      phone: "(11) 99999-9999",
      address: "Rua Exemplo, 123 - Centro",
      items: [
        { name: "Hambúrguer Especial", quantity: 1, price: 25.0 },
        { name: "Batata Frita", quantity: 1, price: 12.0 },
      ],
      total: "37,00",
    }

    return await this.printOrder(testOrder)
  }

  isQzTrayConnected() {
    return this.isConnected && window.qz && window.qz.websocket && window.qz.websocket.isActive()
  }

  async disconnect() {
    try {
      if (window.qz && window.qz.websocket && window.qz.websocket.isActive()) {
        await window.qz.websocket.disconnect()
      }
      this.isConnected = false
      console.log("[v0] QZ Tray desconectado")
    } catch (error) {
      console.error("[v0] Erro ao desconectar QZ Tray:", error)
    }
  }
}

// Export singleton instance
const qzTrayService = new QZTrayService()
export default qzTrayService
