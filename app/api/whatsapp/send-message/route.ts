import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.EVOLUTION_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 })
    }

    const { instanceName, phone, message } = await request.json()

    const response = await fetch(`https://evo.anafood.vip/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ""),
        text: message,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: response.status })
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
