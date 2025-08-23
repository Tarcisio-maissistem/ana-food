import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.EVOLUTION_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const instanceName = searchParams.get("instance") || "ana-food-instance"

    console.log(`[v0] WhatsApp Status API: Verificando status para instância: ${instanceName}`)

    const response = await fetch(`https://evo.anafood.vip/instance/connect/${instanceName}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
    })

    console.log(`[v0] WhatsApp Status API: Response status: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log(`[v0] WhatsApp Status API: Response data:`, data)
      return NextResponse.json(data)
    } else {
      const errorText = await response.text()
      console.error(`[v0] WhatsApp Status API: Error response: ${errorText}`)
      return NextResponse.json({ error: "Erro ao verificar status" }, { status: response.status })
    }
  } catch (error) {
    console.error("[v0] WhatsApp Status API: Erro ao verificar status WhatsApp:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
