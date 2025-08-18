import { type NextRequest, NextResponse } from "next/server"

const EVOLUTION_API_BASE_URL = "https://evo.anafood.vip"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.EVOLUTION_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 })
    }

    const { action, instanceName, ...data } = await request.json()

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

    const response = await fetch(`${EVOLUTION_API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    try {
      const data = JSON.parse(responseText)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ message: responseText })
    }
  } catch (error) {
    console.error("Erro na API WhatsApp:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
