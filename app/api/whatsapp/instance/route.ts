import { type NextRequest, NextResponse } from "next/server"

const EVOLUTION_API_BASE_URL = "https://evo.anafood.vip"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.EVOLUTION_API_KEY
    if (!apiKey) {
      console.error("[v0] WhatsApp API: EVOLUTION_API_KEY não configurada")
      return NextResponse.json({ error: "API Key não configurada no servidor" }, { status: 500 })
    }

    const { action, instanceName, ...data } = await request.json()
    console.log("[v0] WhatsApp API: Ação solicitada:", action, "Instância:", instanceName)

    let endpoint = ""
    let method = "POST"
    let body = null

    switch (action) {
      case "create":
        endpoint = "/instance/create"
        body = {
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          ...data,
        }
        console.log("[v0] WhatsApp API: Criando instância com dados:", body)
        break
      case "fetchInstances":
        endpoint = "/instance/fetchInstances"
        method = "GET"
        console.log("[v0] WhatsApp API: Buscando instâncias existentes")
        break
      case "connect":
        endpoint = `/instance/connect/${instanceName}`
        method = "GET"
        break
      case "disconnect":
        endpoint = `/instance/logout/${instanceName}`
        method = "DELETE"
        break
      case "status":
        endpoint = `/instance/connectionState/${instanceName}`
        method = "GET"
        break
      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    const fullUrl = `${EVOLUTION_API_BASE_URL}${endpoint}`
    console.log("[v0] WhatsApp API: Fazendo requisição:", method, fullUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()
    console.log("[v0] WhatsApp API: Response status:", response.status)
    console.log("[v0] WhatsApp API: Response headers:", Object.fromEntries(response.headers.entries()))
    console.log("[v0] WhatsApp API: Response text (first 500 chars):", responseText.substring(0, 500))

    if (!response.ok) {
      console.error("[v0] WhatsApp API: Erro na requisição:", {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl,
        method,
        response: responseText,
      })

      let errorMessage = `Evolution API Error: ${response.status} - ${response.statusText}`

      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If response is not JSON, include raw text
        if (responseText.length > 0) {
          errorMessage += ` - ${responseText.substring(0, 200)}`
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: {
            status: response.status,
            statusText: response.statusText,
            endpoint: endpoint,
            evolutionApiUrl: EVOLUTION_API_BASE_URL,
          },
        },
        { status: response.status },
      )
    }

    try {
      const data = JSON.parse(responseText)
      console.log("[v0] WhatsApp API: Resposta parseada com sucesso:", data)
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("[v0] WhatsApp API: Erro ao fazer parse da resposta:", parseError)
      console.log("[v0] WhatsApp API: Resposta raw:", responseText)
      return NextResponse.json({
        message: responseText,
        warning: "Resposta não é JSON válido",
      })
    }
  } catch (error: any) {
    console.error("[v0] WhatsApp API: Erro interno:", error)

    let errorMessage = "Erro interno do servidor"
    let statusCode = 500

    if (error.name === "AbortError") {
      errorMessage = "Timeout: Evolution API não respondeu em 30 segundos"
      statusCode = 408
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      errorMessage = "Não foi possível conectar ao Evolution API. Verifique se o servidor está rodando."
      statusCode = 503
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: {
          type: error.name,
          code: error.code,
          evolutionApiUrl: EVOLUTION_API_BASE_URL,
        },
      },
      { status: statusCode },
    )
  }
}
