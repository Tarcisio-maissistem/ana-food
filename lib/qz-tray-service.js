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

  async setupSecurity() {
    try {
      if (typeof window !== "undefined" && window.qz) {
        // Set up QZ Tray security - allow unsigned certificates for local development
        window.qz.security.setCertificatePromise(() => {
          // For development/local use, we can use a self-signed certificate or skip certificate validation
          return Promise.resolve()
        })

        window.qz.security.setSignaturePromise((toSign) => {
          // For development/local use, we can skip signature validation
          return Promise.resolve()
        })

        console.log("[v0] QZ Tray security configurado")
        return true
      }
      return false
    } catch (error) {
      console.error("[v0] Erro ao configurar segurança QZ Tray:", error)
      return false
    }
  }

  // Connect to QZ Tray
  async connect() {
    try {
      if (typeof window !== "undefined" && window.qz) {
        console.log("[v0] Iniciando conexão com QZ Tray...")

        const alreadyConnected = await this.isQzConnected()
        if (alreadyConnected) {
          console.log("[v0] QZ Tray já está conectado")
          this.isConnected = true
          return true
        }

        console.log("[v0] Configurando segurança do QZ Tray...")
        await this.setupSecurity()

        console.log("[v0] Estabelecendo conexão websocket...")
        await window.qz.websocket.connect()

        const connectionVerified = await this.isQzConnected()
        if (connectionVerified) {
          this.isConnected = true
          console.log("[v0] QZ Tray conectado com sucesso")
          return true
        } else {
          throw new Error("Falha na verificação da conexão")
        }
      } else {
        throw new Error("QZ Tray não encontrado - verifique se o script foi carregado")
      }
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error)
      this.isConnected = false
      return false
    }
  }

  // Disconnect from QZ Tray
  async disconnect() {
    try {
      const isActive = await this.isQzConnected()
      if (isActive && window.qz) {
        await window.qz.websocket.disconnect()
        this.isConnected = false
        console.log("[v0] QZ Tray desconectado")
      } else {
        this.isConnected = false
        console.log("[v0] QZ Tray já estava desconectado")
      }
    } catch (error) {
      console.error("[v0] Erro ao desconectar QZ Tray:", error)
    }
  }

  // List available printers
  async listPrinters() {
    try {
      console.log("[v0] Iniciando busca por impressoras...")

      const isActive = await this.isQzConnected()
      if (!isActive) {
        console.log("[v0] QZ Tray não está conectado, tentando conectar...")
        const connected = await this.connect()
        if (!connected) {
          throw new Error("Não foi possível conectar ao QZ Tray")
        }
      }

      if (window.qz && window.qz.printers) {
        console.log("[v0] Buscando impressoras disponíveis...")
        this.printers = await window.qz.printers.find()
        console.log("[v0] Impressoras encontradas:", this.printers)

        if (this.printers.length === 0) {
          console.warn("[v0] Nenhuma impressora encontrada no sistema")
        }

        return this.printers
      } else {
        throw new Error("QZ Tray printers API não disponível")
      }
    } catch (error) {
      console.error("[v0] Erro ao listar impressoras:", error)
      this.printers = []
      return []
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

  // Format order data for printing
  formatOrderData(orderData, companyData) {
    let printData = ""

    // Header with company info
    if (this.printSettings.showLogo) {
      printData += "\x1B\x61\x01" // Center align
      printData += "[LOGO]\n"
    }

    if (this.printSettings.showTitle) {
      printData += "\x1B\x61\x01" // Center align
      printData += `${companyData?.name || "Restaurante"}\n`
    }

    if (this.printSettings.showAddress) {
      printData += "\x1B\x61\x01" // Center align
      printData += `${companyData?.address || "Endereço não informado"}\n`
    }

    if (this.printSettings.showPhone) {
      printData += "\x1B\x61\x01" // Center align
      printData += `Tel: ${companyData?.phone || "Telefone não informado"}\n`
    }

    printData += "\x1B\x61\x00" // Left align
    printData += "================================\n"
    printData += `PEDIDO #${orderData.id || "N/A"}\n`
    printData += `Data: ${new Date().toLocaleString("pt-BR")}\n`
    printData += "================================\n"

    // Customer info
    if (orderData.customer_name) {
      printData += `Cliente: ${orderData.customer_name}\n`
    }
    if (orderData.customer_phone) {
      printData += `Telefone: ${orderData.customer_phone}\n`
    }
    if (orderData.delivery_address) {
      printData += `Endereço: ${orderData.delivery_address}\n`
    }
    printData += "--------------------------------\n"

    // Items
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach((item) => {
        printData += `${item.quantity}x ${item.name}\n`
        if (item.price) {
          printData += `   R$ ${Number.parseFloat(item.price).toFixed(2)}\n`
        }
        if (item.observations) {
          printData += `   Obs: ${item.observations}\n`
        }
      })
    }

    printData += "--------------------------------\n"
    printData += `TOTAL: R$ ${Number.parseFloat(orderData.total || 0).toFixed(2)}\n`
    printData += "================================\n"

    if (orderData.observations) {
      printData += `Observações: ${orderData.observations}\n`
      printData += "================================\n"
    }

    printData += "\n\n\n"
    printData += "\x1D\x56\x00" // Cut paper

    return printData
  }

  // Print order
  async printOrder(orderData, companyData, isTest = false) {
    try {
      if (!this.selectedPrinter) {
        throw new Error("Nenhuma impressora selecionada")
      }

      const isActive = await this.isQzConnected()
      if (!isActive) {
        await this.connect()
      }

      const printData = this.formatOrderData(orderData, companyData)

      // Show preview in console
      console.log("[v0] Pré-visualização do pedido:", printData)

      try {
        const config = window.qz.configs.create(this.selectedPrinter, {
          colorType: "blackwhite",
          units: "in",
          scaleContent: false,
        })

        const data = [
          {
            type: "raw",
            format: "command",
            flavor: "plain",
            data: printData,
          },
        ]

        console.log("[v0] Enviando dados para impressão...")
        await window.qz.print(config, data)
        console.log(`[v0] ${isTest ? "Teste impresso!" : "Pedido impresso!"} na impressora: ${this.selectedPrinter}`)
        return true
      } catch (printError) {
        console.error("[v0] Erro específico na impressão:", printError)

        console.log("[v0] Tentando método alternativo de impressão...")
        const simpleConfig = window.qz.configs.create(this.selectedPrinter)
        const simpleData = [
          {
            type: "raw",
            data: printData,
          },
        ]

        await window.qz.print(simpleConfig, simpleData)
        console.log(
          `[v0] ${isTest ? "Teste impresso!" : "Pedido impresso!"} (método alternativo) na impressora: ${this.selectedPrinter}`,
        )
        return true
      }
    } catch (error) {
      console.error("[v0] Erro ao imprimir pedido:", error)
      throw error
    }
  }

  // Test print
  async testPrint(companyData) {
    const testOrder = {
      id: "TEST-001",
      customer_name: "Cliente Teste",
      customer_phone: "(11) 99999-9999",
      delivery_address: "Rua Teste, 123 - Bairro Teste",
      items: [
        { name: "Hambúrguer Teste", quantity: 1, price: 25.9 },
        { name: "Batata Frita", quantity: 1, price: 12.5 },
      ],
      total: 38.4,
      observations: "Pedido de teste - QZ Tray",
    }

    return await this.printOrder(testOrder, companyData, true)
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      selectedPrinter: this.selectedPrinter,
      availablePrinters: this.printers,
      settings: this.printSettings,
    }
  }

  async isQzConnected() {
    try {
      if (typeof window !== "undefined" && window.qz && window.qz.websocket) {
        const isActive = window.qz.websocket.isActive()
        console.log("[v0] Status da conexão QZ Tray:", isActive ? "Ativo" : "Inativo")
        return isActive
      }
      console.log("[v0] QZ Tray não está disponível no window object")
      return false
    } catch (error) {
      console.error("[v0] Erro ao verificar conexão QZ Tray:", error)
      return false
    }
  }
}

// Export singleton instance
const qzTrayService = new QZTrayService()

if (typeof window !== "undefined") {
  window.qzTrayService = qzTrayService
}

export default qzTrayService
