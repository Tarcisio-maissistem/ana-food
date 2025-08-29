import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const SECRET_KEY = "286E68A687F9C4874FEBD75EFD83E" // Same key as the certificate API

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Gerando token JWT para certificado...")

    const { company_id } = await request.json()
    console.log("[v0] API: Company ID recebido:", company_id)

    if (!company_id) {
      console.error("[v0] API: Company ID não fornecido")
      return NextResponse.json({ error: "CNPJ da empresa é obrigatório" }, { status: 400 })
    }

    if (typeof company_id !== "string" || company_id.trim().length === 0) {
      console.error("[v0] API: Company ID inválido:", company_id)
      return NextResponse.json({ error: "CNPJ da empresa deve ser uma string válida" }, { status: 400 })
    }

    // TODO: Verify if company exists and belongs to user
    // const company = await getCompanyByCNPJ(company_id)
    // if (!company) {
    //   return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    // }

    // Generate token with 1 hour expiration
    const token = jwt.sign({ company_id: company_id.trim() }, SECRET_KEY, { expiresIn: "1h" })
    console.log("[v0] API: Token JWT gerado com sucesso")

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
