import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.EVOLUTION_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const instanceName = searchParams.get("instance") || "ana-food-instance"

    const response = await fetch(`https://evo.anafood.vip/instance/connectionState/${instanceName}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      return NextResponse.json({ error: "Erro ao verificar status" }, { status: response.status })
    }
  } catch (error) {
    console.error("Erro ao verificar status WhatsApp:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
