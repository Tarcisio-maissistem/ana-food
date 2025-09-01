// Import the qz variable
import qz from "qz-tray"

class QZTraySilentService {
  constructor() {
    this.isConnected = false
    this.connectionTimeout = 15000 // Increased timeout for slower systems
    this.selectedPrinter = null
    this.printSettings = {
      showLogo: true,
      showTitle: true,
      showAddress: true,
      showPhone: true,
    }
    this.isInitialized = false
    this.silentMode = true
    this.maxRetries = 3
    this.retryDelay = 2000
  }

  async initialize() {
    if (this.isInitialized) return { success: true }

    try {
      console.log("[v0] Inicializando QZ Tray em modo silencioso...")

      // Configuração completa de segurança desabilitada
      this.setupSecurityBypass()

      // Conectar automaticamente sem prompts
      await this.connect()

      this.isInitialized = true
      return { success: true }
    } catch (error) {
      console.error("[v0] Erro na inicialização silenciosa:", error.message)
      return { success: false, error: error.message }
    }
  }

  setupSecurityBypass() {
    try {
      qz.security.setCertificatePromise(() => null)
      qz.security.setSignaturePromise(() => null)

      // Configurações adicionais para modo silencioso
      if (qz.security.setTrustPromise) {
        qz.security.setTrustPromise(() => true)
      }

      // Desabilitar timeouts desnecessários
      if (qz.websocket.setKeepAlive) {
        qz.websocket.setKeepAlive(true)
      }

      console.log("[v0] Bypass de segurança configurado - modo silencioso ativado")
    } catch (error) {
      console.warn("[v0] Algumas configurações de bypass podem não estar disponíveis:", error.message)
    }
  }

  async connect() {
    try {
      // Se já conectado, retorna sucesso
      if (qz.websocket.isActive()) {
        this.isConnected = true
        console.log("[v0] QZ Tray já conectado (silencioso)")
        return { success: true }
      }

      console.log("[v0] Conectando QZ Tray em modo silencioso...")

      // Configurar bypass de segurança antes da conexão
      this.setupSecurityBypass()

      let lastError = null
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`[v0] Tentativa de conexão ${attempt}/${this.maxRetries}`)

          // Conectar com timeout aumentado
          await Promise.race([
            qz.websocket.connect(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Connection timeout")), this.connectionTimeout),
            ),
          ])

          this.isConnected = true
          console.log("[v0] QZ Tray conectado silenciosamente")

          // Auto-detectar impressora se não definida
          await this.autoSelectPrinter()

          return { success: true }
        } catch (error) {
          lastError = error
          console.warn(`[v0] Tentativa ${attempt} falhou:`, error.message)

          if (attempt < this.maxRetries) {
            console.log(`[v0] Aguardando ${this.retryDelay}ms antes da próxima tentativa...`)
            await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
          }
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      this.isConnected = false
      console.error("[v0] Todas as tentativas de conexão falharam")

      return {
        success: false,
        error: lastError?.message || "Connection failed",
        suggestion: this.getConnectionSuggestion(lastError),
      }
    } catch (error) {
      this.isConnected = false
      console.error("[v0] Erro na conexão silenciosa:", error.message)
      return {
        success: false,
        error: error.message,
        suggestion: this.getConnectionSuggestion(error),
      }
    }
  }

  async autoSelectPrinter() {
    try {
      if (!this.selectedPrinter) {
        const printers = await qz.printers.find()
        if (printers && printers.length > 0) {
          this.selectedPrinter = printers[0]
          console.log("[v0] Impressora selecionada automaticamente:", this.selectedPrinter)
        }
      }
    } catch (error) {
      console.warn("[v0] Erro ao selecionar impressora automaticamente:", error.message)
    }
  }

  async ensureConnection() {
    if (!qz.websocket.isActive()) {
      console.log("[v0] Reconectando automaticamente...")
      const result = await this.connect()
      if (!result.success) {
        console.error("[v0] Falha na reconexão:", result.error)
        return false
      }
    }
    return qz.websocket.isActive()
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
      await this.ensureConnection()

      console.log("[v0] Listando impressoras silenciosamente...")
      const printers = await qz.printers.find()
      console.log("[v0] Impressoras encontradas:", printers)

      return { success: true, printers: printers || [] }
    } catch (error) {
      console.error("[v0] Erro ao listar impressoras:", error.message)
      return { success: false, error: error.message, printers: [] }
    }
  }

  async printOrderSilent(order, companyData, printerName = null) {
    try {
      console.log("[v0] Iniciando impressão silenciosa do pedido:", order?.id)

      // Garantir conexão ativa
      await this.ensureConnection()

      // Validar e preparar dados do pedido
      const validOrder = this.validateOrderData(order)
      const validCompany = this.validateCompanyData(companyData)

      // Selecionar impressora (prioridade: parâmetro > selecionada > padrão)
      const targetPrinter = printerName || this.selectedPrinter || (await qz.printers.getDefault())

      if (!targetPrinter) {
        throw new Error("Nenhuma impressora disponível")
      }

      console.log("[v0] Imprimindo silenciosamente na impressora:", targetPrinter)

      // Gerar conteúdo de impressão
      const printContent = this.generatePrintContent(validOrder, validCompany)

      // Configurar impressão
      const config = qz.configs.create(targetPrinter, {
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        orientation: "portrait",
      })

      // Dados para impressão
      const printData = [
        {
          type: "raw",
          format: "plain",
          data: printContent,
        },
      ]

      // Executar impressão silenciosa
      await qz.print(config, printData)

      console.log("[v0] Pedido impresso silenciosamente com sucesso!")
      return { success: true, printer: targetPrinter }
    } catch (error) {
      console.error("[v0] Erro na impressão silenciosa:", error.message)
      return { success: false, error: error.message }
    }
  }

  validateOrderData(order) {
    return {
      id: order?.id || order?.numero_pedido || `PED-${Date.now()}`,
      customer_name: order?.customer_name || order?.nome_cliente || "Cliente não informado",
      customer_phone: order?.customer_phone || order?.telefone || "",
      customer_address: order?.customer_address || order?.endereco || "",
      payment_method: order?.payment_method || order?.pagamento || "Não informado",
      delivery_fee: Number(order?.delivery_fee || order?.taxa_entrega || 0),
      total: Number(order?.total || 0),
      observations: order?.observations || order?.observacoes || "",
      items: this.validateOrderItems(order?.items || order?.itens || []),
      created_at: order?.created_at || new Date().toISOString(),
    }
  }

  validateOrderItems(items) {
    if (!Array.isArray(items)) return []

    return items
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        name: item.name || item.nome || item.produto || "Item",
        quantity: Number(item.quantity || item.quantidade || 1),
        price: Number(item.price || item.preco || 0),
        observations: item.observations || item.observacoes || "",
      }))
  }

  validateCompanyData(company) {
    return {
      name: company?.name || company?.razao_social || "Estabelecimento",
      address: company?.address || company?.endereco || "Endereço não informado",
      phone: company?.phone || company?.telefone || "",
      cnpj: company?.cnpj || "",
    }
  }

  generatePrintContent(order, company) {
    const line = "=".repeat(40)
    const halfLine = "-".repeat(40)
    let content = ""

    // Cabeçalho da empresa
    content += `${line}\n`
    if (this.printSettings.showTitle && company.name) {
      content += `${company.name.toUpperCase()}\n`
    }
    if (this.printSettings.showAddress && company.address) {
      content += `${company.address}\n`
    }
    if (this.printSettings.showPhone && company.phone) {
      content += `Tel: ${company.phone}\n`
    }
    if (company.cnpj) {
      content += `CNPJ: ${company.cnpj}\n`
    }
    content += `${line}\n\n`

    // Informações do pedido
    content += `PEDIDO: ${order.id}\n`
    content += `DATA: ${new Date(order.created_at).toLocaleString("pt-BR")}\n`
    content += `${halfLine}\n\n`

    // Dados do cliente
    content += `CLIENTE: ${order.customer_name}\n`
    if (order.customer_phone) {
      content += `TELEFONE: ${order.customer_phone}\n`
    }
    if (order.customer_address) {
      content += `ENDERECO: ${order.customer_address}\n`
    }
    content += `${halfLine}\n\n`

    // Itens do pedido
    content += `ITENS:\n`
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        const itemTotal = item.quantity * item.price
        content += `${item.quantity}x ${item.name}\n`
        content += `   R$ ${item.price.toFixed(2)} = R$ ${itemTotal.toFixed(2)}\n`
        if (item.observations) {
          content += `   Obs: ${item.observations}\n`
        }
        content += `\n`
      })
    } else {
      content += `Nenhum item encontrado\n\n`
    }

    content += `${halfLine}\n`

    // Totais
    if (order.delivery_fee > 0) {
      content += `Taxa de Entrega: R$ ${order.delivery_fee.toFixed(2)}\n`
    }
    content += `TOTAL: R$ ${order.total.toFixed(2)}\n`
    content += `PAGAMENTO: ${order.payment_method}\n`

    // Observações
    if (order.observations) {
      content += `${halfLine}\n`
      content += `OBSERVACOES:\n${order.observations}\n`
    }

    // Rodapé
    content += `${line}\n`
    content += `Obrigado pela preferencia!\n`
    content += `${line}\n\n\n`

    // Comando de corte de papel
    content += "\x1D\x56\x42\x00"

    return content
  }

  async testSilentPrint(printerName = null) {
    try {
      await this.ensureConnection()

      const printer = printerName || this.selectedPrinter || (await qz.printers.getDefault())
      const config = qz.configs.create(printer)

      const testContent = `
========================================
        TESTE DE IMPRESSAO SILENCIOSA
========================================

Data: ${new Date().toLocaleString("pt-BR")}
Impressora: ${printer}

Teste de impressão silenciosa funcionando!
Sem popups ou confirmações.

========================================
           QZ TRAY SILENCIOSO
========================================


\x1D\x56\x42\x00`

      const printData = [{ type: "raw", format: "plain", data: testContent }]

      await qz.print(config, printData)
      console.log("[v0] Teste silencioso executado com sucesso!")

      return { success: true, printer }
    } catch (error) {
      console.error("[v0] Erro no teste silencioso:", error.message)
      return { success: false, error: error.message }
    }
  }

  // Método principal para impressão de pedidos (compatibilidade)
  async printOrder(order, companyData, printerName = null) {
    // Garantir inicialização
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Executar impressão silenciosa
    return await this.printOrderSilent(order, companyData, printerName)
  }

  async testPrint(printerName) {
    return await this.testSilentPrint(printerName)
  }

  // Métodos de configuração
  setSelectedPrinter(printerName) {
    this.selectedPrinter = printerName
    console.log("[v0] Impressora padrão definida silenciosamente:", printerName)
  }

  updatePrintSettings(settings) {
    this.printSettings = { ...this.printSettings, ...settings }
    console.log("[v0] Configurações atualizadas silenciosamente:", this.printSettings)
  }

  // Métodos de status
  getStatus() {
    return {
      connected: this.isConnected && qz.websocket.isActive(),
      version: qz.version || "Desconhecida",
      mode: "Silencioso (sem validação)",
      printer: this.selectedPrinter,
      initialized: this.isInitialized,
    }
  }

  isQzTrayConnected() {
    return this.isConnected && qz.websocket.isActive()
  }

  getSelectedPrinter() {
    return this.selectedPrinter
  }

  getPrintSettings() {
    return this.printSettings
  }

  // Auto-inicialização quando o serviço é importado
  async autoInit() {
    if (typeof window !== "undefined" && !this.isInitialized) {
      setTimeout(() => this.initialize(), 1000) // Delay para garantir que o QZ Tray está carregado
    }
  }

  getConnectionSuggestion(error) {
    if (error?.message?.includes("timeout")) {
      return "QZ Tray pode estar lento para responder. Verifique se está rodando e tente novamente."
    }
    if (error?.message?.includes("refused") || error?.message?.includes("ECONNREFUSED")) {
      return "QZ Tray não está rodando. Inicie o QZ Tray e tente novamente."
    }
    return "Verifique se o QZ Tray está instalado e rodando corretamente."
  }
}

const qzTrayService = new QZTraySilentService()

// Auto-inicializar se estiver no browser
qzTrayService.autoInit()

export default qzTrayService
