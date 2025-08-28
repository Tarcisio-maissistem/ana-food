// QZ Tray Service using NPM package approach (no script injection)
import qz from "qz-tray"

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

  async connect() {
    try {
      if (qz.websocket.isActive()) {
        this.isConnected = true
        return { success: true }
      }

      const connectPromise = qz.websocket.connect()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 10000),
      )

      await Promise.race([connectPromise, timeoutPromise])

      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (!qz.websocket.isActive()) {
        throw new Error("Falha ao estabelecer conexão com QZ Tray")
      }

      this.isConnected = true
      return { success: true }
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      this.isConnected = false

      let errorMessage = error.message
      if (error.message.includes("timeout") || error.message.includes("Connection closed")) {
        errorMessage = "QZ Tray service não está rodando. Por favor, inicie o QZ Tray."
      }

      const guidance = {
        isInstalled: false,
        downloadUrl: "https://qz.io/download/",
        instructions: [
          "1. Baixe o QZ Tray em: https://qz.io/download/",
          "2. Instale o aplicativo no seu computador",
          "3. Execute o QZ Tray (deve aparecer na bandeja do sistema)",
          "4. Certifique-se de que o QZ Tray está rodando (porta 8182 ou 8181)",
          "5. Recarregue esta página para tentar conectar novamente",
        ],
      }

      return { success: false, error: errorMessage, guidance }
    }
  }

  async listPrinters() {
    try {
      // Ensure connection is active
      if (!qz.websocket.isActive()) {
        const connectionResult = await this.connect()
        if (!connectionResult || connectionResult.success === false) {
          return {
            printers: [],
            isDemo: false,
            error: "QZ Tray não está conectado",
            guidance: connectionResult?.guidance,
          }
        }
      }

      const printers = await qz.printers.find()

      // Validate printers result
      if (!Array.isArray(printers)) {
        console.error("[v0] Resultado de impressoras não é um array:", typeof printers)
        return {
          printers: [],
          isDemo: false,
          error: "Formato inválido de resposta das impressoras",
        }
      }

      if (printers.length > 0) {
        this.printers = printers
        console.log("[v0] Impressoras detectadas:", printers.length)
        return { printers: this.printers, isDemo: false }
      } else {
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
  }

  updatePrintSettings(settings) {
    this.printSettings = { ...this.printSettings, ...settings }
  }

  generatePrintContent(order, companyData) {
    const { showLogo, showTitle, showAddress, showPhone } = this.printSettings

    let content = ""

    if (showLogo) {
      content += "================================\n"
      content += "         🍔 LOGO\n"
      content += "================================\n\n"
    }

    if (showTitle) {
      content += `${companyData?.nome || "RESTAURANTE"}\n`
      content += "================================\n\n"
    }

    if (showAddress && companyData?.rua) {
      content += `${companyData.rua}\n`
    }

    if (showPhone && companyData?.telefone) {
      content += `Tel: ${companyData.telefone}\n`
    }

    content += "\n================================\n"
    content += `PEDIDO #${order.id || "TESTE"}\n`
    content += `Data: ${new Date().toLocaleString("pt-BR")}\n`
    content += "================================\n\n"

    content += `Cliente: ${order.customerName || order.customer_name || "Cliente Teste"}\n`
    content += `Telefone: ${order.customerPhone || order.phone || "(11) 99999-9999"}\n`

    if (order.customerAddress || order.address) {
      content += `Endereço: ${order.customerAddress || order.address}\n`
    }

    content += "\nITENS:\n"
    content += "--------------------------------\n"

    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        content += `${item.quantity || 1}x ${item.name}\n`
        content += `   R$ ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}\n`
        if (item.observations) {
          content += `   OBS: ${item.observations}\n`
        }
        content += "\n"
      })
    }

    content += "--------------------------------\n"

    if (order.subtotal) {
      content += `Subtotal: R$ ${order.subtotal.toFixed(2)}\n`
    }

    if (order.deliveryFee && order.deliveryFee > 0) {
      content += `Entrega: R$ ${order.deliveryFee.toFixed(2)}\n`
    }

    content += `TOTAL: R$ ${order.total?.toFixed(2) || "0,00"}\n\n`

    if (order.paymentMethod) {
      content += `Pagamento: ${order.paymentMethod}\n\n`
    }

    if (order.observations) {
      content += "OBSERVAÇÕES:\n"
      content += `${order.observations}\n\n`
    }

    content += "================================\n"
    content += "    Obrigado pela preferência!\n"
    content += "================================\n"

    return content
  }

  async printOrder(order, companyData) {
    try {
      if (!this.selectedPrinter) {
        throw new Error("Nenhuma impressora selecionada")
      }

      if (!qz.websocket.isActive()) {
        throw new Error("QZ Tray não está conectado")
      }

      const content = this.generatePrintContent(order, companyData)

      const config = qz.configs.create(this.selectedPrinter)
      const data = [
        {
          type: "raw",
          format: "plain",
          data: content,
        },
      ]

      await qz.print(config, data)
      return { success: true, isDemo: false }
    } catch (error) {
      console.error("[v0] Erro ao imprimir pedido:", error.message)
      throw error
    }
  }

  async testPrint(companyData) {
    const testOrder = {
      id: "TESTE-001",
      customerName: "Cliente Teste",
      customerPhone: "(11) 99999-9999",
      customerAddress: "Rua Exemplo, 123 - Centro",
      items: [
        { name: "Hambúrguer Especial", quantity: 1, price: 25.0, observations: "Sem cebola" },
        { name: "Batata Frita", quantity: 1, price: 12.0, observations: "" },
      ],
      subtotal: 37.0,
      deliveryFee: 5.0,
      total: 42.0,
      paymentMethod: "Dinheiro",
      observations: "Entregar no portão azul",
    }

    return await this.printOrder(testOrder, companyData)
  }

  isQzTrayConnected() {
    return this.isConnected && qz.websocket.isActive()
  }

  async disconnect() {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect()
      }
      this.isConnected = false
    } catch (error) {
      console.error("[v0] Erro ao desconectar QZ Tray:", error)
    }
  }
}

// Export singleton instance
const qzTrayService = new QZTrayService()
export default qzTrayService
