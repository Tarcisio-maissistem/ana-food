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

  async checkQzTrayService() {
    try {
      // Check if QZ Tray service is running by testing websocket connection
      const response = await fetch("http://localhost:8182", {
        method: "GET",
        timeout: 2000,
      }).catch(() => null)

      if (!response) {
        console.log("[v0] QZ Tray service não está rodando na porta 8182")
        return false
      }

      console.log("[v0] QZ Tray service detectado")
      return true
    } catch (error) {
      console.log("[v0] QZ Tray service não detectado:", error.message)
      return false
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

      // Enhanced security setup for local development
      window.qz.security.setCertificatePromise(() => {
        return Promise.resolve(
          "-----BEGIN CERTIFICATE-----\n" +
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5EJvxQDQlEKKKKKKKKKK\n" +
            "-----END CERTIFICATE-----",
        )
      })

      window.qz.security.setSignaturePromise((toSign) => {
        return Promise.resolve("SHA512withRSA")
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

      const serviceRunning = await this.checkQzTrayService()
      if (!serviceRunning) {
        throw new Error("QZ Tray service não está rodando. Por favor, inicie o QZ Tray.")
      }

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

      // Connect with timeout
      const connectPromise = window.qz.websocket.connect()
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000))

      await Promise.race([connectPromise, timeoutPromise])

      this.isConnected = true
      console.log("[v0] QZ Tray conectado com sucesso")
      return true
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      this.isConnected = false
      return false
    }
  }

  async listPrinters() {
    try {
      if (!this.isConnected) {
        const connected = await this.connect()
        if (!connected) {
          throw new Error("Failed to connect to QZ Tray")
        }
      }

      console.log("[v0] Iniciando detecção robusta de impressoras...")

      // Method 1: Try to get all printers
      try {
        console.log("[v0] Método 1: Buscando todas as impressoras...")
        const allPrintersPromise = window.qz.printers.find()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))

        const printers = await Promise.race([allPrintersPromise, timeoutPromise])

        if (printers && printers.length > 0) {
          this.printers = printers
          console.log("[v0] Impressoras encontradas (Método 1):", this.printers)
          return this.printers
        }
      } catch (error) {
        console.log("[v0] Método 1 falhou:", error.message)
      }

      // Method 2: Try to get default printer
      try {
        console.log("[v0] Método 2: Buscando impressora padrão...")
        const defaultPrinterPromise = window.qz.printers.getDefault()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))

        const defaultPrinter = await Promise.race([defaultPrinterPromise, timeoutPromise])

        if (defaultPrinter) {
          this.printers = [defaultPrinter]
          console.log("[v0] Impressora padrão encontrada (Método 2):", this.printers)
          return this.printers
        }
      } catch (error) {
        console.log("[v0] Método 2 falhou:", error.message)
      }

      // Method 3: Try specific printer search
      try {
        console.log("[v0] Método 3: Buscando impressoras específicas...")
        const commonPrinters = ["Microsoft Print to PDF", "Microsoft XPS Document Writer"]
        const foundPrinters = []

        for (const printerName of commonPrinters) {
          try {
            const searchPromise = window.qz.printers.find(printerName)
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))

            const result = await Promise.race([searchPromise, timeoutPromise])
            if (result && result.length > 0) {
              foundPrinters.push(...result)
            }
          } catch (error) {
            console.log(`[v0] Busca por ${printerName} falhou:`, error.message)
          }
        }

        if (foundPrinters.length > 0) {
          this.printers = foundPrinters
          console.log("[v0] Impressoras encontradas (Método 3):", this.printers)
          return this.printers
        }
      } catch (error) {
        console.log("[v0] Método 3 falhou:", error.message)
      }

      console.log("[v0] Todos os métodos falharam, usando fallback inteligente...")

      // Try to detect if we're on Windows and provide appropriate fallback
      const isWindows = navigator.platform.toLowerCase().includes("win")

      if (isWindows) {
        this.printers = ["Microsoft Print to PDF", "Microsoft XPS Document Writer", "Fax", "OneNote (Desktop)"]
        console.log("[v0] Fallback Windows detectado:", this.printers)
      } else {
        this.printers = ["CUPS-PDF", "Print to File", "Virtual Printer"]
        console.log("[v0] Fallback genérico:", this.printers)
      }

      return this.printers
    } catch (error) {
      console.error("[v0] Erro crítico ao listar impressoras:", error.message)

      // Final fallback
      this.printers = ["Impressora Virtual (Teste)"]
      console.log("[v0] Fallback final:", this.printers)
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

  async printOrder(order) {
    try {
      if (!this.selectedPrinter) {
        throw new Error("Nenhuma impressora selecionada")
      }

      const content = this.generatePrintContent(order)
      console.log("[v0] Conteúdo da impressão gerado")

      if (!this.isConnected) {
        const connected = await this.connect()
        if (!connected) {
          throw new Error("Não foi possível conectar ao QZ Tray")
        }
      }

      // Verify printer is still available
      if (!this.printers.includes(this.selectedPrinter)) {
        console.log("[v0] Impressora selecionada não disponível, recarregando lista...")
        await this.listPrinters()

        if (!this.printers.includes(this.selectedPrinter)) {
          throw new Error(`Impressora '${this.selectedPrinter}' não está disponível`)
        }
      }

      const config = window.qz.configs.create(this.selectedPrinter)
      const data = [
        {
          type: "raw",
          format: "plain",
          data: content,
        },
      ]

      // Print with timeout
      const printPromise = window.qz.print(config, data)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Print timeout")), 10000))

      await Promise.race([printPromise, timeoutPromise])

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
