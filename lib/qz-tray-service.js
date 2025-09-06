// Import the qz variable
import qz from "qz-tray"

class QZTraySilentService {
  constructor() {
    this.isConnected = false
    this.connectionTimeout = 8000 // Timeout otimizado
    this.selectedPrinter = null
    this.printSettings = {
      showLogo: true,
      showTitle: true,
      showAddress: true,
      showPhone: true,
    }
    this.isInitialized = false
    this.silentMode = true
    this.maxRetries = 5
    this.retryDelay = 1500
    this.monitoringInterval = null
  }

  async initialize() {
    if (this.isInitialized) return { success: true }

    try {
      console.log("[v0] Inicializando QZ Tray em modo silencioso...")

      // Configuração completa de segurança desabilitada ANTES da conexão
      await this.setupSecurityBypass()

      // Aguardar aplicação das configurações
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Conectar automaticamente sem prompts
      const connectionResult = await this.connect()

      if (connectionResult.success) {
        this.isInitialized = true
        this.startConnectionMonitoring()
        console.log("[v0] QZ Tray inicializado com sucesso em modo silencioso")
        return { success: true }
      } else {
        return connectionResult
      }
    } catch (error) {
      console.error("[v0] Erro na inicialização silenciosa:", error.message)
      return { success: false, error: error.message }
    }
  }

  async setupSecurityBypass() {
    try {
      // Configuração de certificado (retorna null para não validar)
      qz.security.setCertificatePromise(() => {
        return Promise.resolve(null)
      })

      // Configuração de assinatura (retorna função que retorna Promise)
      qz.security.setSignaturePromise(() => {
        return () => Promise.resolve(null)
      })

      // Configurações adicionais se disponíveis
      if (typeof qz.security.setTrustPromise === "function") {
        qz.security.setTrustPromise(() => Promise.resolve(true))
      }

      if (typeof qz.security.setAuthPromise === "function") {
        qz.security.setAuthPromise(() => Promise.resolve(true))
      }

      // Configurar websocket se possível
      if (qz.websocket && typeof qz.websocket.setKeepAlive === "function") {
        qz.websocket.setKeepAlive(true)
      }

      console.log("[v0] Bypass de segurança configurado completamente")
      return true
    } catch (error) {
      console.warn("[v0] Algumas configurações de bypass não estão disponíveis:", error.message)
      return false
    }
  }

  async connect() {
    try {
      // Verificar se já está conectado
      if (qz.websocket.isActive()) {
        this.isConnected = true
        console.log("[v0] QZ Tray já conectado")
        await this.autoSelectPrinter()
        return { success: true }
      }

      console.log("[v0] Iniciando conexão silenciosa com QZ Tray...")

      let lastError = null

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`[v0] Tentativa de conexão ${attempt}/${this.maxRetries}`)

          // Reconfigurar segurança a cada tentativa
          await this.setupSecurityBypass()

          // Aguardar configuração
          await new Promise((resolve) => setTimeout(resolve, 300))

          // Tentar conectar
          await qz.websocket.connect()

          // Verificar se a conexão foi estabelecida
          if (qz.websocket.isActive()) {
            this.isConnected = true
            console.log("[v0] QZ Tray conectado silenciosamente")

            // Auto-detectar impressora
            await this.autoSelectPrinter()

            return { success: true }
          } else {
            throw new Error("Conexão não ativada após connect()")
          }
        } catch (error) {
          lastError = error
          console.warn(`[v0] Tentativa ${attempt} falhou:`, error.message)

          // Aguardar antes da próxima tentativa
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * attempt
            console.log(`[v0] Aguardando ${delay}ms antes da próxima tentativa...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }
      }

      // Todas as tentativas falharam
      this.isConnected = false
      console.error("[v0] Falha em todas as tentativas de conexão")

      return {
        success: false,
        error: lastError?.message || "Falha na conexão",
        suggestion: this.getConnectionSuggestion(lastError),
      }
    } catch (error) {
      this.isConnected = false
      console.error("[v0] Erro crítico na conexão:", error.message)
      return {
        success: false,
        error: error.message,
        suggestion: this.getConnectionSuggestion(error),
      }
    }
  }

  startConnectionMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      const wasConnected = this.isConnected
      const isCurrentlyConnected = qz.websocket.isActive()

      if (wasConnected && !isCurrentlyConnected) {
        console.warn("[v0] Conexão perdida, tentando reconectar...")
        this.isConnected = false

        // Tentar reconectar automaticamente
        try {
          const result = await this.connect()
          if (result.success) {
            console.log("[v0] Reconexão automática bem-sucedida")
          }
        } catch (error) {
          console.error("[v0] Falha na reconexão automática:", error.message)
        }
      } else if (!wasConnected && isCurrentlyConnected) {
        this.isConnected = true
        console.log("[v0] Conexão restaurada")
      }
    }, 3000) // Verificar a cada 3 segundos
  }

  async autoSelectPrinter() {
    try {
      if (!this.selectedPrinter) {
        const printersResult = await this.listPrinters()

        if (printersResult.success && printersResult.printers.length > 0) {
          this.selectedPrinter = printersResult.printers[0]
          console.log("[v0] Impressora selecionada automaticamente:", this.selectedPrinter)
        }
      }
    } catch (error) {
      console.warn("[v0] Erro ao selecionar impressora automaticamente:", error.message)
    }
  }

  async ensureConnection() {
    if (!qz.websocket.isActive()) {
      console.log("[v0] Conexão perdida, reconectando...")
      const result = await this.connect()
      return result.success
    }
    return true
  }

  async listPrinters() {
    try {
      // Garantir conexão ativa
      const isConnected = await this.ensureConnection()
      if (!isConnected) {
        throw new Error("Não foi possível estabelecer conexão com QZ Tray")
      }

      console.log("[v0] Listando impressoras...")

      const printers = await qz.printers.find()
      console.log("[v0] Impressoras encontradas:", printers)

      // Garantir que retorna array
      const printerList = Array.isArray(printers) ? printers : []

      return {
        success: true,
        printers: printerList,
      }
    } catch (error) {
      console.error("[v0] Erro ao listar impressoras:", error.message)
      return {
        success: false,
        error: error.message,
        printers: [],
      }
    }
  }

  async printOrderSilent(order, companyData, printerName = null) {
    try {
      console.log("[v0] Iniciando impressão silenciosa do pedido:", order?.id || order?.numero_pedido)

      // Garantir conexão ativa
      const isConnected = await this.ensureConnection()
      if (!isConnected) {
        throw new Error("Não foi possível conectar ao QZ Tray")
      }

      // Validar dados
      const validOrder = this.validateOrderData(order)
      const validCompany = this.validateCompanyData(companyData)

      // Selecionar impressora
      let targetPrinter = printerName || this.selectedPrinter

      if (!targetPrinter) {
        try {
          targetPrinter = await qz.printers.getDefault()
        } catch (error) {
          // Se não conseguir pegar a padrão, usar a primeira disponível
          const printersResult = await this.listPrinters()
          if (printersResult.success && printersResult.printers.length > 0) {
            targetPrinter = printersResult.printers[0]
          }
        }
      }

      if (!targetPrinter) {
        throw new Error("Nenhuma impressora disponível")
      }

      console.log("[v0] Imprimindo na impressora:", targetPrinter)

      // Gerar conteúdo
      const printContent = this.generatePrintContent(validOrder, validCompany)

      // Configurar impressão
      const config = qz.configs.create(targetPrinter, {
        colorType: "blackwhite",
        orientation: "portrait",
        margins: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      })

      // Dados para impressão
      const printData = [
        {
          type: "raw",
          format: "plain",
          data: printContent,
          options: {
            language: "ESCPOS", // Para impressoras térmicas
          },
        },
      ]

      // Executar impressão
      await qz.print(config, printData)

      console.log("[v0] Impressão silenciosa concluída com sucesso!")
      return {
        success: true,
        printer: targetPrinter,
      }
    } catch (error) {
      console.error("[v0] Erro na impressão silenciosa:", error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  validateOrderData(order) {
    if (!order) {
      throw new Error("Dados do pedido não fornecidos")
    }

    return {
      id: order.id || order.numero_pedido || order.order_number || `PED-${Date.now()}`,
      customer_name: order.customer_name || order.nome_cliente || order.customerName || "Cliente não informado",
      customer_phone: order.customer_phone || order.telefone || order.customerPhone || order.phone || "",
      customer_address: order.customer_address || order.endereco || order.customerAddress || order.address || "",
      payment_method: order.payment_method || order.pagamento || order.paymentMethod || "Não informado",
      delivery_fee: Number(order.delivery_fee || order.taxa_entrega || order.deliveryFee || 0),
      total: Number(order.total || 0),
      observations: order.observations || order.observacoes || order.obs || "",
      items: this.validateOrderItems(order.items || order.itens || []),
      created_at: order.created_at || new Date().toISOString(),
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
    const defaultCompany = {
      name: "Estabelecimento",
      address: "Endereço não informado",
      phone: "",
      cnpj: "",
    }

    if (!company) return defaultCompany

    return {
      name: company.name || company.razao_social || defaultCompany.name,
      address: company.address || company.endereco || defaultCompany.address,
      phone: company.phone || company.telefone || defaultCompany.phone,
      cnpj: company.cnpj || defaultCompany.cnpj,
    }
  }

  generatePrintContent(order, company) {
    const line = "=".repeat(40)
    const halfLine = "-".repeat(40)
    let content = ""

    // Cabeçalho
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

    // Itens
    content += `ITENS:\n`
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
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

    // Comando de corte de papel (ESC/POS)
    content += "\x1D\x56\x42\x00"

    return content
  }

  generatePreviewContent(order, company) {
    return this.generatePrintContent(order, company)
  }

  async testSilentPrint(printerName = null) {
    try {
      const isConnected = await this.ensureConnection()
      if (!isConnected) {
        throw new Error("Não foi possível conectar ao QZ Tray")
      }

      let targetPrinter = printerName || this.selectedPrinter

      if (!targetPrinter) {
        const printersResult = await this.listPrinters()
        if (printersResult.success && printersResult.printers.length > 0) {
          targetPrinter = printersResult.printers[0]
        }
      }

      if (!targetPrinter) {
        throw new Error("Nenhuma impressora disponível para teste")
      }

      const config = qz.configs.create(targetPrinter)

      const testContent = `
========================================
        TESTE DE IMPRESSAO SILENCIOSA
========================================

Data: ${new Date().toLocaleString("pt-BR")}
Impressora: ${targetPrinter}

Teste de impressão silenciosa OK!
Sistema funcionando sem popups.

========================================
           QZ TRAY SILENCIOSO
========================================


\x1D\x56\x42\x00`

      const printData = [
        {
          type: "raw",
          format: "plain",
          data: testContent,
        },
      ]

      await qz.print(config, printData)
      console.log("[v0] Teste silencioso executado com sucesso!")

      return {
        success: true,
        printer: targetPrinter,
      }
    } catch (error) {
      console.error("[v0] Erro no teste silencioso:", error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Métodos de compatibilidade
  async printOrder(order, companyData, printerName = null) {
    if (!this.isInitialized) {
      await this.initialize()
    }
    return await this.printOrderSilent(order, companyData, printerName)
  }

  async testPrint(printerName) {
    return await this.testSilentPrint(printerName)
  }

  async disconnect() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval)
        this.monitoringInterval = null
      }

      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect()
        console.log("[v0] QZ Tray desconectado")
      }

      this.isConnected = false
      this.isInitialized = false

      return { success: true }
    } catch (error) {
      console.error("[v0] Erro ao desconectar:", error.message)
      return { success: false, error: error.message }
    }
  }

  // Configurações
  setSelectedPrinter(printerName) {
    this.selectedPrinter = printerName
    console.log("[v0] Impressora selecionada:", printerName)
  }

  updatePrintSettings(settings) {
    this.printSettings = { ...this.printSettings, ...settings }
    console.log("[v0] Configurações atualizadas:", this.printSettings)
  }

  // Status
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

  getConnectionSuggestion(error) {
    if (!error) return "Verifique se o QZ Tray está rodando"

    const errorMessage = error.message?.toLowerCase() || ""

    if (errorMessage.includes("timeout")) {
      return "QZ Tray está lento. Verifique se não há outros programas usando muito processamento."
    }
    if (errorMessage.includes("refused") || errorMessage.includes("econnrefused")) {
      return "QZ Tray não está rodando. Inicie o QZ Tray como Administrador."
    }
    if (errorMessage.includes("websocket")) {
      return "Problema WebSocket. Reinicie o QZ Tray e tente novamente."
    }
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return "QZ Tray não encontrado. Verifique se está instalado corretamente."
    }
    if (errorMessage.includes("security") || errorMessage.includes("certificate")) {
      return "Problema de certificado. Verifique o arquivo config.js na pasta do QZ Tray."
    }

    return "Verifique se o QZ Tray está instalado e rodando como Administrador."
  }

  // Auto-inicialização
  async autoInit() {
    if (typeof window !== "undefined" && !this.isInitialized) {
      // Aguardar um pouco para garantir que a página carregou
      setTimeout(async () => {
        try {
          await this.initialize()
        } catch (error) {
          console.warn("[v0] Auto-inicialização falhou:", error.message)
        }
      }, 2000)
    }
  }
}

// Criar instância única
const qzTrayService = new QZTraySilentService()

// Auto-inicializar
qzTrayService.autoInit()

export default qzTrayService
