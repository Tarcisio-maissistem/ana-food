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

  // Setup security for QZ Tray (simplified for local development)
  async setupSecurity() {
    try {
      if (!window.qz) {
        throw new Error("QZ Tray not loaded")
      }

      // Simple security setup for local development
      window.qz.security.setCertificatePromise(() => {
        return Promise.resolve()
      })

      window.qz.security.setSignaturePromise(() => {
        return Promise.resolve()
      })

      console.log("[v0] QZ Tray security configurado")
      return true
    } catch (error) {
      console.error("[v0] Erro ao configurar segurança QZ Tray:", error)
      return false
    }
  }

  // Connect to QZ Tray
  async connect() {
    try {
      console.log("[v0] Iniciando conexão QZ Tray...")

      // Load script first
      await this.loadQzTrayScript()

      // Wait a bit for QZ Tray to initialize
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if already connected
      if (window.qz && window.qz.websocket && window.qz.websocket.isActive()) {
        console.log("[v0] QZ Tray já está conectado")
        this.isConnected = true
        return true
      }

      // Setup security
      await this.setupSecurity()

      // Connect
      await window.qz.websocket.connect()

      this.isConnected = true
      console.log("[v0] QZ Tray conectado com sucesso")
      return true
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      this.isConnected = false
      return false
    }
  }

  // List available printers
  async listPrinters() {
    try {
      if (!this.isConnected) {
        const connected = await this.connect()
        if (!connected) {
          throw new Error("Failed to connect to QZ Tray")
        }
      }

      console.log("[v0] Buscando impressoras disponíveis...")

      // Try to get printers with timeout
      const printersPromise = window.qz.printers.find()
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))

      const printers = await Promise.race([printersPromise, timeoutPromise])

      this.printers = printers || []
      console.log("[v0] Impressoras encontradas:", this.printers)

      return this.printers
    } catch (error) {
      console.error("[v0] Erro ao listar impressoras:", error.message)

      // Return fallback virtual printers for testing
      this.printers = ["Microsoft Print to PDF", "Microsoft XPS Document Writer", "Impressora Virtual (Teste)"]

      console.log("[v0] Usando impressoras virtuais para teste:", this.printers)
      return this.printers
    }
  }

  // Set selected printer
  setSelectedPrinter(printerName) {
    this.selectedPrinter = printerName
    console.log("[v0] Impressora selecionada:", printerName)
  }

  // Update print settings
  updatePrintSettings(settings) {
    this.printSettings = { ...this.printSettings, ...settings }
    console.log("[v0] Configurações de impressão atualizadas:", this.printSettings)
  }

  // Generate print content for order
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

  // Print order
  async printOrder(order) {
    try {
      if (!this.selectedPrinter) {
        throw new Error("Nenhuma impressora selecionada")
      }

      const content = this.generatePrintContent(order)
      console.log("[v0] Conteúdo da impressão:", content)

      if (!this.isConnected) {
        await this.connect()
      }

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
      return true
    } catch (error) {
      console.error("[v0] Erro ao imprimir pedido:", error.message)
      throw error
    }
  }

  // Test print
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

  // Get connection status
  isQzTrayConnected() {
    return this.isConnected && window.qz && window.qz.websocket && window.qz.websocket.isActive()
  }

  // Disconnect
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
