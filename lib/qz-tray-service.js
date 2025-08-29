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

      qz.security.setCertificatePromise(() => {
        return new Promise((resolve) => {
          // Mock certificate for development
          resolve("-----BEGIN CERTIFICATE-----\nMIIE...DEMO...CERTIFICATE\n-----END CERTIFICATE-----")
        })
      })

      qz.security.setSignaturePromise((toSign) => {
        return new Promise((resolve) => {
          // Mock signature for development
          resolve(toSign)
        })
      })

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
      this.isConnected = false

      let errorMessage = error.message
      if (error.message.includes("timeout")) {
        errorMessage = "QZ Tray não respondeu. Verifique se está instalado e rodando."
      } else if (error.message.includes("Connection closed")) {
        errorMessage = "QZ Tray service não está rodando. Por favor, inicie o QZ Tray."
      }

      if (!error.message.includes("timeout")) {
        console.error("[v0] Erro ao conectar QZ Tray:", error.message)
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
    if (!order || typeof order !== "object") {
      console.error("[v0] Order data is invalid:", order)
      throw new Error("Dados do pedido inválidos para impressão")
    }

    if (!Array.isArray(order.items)) {
      order.items = []
    }

    const validCompanyData = companyData || {}

    // ESC/POS commands for UTF-8 encoding and font setup
    let content = "\x1B\x40" // Initialize printer
    content += "\x1B\x52\x0A" // Select character table for Portuguese/Latin America
    content += "\x1B\x74\x13" // Select UTF-8 encoding
    content += "\x1B\x21\x00" // Select font A (Courier New equivalent)

    // Header section
    if (this.printSettings.showLogo) {
      content += "\x1B\x45\x01" // Bold on
      content += "\x1B\x61\x01" // Center align
      content += "🍔 LOGO DA EMPRESA\n"
      content += "\x1B\x45\x00" // Bold off
      content += "\x1B\x61\x00" // Left align
      content += "================================\n"
    }

    if (this.printSettings.showTitle) {
      content += "\x1B\x45\x01" // Bold on
      content += "\x1B\x61\x01" // Center align
      content += `${validCompanyData?.nome || "RESTAURANTE"}\n`
      content += "\x1B\x45\x00" // Bold off
      content += "\x1B\x61\x00" // Left align
    }

    if (this.printSettings.showAddress && validCompanyData?.endereco) {
      content += "\x1B\x61\x01" // Center align
      content += `${validCompanyData.endereco}\n`
      content += "\x1B\x61\x00" // Left align
    }

    if (this.printSettings.showPhone && validCompanyData?.telefone) {
      content += "\x1B\x61\x01" // Center align
      content += `Tel: ${validCompanyData.telefone}\n`
      content += "\x1B\x61\x00" // Left align
    }

    content += "================================\n\n"

    // Order header with number
    content += "\x1B\x45\x01" // Bold on
    content += "\x1B\x61\x01" // Center align
    content += `PEDIDO #${order.id || order.order_number || "TESTE"}\n`
    content += "\x1B\x45\x00" // Bold off
    content += "\x1B\x61\x00" // Left align
    content += `Data: ${new Date().toLocaleDateString("pt-BR")}\n`
    content += `Hora: ${new Date().toLocaleTimeString("pt-BR")}\n`
    content += "================================\n\n"

    // Customer information
    content += "\x1B\x45\x01" // Bold on
    content += "DADOS DO CLIENTE:\n"
    content += "\x1B\x45\x00" // Bold off
    content += `Nome: ${order.customerName || order.customer_name || "Cliente Teste"}\n`
    content += `Telefone: ${order.customerPhone || order.phone || "(11) 99999-9999"}\n`

    if (order.customerAddress || order.address) {
      content += `Endereço: ${order.customerAddress || order.address}\n`
    }

    if (order.customerNeighborhood || order.neighborhood) {
      content += `Bairro: ${order.customerNeighborhood || order.neighborhood}\n`
    }

    if (order.customerReference || order.reference) {
      content += `Referência: ${order.customerReference || order.reference}\n`
    }

    content += "\n================================\n"
    content += "\x1B\x45\x01" // Bold on
    content += "ITENS DO PEDIDO:\n"
    content += "\x1B\x45\x00" // Bold off
    content += "--------------------------------\n"

    // Items with proper spacing
    if (Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          return // Skip invalid items
        }

        const validItem = {
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          name: item.name || "Item sem nome",
          price: typeof item.price === "number" ? item.price : 0,
          observations: item.observations || "",
        }

        content += `${validItem.quantity}x ${validItem.name}\n`
        content += `    Valor unit.: R$ ${validItem.price.toFixed(2)}\n`
        content += `    Subtotal: R$ ${(validItem.price * validItem.quantity).toFixed(2)}\n`

        if (validItem.observations.trim()) {
          content += `    OBS: ${validItem.observations}\n`
        }

        // Add spacing between items
        if (index < order.items.length - 1) {
          content += "\n"
        }
      })
    } else {
      content += "Nenhum item encontrado\n"
    }

    content += "\n--------------------------------\n"

    // Totals section
    if (order.subtotal) {
      content += `Subtotal: R$ ${order.subtotal.toFixed(2)}\n`
    }

    if (order.deliveryFee && order.deliveryFee > 0) {
      content += `Taxa de entrega: R$ ${order.deliveryFee.toFixed(2)}\n`
    }

    if (order.discount && order.discount > 0) {
      content += `Desconto: -R$ ${order.discount.toFixed(2)}\n`
    }

    content += "--------------------------------\n"
    content += "\x1B\x45\x01" // Bold on
    content += "\x1B\x21\x10" // Double height
    content += `TOTAL: R$ ${(order.total || 0).toFixed(2)}\n`
    content += "\x1B\x21\x00" // Normal size
    content += "\x1B\x45\x00" // Bold off
    content += "--------------------------------\n\n"

    // Payment information
    if (order.paymentMethod || order.payment_method) {
      content += "\x1B\x45\x01" // Bold on
      content += "FORMA DE PAGAMENTO:\n"
      content += "\x1B\x45\x00" // Bold off
      content += `${order.paymentMethod || order.payment_method}\n`

      if (order.changeFor && order.changeFor > 0) {
        content += `Troco para: R$ ${order.changeFor.toFixed(2)}\n`
        content += `Troco: R$ ${(order.changeFor - (order.total || 0)).toFixed(2)}\n`
      }
      content += "\n"
    }

    // Order observations
    if (order.observations && order.observations.trim()) {
      content += "\x1B\x45\x01" // Bold on
      content += "OBSERVAÇÕES DO PEDIDO:\n"
      content += "\x1B\x45\x00" // Bold off
      content += `${order.observations}\n\n`
    }

    // Delivery information
    if (order.deliveryType) {
      content += "\x1B\x45\x01" // Bold on
      content += "TIPO DE ENTREGA:\n"
      content += "\x1B\x45\x00" // Bold off
      content += `${order.deliveryType}\n`

      if (order.estimatedTime) {
        content += `Tempo estimado: ${order.estimatedTime}\n`
      }
      content += "\n"
    }

    // Footer
    content += "================================\n"
    content += "\x1B\x61\x01" // Center align
    content += "Obrigado pela preferência!\n"
    content += "Volte sempre!\n"
    content += "\x1B\x61\x00" // Left align
    content += "================================\n\n"

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
      "{{empresa_endereco}}": companyData?.endereco || "Rua das Flores, 123 - Centro",
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
    if (!Array.isArray(items) || items.length === 0) {
      return "Nenhum item"
    }

    return items
      .filter((item) => item && typeof item === "object") // Filter out invalid items
      .map((item) => {
        const validItem = {
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          name: item.name || "Item sem nome",
          price: typeof item.price === "number" ? item.price : 0,
        }

        return `${validItem.quantity}x ${validItem.name} - R$ ${(validItem.price * validItem.quantity).toFixed(2)}`
      })
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

      if (!order || typeof order !== "object") {
        throw new Error("Dados do pedido inválidos")
      }

      // Ensure companyData is an object
      const validCompanyData = companyData || {}

      // Ensure order has required properties with defaults
      const validOrder = {
        id: order.id || order.order_number || "TESTE",
        customerName: order.customerName || order.customer_name || "Cliente",
        customerPhone: order.customerPhone || order.phone || "",
        customerAddress: order.customerAddress || order.address || "",
        customerNeighborhood: order.customerNeighborhood || order.neighborhood || "",
        customerReference: order.customerReference || order.reference || "",
        items: Array.isArray(order.items) ? order.items : [],
        subtotal: typeof order.subtotal === "number" ? order.subtotal : 0,
        deliveryFee: typeof order.deliveryFee === "number" ? order.deliveryFee : 0,
        discount: typeof order.discount === "number" ? order.discount : 0,
        total: typeof order.total === "number" ? order.total : 0,
        paymentMethod: order.paymentMethod || order.payment_method || "",
        changeFor: typeof order.changeFor === "number" ? order.changeFor : 0,
        observations: order.observations || "",
        deliveryType: order.deliveryType || "",
        estimatedTime: order.estimatedTime || "",
      }

      const content = this.generatePrintContent(validOrder, validCompanyData)

      const config = qz.configs.create(this.selectedPrinter, {
        encoding: "UTF-8",
        jobName: `Pedido ${validOrder.id}`,
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

  generatePreviewContent(order, companyData) {
    const { showLogo, showTitle, showAddress, showPhone } = this.printSettings

    let content = ""

    // Header section
    if (showLogo) {
      content += "🍔 LOGO DA EMPRESA\n"
      content += "================================\n"
    }

    if (showTitle) {
      content += `${companyData?.nome || "RESTAURANTE"}\n`
    }

    if (showAddress && companyData?.endereco) {
      content += `${companyData.endereco}\n`
    }

    if (showPhone && companyData?.telefone) {
      content += `Tel: ${companyData.telefone}\n`
    }

    content += "================================\n\n"

    // Order information
    content += `PEDIDO #${order.id || order.order_number || "TESTE"}\n`
    content += `Data: ${new Date().toLocaleDateString("pt-BR")}\n`
    content += `Hora: ${new Date().toLocaleTimeString("pt-BR")}\n`
    content += "================================\n\n"

    // Customer information
    content += "DADOS DO CLIENTE:\n"
    content += `Nome: ${order.customerName || order.customer_name || "Cliente Teste"}\n`
    content += `Telefone: ${order.customerPhone || order.phone || "(11) 99999-9999"}\n`

    if (order.customerAddress || order.address) {
      content += `Endereço: ${order.customerAddress || order.address}\n`
    }

    content += "\n================================\n"
    content += "ITENS DO PEDIDO:\n"
    content += "--------------------------------\n"

    // Items
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        content += `${item.quantity || 1}x ${item.name}\n`
        content += `    Valor unit.: R$ ${(item.price || 0).toFixed(2)}\n`
        content += `    Subtotal: R$ ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}\n`

        if (item.observations && item.observations.trim()) {
          content += `    OBS: ${item.observations}\n`
        }

        if (index < order.items.length - 1) {
          content += "\n"
        }
      })
    } else {
      content += "Nenhum item encontrado\n"
    }

    content += "\n--------------------------------\n"

    // Totals
    if (order.subtotal) {
      content += `Subtotal: R$ ${order.subtotal.toFixed(2)}\n`
    }

    if (order.deliveryFee && order.deliveryFee > 0) {
      content += `Taxa de entrega: R$ ${order.deliveryFee.toFixed(2)}\n`
    }

    content += "--------------------------------\n"
    content += `TOTAL: R$ ${(order.total || 0).toFixed(2)}\n`
    content += "--------------------------------\n\n"

    // Payment
    if (order.paymentMethod || order.payment_method) {
      content += "FORMA DE PAGAMENTO:\n"
      content += `${order.paymentMethod || order.payment_method}\n\n`
    }

    // Footer
    content += "================================\n"
    content += "Obrigado pela preferência!\n"
    content += "Volte sempre!\n"
    content += "================================\n"

    return content
  }
}

// Export singleton instance
const qzTrayService = new QZTrayService()
export default qzTrayService
