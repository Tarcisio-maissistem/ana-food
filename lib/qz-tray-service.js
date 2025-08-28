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
      console.log("[v0] Iniciando conexão QZ Tray...")

      if (qz.websocket.isActive()) {
        console.log("[v0] QZ Tray já está conectado")
        this.isConnected = true
        return { success: true }
      }

      await qz.websocket.connect()

      if (!qz.websocket.isActive()) {
        throw new Error("Falha ao estabelecer conexão com QZ Tray")
      }

      this.isConnected = true
      console.log("[v0] QZ Tray conectado com sucesso")
      return { success: true }
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
          "4. Certifique-se de que o QZ Tray está rodando (porta 8182 ou 8181)",
          "5. Recarregue esta página para tentar conectar novamente",
        ],
      }

      return { success: false, error: error.message, guidance }
    }
  }

  async listPrinters() {
    try {
      console.log("[v0] Iniciando listagem de impressoras...")

      // Ensure connection is active
      if (!qz.websocket.isActive()) {
        console.log("[v0] QZ Tray não conectado, tentando conectar...")
        const connectionResult = await this.connect()
        if (!connectionResult || connectionResult.success === false) {
          console.log("[v0] Falha na conexão QZ Tray")
          return {
            printers: [],
            isDemo: false,
            error: "QZ Tray não está conectado",
            guidance: connectionResult?.guidance,
          }
        }
      }

      console.log("[v0] Buscando impressoras do Windows...")

      const printers = await qz.printers.find()

      console.log("[v0] Resultado da busca de impressoras:", printers)

      // Validate printers result
      if (!Array.isArray(printers)) {
        console.warn("[v0] Resultado de impressoras não é um array:", typeof printers)
        return {
          printers: [],
          isDemo: false,
          error: "Formato inválido de resposta das impressoras",
        }
      }

      if (printers.length > 0) {
        this.printers = printers
        console.log("[v0] Total de impressoras detectadas:", printers.length)
        console.log("[v0] Impressoras encontradas:", printers)
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

    content += `Cliente: ${order.customerName || order.customer_name || "Cliente Teste"}\n`
    content += `Telefone: ${order.customerPhone || order.phone || "(11) 99999-9999"}\n\n`

    content += "ITENS:\n"
    content += "--------------------------------\n"

    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        content += `${item.quantity}x ${item.name}\n`
        content += `   R$ ${item.price.toFixed(2)}\n`
        if (item.observations) {
          content += `   OBS: ${item.observations}\n`
        }
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
      content += `${order.customerAddress || order.address || "Rua Exemplo, 123 - Centro"}\n\n`
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

      if (!qz.websocket.isActive()) {
        throw new Error("QZ Tray não está conectado")
      }

      const content = this.generatePrintContent(order)
      console.log("[v0] Imprimindo pedido na impressora:", this.selectedPrinter)

      const config = qz.configs.create(this.selectedPrinter)
      const data = [
        {
          type: "raw",
          format: "plain",
          data: content,
        },
      ]

      await qz.print(config, data)
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
      customerName: "Cliente Teste",
      customerPhone: "(11) 99999-9999",
      customerAddress: "Rua Exemplo, 123 - Centro",
      items: [
        { name: "Hambúrguer Especial", quantity: 1, price: 25.0 },
        { name: "Batata Frita", quantity: 1, price: 12.0 },
      ],
      total: "37,00",
    }

    return await this.printOrder(testOrder)
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
      console.log("[v0] QZ Tray desconectado")
    } catch (error) {
      console.error("[v0] Erro ao desconectar QZ Tray:", error)
    }
  }
}

// Export singleton instance
const qzTrayService = new QZTrayService()
export default qzTrayService
