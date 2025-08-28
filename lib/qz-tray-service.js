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
    this.printLayout = null
  }

  async connect() {
    try {
      if (qz.websocket.isActive()) {
        this.isConnected = true
        return { success: true }
      }

      const connectPromise = qz.websocket.connect()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 20000),
      )

      await Promise.race([connectPromise, timeoutPromise])

      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (!qz.websocket.isActive()) {
        throw new Error("Falha ao estabelecer conexão com QZ Tray")
      }

      this.isConnected = true
      return { success: true }
    } catch (error) {
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      this.isConnected = false

      let errorMessage = error.message
      if (error.message.includes("timeout")) {
        errorMessage = "QZ Tray demorou para responder. Verifique se está rodando e tente novamente."
      } else if (error.message.includes("Connection closed")) {
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
          "5. Aguarde alguns segundos e tente conectar novamente",
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

  updatePrintLayout(layout) {
    this.printLayout = layout
  }

  generatePrintContent(order, companyData) {
    if (this.printLayout) {
      return this.generateLayoutBasedContent(order, companyData)
    }

    // Fallback to simple content generation
    const { showLogo, showTitle, showAddress, showPhone } = this.printSettings

    // ESC/POS commands for UTF-8 encoding and font setup
    let content = "\x1B\x40" // Initialize printer
    content += "\x1B\x52\x0A" // Select character table for Portuguese/Latin America
    content += "\x1B\x74\x13" // Select UTF-8 encoding

    if (showLogo) {
      content += "\x1B\x45\x01" // Bold on
      content += "\x1B\x61\x01" // Center align
      content += "🍔 LOGO DA EMPRESA\n"
      content += "\x1B\x45\x00" // Bold off
      content += "\x1B\x61\x00" // Left align
      content += "================================\n\n"
    }

    if (showTitle) {
      content += "\x1B\x45\x01" // Bold on
      content += "\x1B\x61\x01" // Center align
      content += `${companyData?.nome || "RESTAURANTE"}\n`
      content += "\x1B\x45\x00" // Bold off
      content += "\x1B\x61\x00" // Left align
      content += "================================\n\n"
    }

    if (showAddress && companyData?.rua) {
      content += "\x1B\x61\x01" // Center align
      content += `${companyData.rua}\n`
      content += "\x1B\x61\x00" // Left align
    }

    if (showPhone && companyData?.telefone) {
      content += "\x1B\x61\x01" // Center align
      content += `Tel: ${companyData.telefone}\n`
      content += "\x1B\x61\x00" // Left align
    }

    content += "\n================================\n"
    content += "\x1B\x45\x01" // Bold on
    content += `PEDIDO #${order.id || "TESTE"}\n`
    content += "\x1B\x45\x00" // Bold off
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

    content += "\x1B\x45\x01" // Bold on
    content += `TOTAL: R$ ${order.total?.toFixed(2) || "0,00"}\n\n`
    content += "\x1B\x45\x00" // Bold off

    if (order.paymentMethod) {
      content += `Pagamento: ${order.paymentMethod}\n\n`
    }

    if (order.observations) {
      content += "OBSERVAÇÕES:\n"
      content += `${order.observations}\n\n`
    }

    content += "================================\n"
    content += "\x1B\x61\x01" // Center align
    content += "Obrigado pela preferência!\n"
    content += "\x1B\x61\x00" // Left align
    content += "================================\n"

    content += "\x1D\x56\x42\x00" // Full cut

    return content
  }

  generateLayoutBasedContent(order, companyData) {
    const layout = this.printLayout

    // ESC/POS commands for UTF-8 encoding and font setup
    let content = "\x1B\x40" // Initialize printer
    content += "\x1B\x52\x0A" // Select character table for Portuguese/Latin America
    content += "\x1B\x74\x13" // Select UTF-8 encoding

    const sampleData = {
      "{{empresa_nome}}": companyData?.nome || "Restaurante Exemplo",
      "{{empresa_endereco}}": companyData?.rua || "Rua das Flores, 123 - Centro",
      "{{empresa_telefone}}": companyData?.telefone || "(11) 99999-9999",
      "{{data}}": new Date().toLocaleDateString("pt-BR"),
      "{{hora}}": new Date().toLocaleTimeString("pt-BR"),
      "{{cliente_nome}}": order.customerName || order.customer_name || "Cliente Teste",
      "{{itens_pedido}}": this.formatOrderItems(order.items || []),
      "{{valor_total}}": (order.total || 0).toFixed(2),
    }

    Object.entries(layout.sections).forEach(([key, section]) => {
      if (!section.enabled) return

      // Apply formatting
      if (section.bold) content += "\x1B\x45\x01" // Bold on

      // Apply alignment
      if (section.align === "center") content += "\x1B\x61\x01"
      else if (section.align === "right") content += "\x1B\x61\x02"
      else content += "\x1B\x61\x00" // Left align

      // Replace placeholders and add content
      let text = section.text
      Object.entries(sampleData).forEach(([placeholder, value]) => {
        text = text.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value)
      })

      content += text + "\n"

      // Reset formatting
      if (section.bold) content += "\x1B\x45\x00" // Bold off
      content += "\x1B\x61\x00" // Left align
    })

    // Add paper cut command
    content += "\x1D\x56\x42\x00" // Full cut

    return content
  }

  formatOrderItems(items) {
    if (!items || items.length === 0) return "Nenhum item"

    return items
      .map(
        (item) => `${item.quantity || 1}x ${item.name} - R$ ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`,
      )
      .join("\n")
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

      const config = qz.configs.create(this.selectedPrinter, {
        encoding: "UTF-8",
        jobName: `Pedido ${order.id || "TESTE"}`,
      })

      const data = [
        {
          type: "raw",
          format: "plain",
          data: content,
          options: {
            language: "ESCPOS",
          },
        },
      ]

      await qz.print(config, data)
      return { success: true, isDemo: false }
    } catch (error) {
      console.error("[v0] Erro ao imprimir pedido:", error.message)
      throw error
    }
  }

  async testPrintWithLayout(layout, companyData) {
    const originalLayout = this.printLayout
    this.printLayout = layout

    try {
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
    } finally {
      this.printLayout = originalLayout
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
