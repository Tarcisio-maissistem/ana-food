"use client"

import { useState, useEffect, useCallback } from "react"

declare global {
  interface Window {
    qz: any
  }
}

interface Order {
  id: string
  numero_pedido: string
  nome_cliente: string
  telefone: string
  endereco?: string
  itens: any[]
  pagamento: string
  subtotal: number
  taxa_entrega: number
  total: number
  created_at: string
}

export function useQZTray() {
  const [isQZConnected, setIsQZConnected] = useState(false)
  const [qzStatus, setQzStatus] = useState("Desconectado")

  useEffect(() => {
    loadQZTray()
  }, [])

  const loadQZTray = async () => {
    try {
      // Load QZ Tray script if not already loaded
      if (!window.qz) {
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js"
        script.onload = () => {
          console.log("[v0] QZ Tray: Script loaded")
          initializeQZ()
        }
        document.head.appendChild(script)
      } else {
        initializeQZ()
      }
    } catch (error) {
      console.error("[v0] QZ Tray: Error loading script:", error)
      setQzStatus("Erro ao carregar")
    }
  }

  const initializeQZ = async () => {
    try {
      if (!window.qz) return

      setQzStatus("Inicializando...")

      // Set up QZ Tray configuration
      window.qz.websocket
        .connect()
        .then(() => {
          console.log("[v0] QZ Tray: Connected to websocket")
          setIsQZConnected(true)
          setQzStatus("Conectado")
        })
        .catch((error: any) => {
          console.error("[v0] QZ Tray: Connection failed:", error)
          setIsQZConnected(false)
          setQzStatus("Falha na conexão")
        })
    } catch (error) {
      console.error("[v0] QZ Tray: Initialization error:", error)
      setQzStatus("Erro na inicialização")
    }
  }

  const connectQZ = useCallback(async () => {
    if (!window.qz) {
      await loadQZTray()
      return
    }

    try {
      setQzStatus("Conectando...")
      await window.qz.websocket.connect()
      setIsQZConnected(true)
      setQzStatus("Conectado")
      console.log("[v0] QZ Tray: Manual connection successful")
    } catch (error) {
      console.error("[v0] QZ Tray: Manual connection failed:", error)
      setIsQZConnected(false)
      setQzStatus("Falha na conexão")
    }
  }, [])

  const printOrder = useCallback(
    async (order: Order) => {
      if (!window.qz || !isQZConnected) {
        console.warn("[v0] QZ Tray: Not connected, cannot print")
        return
      }

      try {
        console.log("[v0] QZ Tray: Printing order:", order.numero_pedido)

        const printContent = generateOrderPrintContent(order)

        // Get default printer
        const printers = await window.qz.printers.find()
        const defaultPrinter = printers[0] || "Default"

        // Create print configuration
        const config = window.qz.configs.create(defaultPrinter)

        // Print the order
        await window.qz.print(config, [
          {
            type: "raw",
            format: "plain",
            data: printContent,
          },
        ])

        console.log("[v0] QZ Tray: Order printed successfully")
      } catch (error) {
        console.error("[v0] QZ Tray: Print error:", error)
      }
    },
    [isQZConnected],
  )

  const generateOrderPrintContent = (order: Order): string => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value)
    }

    const formatTime = (dateString: string) => {
      return new Date(dateString).toLocaleString("pt-BR")
    }

    let content = `
========================================
           NOVO PEDIDO
========================================

Pedido: #${order.numero_pedido}
Data/Hora: ${formatTime(order.created_at)}

----------------------------------------
CLIENTE:
${order.nome_cliente}
Tel: ${order.telefone}
${order.endereco ? `Endereço: ${order.endereco}` : "RETIRADA NO LOCAL"}

----------------------------------------
ITENS:
`

    order.itens?.forEach((item, index) => {
      content += `${index + 1}. ${item.quantidade}x ${item.nome}\n`
      if (item.observacoes) {
        content += `   Obs: ${item.observacoes}\n`
      }
      content += `   ${formatCurrency(item.preco * item.quantidade)}\n\n`
    })

    content += `----------------------------------------
RESUMO:
Subtotal: ${formatCurrency(order.subtotal)}
Taxa Entrega: ${formatCurrency(order.taxa_entrega)}
TOTAL: ${formatCurrency(order.total)}

Pagamento: ${order.pagamento}

========================================
        Preparar com urgência!
========================================


`

    return content
  }

  return {
    isQZConnected,
    connectQZ,
    printOrder,
    qzStatus,
  }
}
