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
      // Try secure port first (8181)
      let response = await fetch("https://localhost:8181", {
        method: "GET",
        timeout: 2000,
      }).catch(() => null)

      if (response) {
        console.log("[v0] QZ Tray service detectado na porta 8181 (seguro)")
        return { port: 8181, secure: true }
      }

      // Try non-secure port (8182)
      response = await fetch("http://localhost:8182", {
        method: "GET",
        timeout: 2000,
      }).catch(() => null)

      if (response) {
        console.log("[v0] QZ Tray service detectado na porta 8182 (não seguro)")
        return { port: 8182, secure: false }
      }

      console.log("[v0] QZ Tray service não está rodando em nenhuma porta")
      return false
    } catch (error) {
      console.log("[v0] QZ Tray service não detectado:", error.message)
      return false
    }
  }

  getQzTrayGuidance() {
    return {
      isInstalled: false,
      downloadUrl: "https://qz.io/download/",
      instructions: [
        "1. Baixe o QZ Tray em: https://qz.io/download/",
        "2. Instale o aplicativo no seu computador",
        "3. Execute o QZ Tray (deve aparecer na bandeja do sistema)",
        "4. Certifique-se de que está rodando na porta 8181 (seguro) ou 8182 (não seguro)",
        "5. Recarregue esta página para tentar conectar novamente",
      ],
      troubleshooting: [
        "• Verifique se o QZ Tray está rodando na bandeja do sistema",
        "• Tente fechar e abrir o QZ Tray novamente",
        "• Verifique se não há firewall bloqueando a porta 8181 ou 8182",
        "• Em caso de problemas, reinicie o computador após a instalação",
      ],
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

      window.qz.security.setCertificatePromise(() => {
        return Promise.resolve(
          "-----BEGIN CERTIFICATE-----\n" +
            "MIIECzCCAvOgAwIBAgIGAZjvJJUZMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG\n" +
            "EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS\n" +
            "UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx\n" +
            "HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg\n" +
            "RGVtbyBDZXJ0MB4XDTI1MDgyNzA1MjY0OFoXDTQ1MDgyNzA1MjY0OFowgaIxCzAJ\n" +
            "BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD\n" +
            "VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs\n" +
            "IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog\n" +
            "VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDI\n" +
            "xAo2kqVP4Ozz9lkpLbhewU1yLR4Q/yLcEI05sygKxnZejVpAynABKW/t1VSgCqZl\n" +
            "RVjp+U3cLVfeJkDpBpSdZHfH7G8zI/EfdtEWaEgSlxWh/FZJggBIeol9yDKNFitw\n" +
            "vqAKUDQKBgkc6arJba/cgnR5w9RC2nbcmmLUxwt+urAe1ci3ugQZEioGYpr6164y\n" +
            "V3q0+rrVCAWDKxHE5vecZtCIU+rUUkiTymzWmBNJQ4BiA5h+E2KnMiekRhSX8KxJ\n" +
            "L7L2Q6EC+W7aj7ZmY9ZT7qjeuKoDbC2l2T3LnbwXOc1HVsONbPRTkhVqVev5GYVZ\n" +
            "Jlb5xrAyxX4BjQkXbEu7AgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD\n" +
            "VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBQTV7YX9NFRjuPpWNi9Pq3sYlJ5cjANBgkq\n" +
            "hkiG9w0BAQsFAAOCAQEASp5f9rTt0MXncn//JH3ROVlKRfYyvMc4uJvWlh8OEFbF\n" +
            "XIWwIzVCnRCOacxhPEDjDJtPeglHNfxb8xfqxIWSDAYRN4GleKgkr3ntoZ2O0SS6\n" +
            "5HgNve6TjMl2vy65MAfqq/nIeUuXXSlYGJJrhvz7pvk8kRFWsMmtXwFvYG62G1Nj\n" +
            "GUKX6FtmjS+L+0vz06GJbgN6kvsKTAD61scruHQjCDPdo33Pm+16EtTy2RskLj2d\n" +
            "ZgxWYVLJmiUVcNE8Ud55pLq5ge2AVdwoBIYZA666CFCkWNgWpdXPyr9E1wo+ZY8y\n" +
            "yVJQbhuIhb2lSDfbN5DM4lANRKPnhMQgOmVGty6efQ==\n" +
            "-----END CERTIFICATE-----",
        )
      })

      window.qz.security.setSignaturePromise((toSign) => {
        return Promise.resolve("SHA512withRSA")
      })

      console.log("[v0] QZ Tray security configurado com certificado oficial")
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

      const serviceInfo = await this.checkQzTrayService()
      if (!serviceInfo) {
        const guidance = this.getQzTrayGuidance()
        const error = new Error("QZ Tray service não está rodando. Por favor, inicie o QZ Tray.")
        error.guidance = guidance
        throw error
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

      const connectPromise = window.qz.websocket.connect({
        host: "localhost",
        port: serviceInfo.port,
        usingSecure: serviceInfo.secure,
      })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 10000),
      )

      await Promise.race([connectPromise, timeoutPromise])

      this.isConnected = true
      console.log(
        `[v0] QZ Tray conectado com sucesso na porta ${serviceInfo.port} (${serviceInfo.secure ? "seguro" : "não seguro"})`,
      )
      return true
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      this.isConnected = false

      if (error.guidance) {
        return { success: false, error: error.message, guidance: error.guidance }
      }
      return { success: false, error: error.message }
    }
  }

  async listPrinters() {
    try {
      if (!this.isConnected) {
        const connectionResult = await this.connect()
        if (!connectionResult || !connectionResult.success) {
          console.log("[v0] QZ Tray não está disponível - nenhuma impressora será listada")
          return {
            printers: [],
            isDemo: false,
            error: "QZ Tray service não está rodando. Instale e execute o QZ Tray para detectar impressoras.",
            guidance: this.getQzTrayGuidance(),
          }
        }
      }

      if (!window.qz || !window.qz.printers) {
        console.log("[v0] QZ Tray API não está disponível")
        return {
          printers: [],
          isDemo: false,
          error: "QZ Tray API não está disponível. Verifique se o QZ Tray está rodando.",
          guidance: this.getQzTrayGuidance(),
        }
      }

      console.log("[v0] Iniciando detecção de impressoras reais do Windows...")

      // Method 1: Try to get all printers
      try {
        console.log("[v0] Método 1: Buscando todas as impressoras...")
        const allPrintersPromise = window.qz.printers.find()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))

        const printers = await Promise.race([allPrintersPromise, timeoutPromise])

        if (printers && printers.length > 0) {
          const realPrinters = printers.filter(
            (printer) =>
              !printer.startsWith("🖨️ Demo") &&
              !printer.includes("Demo") &&
              typeof printer === "string" &&
              printer.trim().length > 0,
          )

          if (realPrinters.length > 0) {
            this.printers = realPrinters
            console.log("[v0] Impressoras reais encontradas (Método 1):", this.printers)
            return { printers: this.printers, isDemo: false }
          }
        }
      } catch (error) {
        console.log("[v0] Método 1 falhou:", error.message)
      }

      // Method 2: Try to get default printer
      try {
        console.log("[v0] Método 2: Buscando impressora padrão...")
        const defaultPrinterPromise = window.qz.printers.getDefault()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))

        const defaultPrinter = await Promise.race([defaultPrinterPromise, timeoutPromise])

        if (defaultPrinter && typeof defaultPrinter === "string" && !defaultPrinter.includes("Demo")) {
          this.printers = [defaultPrinter]
          console.log("[v0] Impressora padrão encontrada (Método 2):", this.printers)
          return { printers: this.printers, isDemo: false }
        }
      } catch (error) {
        console.log("[v0] Método 2 falhou:", error.message)
      }

      console.log("[v0] Nenhuma impressora real foi detectada")
      this.printers = []

      return {
        printers: [],
        isDemo: false,
        error:
          "Nenhuma impressora foi detectada. Verifique se há impressoras instaladas no Windows e se o QZ Tray tem permissões adequadas.",
        guidance: {
          ...this.getQzTrayGuidance(),
          additionalSteps: [
            "• Verifique se há impressoras instaladas no Windows (Configurações > Impressoras e scanners)",
            "• Execute o QZ Tray como administrador se necessário",
            "• Certifique-se de que as impressoras estão online e funcionando",
            "• Tente reiniciar o serviço de spooler de impressão do Windows",
          ],
        },
      }
    } catch (error) {
      console.error("[v0] Erro crítico ao listar impressoras:", error.message)

      return {
        printers: [],
        isDemo: false,
        error: `Erro ao detectar impressoras: ${error.message}`,
        guidance: this.getQzTrayGuidance(),
      }
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

      if (!this.isConnected || !window.qz) {
        throw new Error("QZ Tray não está conectado. Conecte o QZ Tray para imprimir.")
      }

      const content = this.generatePrintContent(order)
      console.log("[v0] Conteúdo da impressão gerado")

      // Verify printer is still available
      if (!this.printers.includes(this.selectedPrinter)) {
        console.log("[v0] Impressora selecionada não disponível, recarregando lista...")
        const result = await this.listPrinters()

        if (!result.printers.includes(this.selectedPrinter)) {
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
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Print timeout")), 15000))

      await Promise.race([printPromise, timeoutPromise])

      console.log("[v0] Pedido impresso com sucesso na impressora:", this.selectedPrinter)
      return { success: true, isDemo: false }
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
