import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const body = await request.json()
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

    // Atualizar bairro de entrega
    const { data: zone, error } = await supabase
      .from("delivery_zones")
      .update({
        zone: body.zone,
        price: body.price,
        active: body.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", company.id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar bairro:", error)
      return NextResponse.json({ error: "Erro ao atualizar bairro" }, { status: 500 })
    }

    return NextResponse.json(zone)
  } catch (error) {
    console.error("Erro na API delivery-zones PUT:", error)
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
