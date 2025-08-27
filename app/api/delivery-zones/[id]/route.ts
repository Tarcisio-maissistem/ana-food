import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const body = await request.json()
    const { id } = params

    console.log("[v0] Delivery Zones Update API: Iniciando atualização para ID:", id)
    console.log("[v0] Delivery Zones Update API: Dados recebidos:", body)

    // Buscar usuário
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      console.log("[v0] Delivery Zones Update API: Usuário não encontrado")
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    console.log("[v0] Delivery Zones Update API: Usuário encontrado:", user.id)

    let company = null

    // First try to find company by CNPJ (works for existing companies)
    const { data: companiesByCNPJ } = await supabase
      .from("companies")
      .select("id")
      .not("cnpj", "is", null)
      .neq("cnpj", "")

    if (companiesByCNPJ && companiesByCNPJ.length > 0) {
      company = companiesByCNPJ[0]
      console.log("[v0] Delivery Zones Update API: Empresa encontrada via CNPJ:", company.id)
    } else {
      // Fallback to user_id lookup
      const { data: companyByUser } = await supabase.from("companies").select("id").eq("user_id", user.id).single()

      company = companyByUser
      console.log("[v0] Delivery Zones Update API: Empresa encontrada via user_id:", company?.id)
    }

    if (!company) {
      console.log("[v0] Delivery Zones Update API: Empresa não encontrada")
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const { data: zone, error } = await supabase
      .from("delivery_zones")
      .update({
        zone: body.zone,
        price: Number.parseFloat(body.price) || 0,
        active: body.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", company.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("[v0] Delivery Zones Update API: Erro ao atualizar bairro:", error)
      return NextResponse.json({ error: "Erro ao atualizar bairro: " + error.message }, { status: 500 })
    }

    if (!zone) {
      console.log("[v0] Delivery Zones Update API: Bairro não encontrado para atualização")
      return NextResponse.json({ error: "Bairro não encontrado" }, { status: 404 })
    }

    console.log("[v0] Delivery Zones Update API: Bairro atualizado com sucesso:", zone)
    return NextResponse.json(zone)
  } catch (error) {
    console.error("[v0] Delivery Zones Update API: Erro na API delivery-zones PUT:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const { id } = params

    // Buscar usuário
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Buscar empresa do usuário
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).single()

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    // Excluir bairro de entrega
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id).eq("company_id", company.id)

    if (error) {
      console.error("Erro ao excluir bairro:", error)
      return NextResponse.json({ error: "Erro ao excluir bairro" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API delivery-zones DELETE:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
