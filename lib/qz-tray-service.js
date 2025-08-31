// Import the qz variable
import qz from "qz-tray"

class QZTrayService {
  constructor() {
    this.isConnected = false
    this.connectionTimeout = 10000 // 10 seconds timeout
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
        console.log("[v0] QZ Tray já está conectado")
        return { success: true }
      }

      console.log("[v0] Desabilitando validação do QZ Tray...")
      qz.security.setCertificatePromise(() => Promise.resolve(null))
      qz.security.setSignaturePromise(() => () => Promise.resolve(null))

      console.log("[v0] Conectando ao QZ Tray...")
      await Promise.race([
        qz.websocket.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), this.connectionTimeout)),
      ])

      this.isConnected = true
      console.log("[v0] QZ Tray conectado com sucesso (modo sem validação)")

      return { success: true }
    } catch (error) {
      this.isConnected = false
      console.error("[v0] Erro ao conectar QZ Tray:", error.message)
      return {
        success: false,
        error: error.message,
        suggestion: "Verifique se o QZ Tray está instalado e rodando",
      }
    }
  }

  async disconnect() {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect()
        console.log("[v0] QZ Tray desconectado")
      }
      this.isConnected = false
      return { success: true }
    } catch (error) {
      console.error("[v0] Erro ao desconectar QZ Tray:", error.message)
      return { success: false, error: error.message }
    }
  }

  async listPrinters() {
    try {
      if (!qz.websocket.isActive()) {
        const connectResult = await this.connect()
        if (!connectResult.success) {
          throw new Error("Não foi possível conectar ao QZ Tray")
        }
      }

      console.log("[v0] Listando impressoras...")
      const printers = await qz.printers.find()
      console.log("[v0] Impressoras encontradas:", printers)

      return { success: true, printers }
    } catch (error) {
      console.error("[v0] Erro ao listar impressoras:", error.message)
      return { success: false, error: error.message, printers: [] }
    }
  }

  async printOrder(order, companyData, printerName) {
    try {
      console.log("[v0] Iniciando impressão do pedido:", order?.id)

      if (!qz.websocket.isActive()) {
        const connectResult = await this.connect()
        if (!connectResult.success) {
          throw new Error("Não foi possível conectar ao QZ Tray")
        }
      }

      const validOrder = {
        id: order?.id || "N/A",
        customer_name: order?.customer_name || "Cliente não informado",
        customer_phone: order?.customer_phone || "",
        customer_address: order?.customer_address || "",
        payment_method: order?.payment_method || "Não informado",
        delivery_fee: order?.delivery_fee || 0,
        total: order?.total || 0,
        observations: order?.observations || "",
        items: Array.isArray(order?.items)
          ? order.items.filter((item) => item && typeof item === "object" && (item.name || item.produto))
          : [],
        created_at: order?.created_at || new Date().toISOString(),
      }

      if (validOrder.items.length === 0) {
        console.warn("[v0] Pedido sem itens válidos, adicionando item padrão")
        validOrder.items = [
          {
            name: "Item não especificado",
            quantity: 1,
            price: validOrder.total || 0,
          },
        ]
      }

      const validCompany = {
        name: companyData?.name || companyData?.razao_social || "Estabelecimento",
        address: companyData?.address || "Endereço não informado",
        phone: companyData?.phone || companyData?.telefone || "",
        cnpj: companyData?.cnpj || "",
      }

      // Generate print content
      const printContent = this.generatePrintContent(validOrder, validCompany)

      const printer = printerName || this.selectedPrinter || (await qz.printers.getDefault())
      console.log("[v0] Usando impressora:", printer)

      // Create print configuration
      const config = qz.configs.create(printer)

      // Print data
      const printData = [
        {
          type: "raw",
          format: "plain",
          data: printContent,
        },
      ]

      await qz.print(config, printData)
      console.log("[v0] Pedido impresso com sucesso!")

      return { success: true }
    } catch (error) {
      console.error("[v0] Erro ao imprimir pedido:", error.message)
      return { success: false, error: error.message }
    }
  }

  generatePrintContent(order, company) {
    const line = "=".repeat(40)
    const halfLine = "-".repeat(40)

    let content = ""

    // Header
    content += `${line}\n`
    if (this.printSettings.showTitle) {
      content += `${company.name.toUpperCase()}\n`
    }
    if (this.printSettings.showAddress && company.address) {
      content += `${company.address}\n`
    }
    if (this.printSettings.showPhone && company.phone) {
      content += `Tel: ${company.phone}\n`
    }
    if (company.cnpj) content += `CNPJ: ${company.cnpj}\n`
    content += `${line}\n\n`

    // Order info
    content += `PEDIDO: ${order.id}\n`
    content += `DATA: ${new Date(order.created_at).toLocaleString("pt-BR")}\n`
    content += `${halfLine}\n\n`

    // Customer info
    content += `CLIENTE: ${order.customer_name}\n`
    if (order.customer_phone) content += `TELEFONE: ${order.customer_phone}\n`
    if (order.customer_address) content += `ENDERECO: ${order.customer_address}\n`
    content += `${halfLine}\n\n`

    // Items
    content += `ITENS:\n`
    if (Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          console.warn(`[v0] Item inválido no índice ${index}:`, item)
          return
        }

        const itemName = item.name || item.produto || `Item ${index + 1}`
        const itemQty = Number(item.quantity || item.quantidade || 1)
        const itemPrice = Number(item.price || item.preco || 0)
        const itemTotal = itemQty * itemPrice

        content += `${itemQty}x ${itemName}\n`
        content += `   R$ ${itemPrice.toFixed(2)} = R$ ${itemTotal.toFixed(2)}\n\n`
      })
    } else {
      content += `Nenhum item encontrado\n\n`
    }

    content += `${halfLine}\n`

    // Totals
    if (order.delivery_fee > 0) {
      content += `Taxa de Entrega: R$ ${order.delivery_fee.toFixed(2)}\n`
    }
    content += `TOTAL: R$ ${order.total.toFixed(2)}\n`
    content += `PAGAMENTO: ${order.payment_method}\n`

    if (order.observations) {
      content += `${halfLine}\n`
      content += `OBSERVACOES:\n${order.observations}\n`
    }

    content += `${line}\n`
    content += `Obrigado pela preferencia!\n`
    content += `${line}\n\n\n`

    content += "\x1D\x56\x42\x00" // Full cut command

    return content
  }

  async testPrint(printerName) {
    try {
      if (!qz.websocket.isActive()) {
        const connectResult = await this.connect()
        if (!connectResult.success) {
          throw new Error("Não foi possível conectar ao QZ Tray")
        }
      }

      const printer = printerName || (await qz.printers.getDefault())
      const config = qz.configs.create(printer)

      const testContent = `
========================================
           TESTE DE IMPRESSAO
========================================

Data: ${new Date().toLocaleString("pt-BR")}
Impressora: ${printer}

Este é um teste de impressão.
Se você consegue ler esta mensagem,
a impressora está funcionando corretamente.

========================================
              QZ TRAY
========================================


`

      const printData = [
        {
          type: "raw",
          format: "plain",
          data: testContent + "\x1D\x56\x42\x00", // Add paper cut
        },
      ]

      await qz.print(config, printData)
      console.log("[v0] Teste de impressão enviado com sucesso!")

      return { success: true }
    } catch (error) {
      console.error("[v0] Erro no teste de impressão:", error.message)
      return { success: false, error: error.message }
    }
  }

  getStatus() {
    return {
      connected: this.isConnected && qz.websocket.isActive(),
      version: qz.version || "Desconhecida",
      mode: "Sem validação (modo inseguro)",
    }
  }

  isQzTrayConnected() {
    return this.isConnected && qz.websocket.isActive()
  }

  setSelectedPrinter(printerName) {
    this.selectedPrinter = printerName
    console.log("[v0] Impressora padrão definida:", printerName)
  }

  updatePrintSettings(settings) {
    this.printSettings = { ...this.printSettings, ...settings }
    console.log("[v0] Configurações de impressão atualizadas:", this.printSettings)
  }

  getSelectedPrinter() {
    return this.selectedPrinter
  }

  getPrintSettings() {
    return this.printSettings
  }
}

const qzTrayService = new QZTrayService()
export default qzTrayService
