import { type NextRequest, NextResponse } from "next/server"

const SECRET_KEY = "286E68A687F9C4874FEBD75EFD83E" // Same key as the certificate API

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Gerando token JWT para certificado...")

    let requestData
    try {
      requestData = await request.json()
    } catch (jsonError) {
      console.error("[v0] API: Erro ao fazer parse do JSON:", jsonError)
      return NextResponse.json({ error: "Dados JSON inválidos" }, { status: 400 })
    }

    const { company_id } = requestData
    console.log("[v0] API: Company ID recebido:", company_id)

    if (!company_id) {
      console.error("[v0] API: Company ID não fornecido")
      return NextResponse.json({ error: "CNPJ da empresa é obrigatório" }, { status: 400 })
    }

    if (typeof company_id !== "string" || company_id.trim().length === 0) {
      console.error("[v0] API: Company ID inválido:", company_id)
      return NextResponse.json({ error: "CNPJ da empresa deve ser uma string válida" }, { status: 400 })
    }

    const payload = {
      company_id: company_id.trim(),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
      iat: Math.floor(Date.now() / 1000),
    }

    // Simple base64 encoding for development (replace with proper JWT in production)
    const token = btoa(JSON.stringify(payload))
    console.log("[v0] API: Token gerado com sucesso")

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[v0] API: Erro ao gerar token:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
