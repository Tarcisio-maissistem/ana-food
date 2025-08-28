import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] API Print Locations: Iniciando busca de locais de impressão")

    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    console.log("[v0] API Print Locations: Email do usuário:", userEmail)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar usuário por email
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      console.log("[v0] API Print Locations: Usuário não encontrado")
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    console.log("[v0] API Print Locations: Usuário encontrado:", user.id)

    // Buscar locais de impressão do usuário
    const { data: printLocations, error } = await supabase
      .from("print_locations")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name")

    if (error) {
      console.log("[v0] API Print Locations: Erro na consulta:", error)
      // Retornar locais padrão se a tabela não existir
      return NextResponse.json([
        { id: "default-1", name: "Não imprimir", user_id: user.id, active: true },
        { id: "default-2", name: "Cozinha", user_id: user.id, active: true },
        { id: "default-3", name: "Bar/Copa", user_id: user.id, active: true },
        { id: "default-4", name: "Caixa", user_id: user.id, active: true },
      ])
    }

    console.log("[v0] API Print Locations: Retornando", printLocations?.length || 0, "locais")
    return NextResponse.json(printLocations || [])
  } catch (error) {
    console.error("[v0] API Print Locations: Erro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar usuário por email
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Criar novo local de impressão
    const { data: newLocation, error } = await supabase
      .from("print_locations")
      .insert({
        name: body.name,
        user_id: user.id,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] API Print Locations: Erro ao criar:", error)
      return NextResponse.json({ error: "Erro ao criar local de impressão" }, { status: 500 })
    }

    return NextResponse.json(newLocation)
  } catch (error) {
    console.error("[v0] API Print Locations: Erro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar usuário por email
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const { data: updatedLocation, error } = await supabase
      .from("print_locations")
      .update({
        name: body.name,
        printer_name: body.printer_name || null,
        active: body.active,
      })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] API Print Locations: Erro ao atualizar:", error)
      return NextResponse.json({ error: "Erro ao atualizar local de impressão" }, { status: 500 })
    }

    return NextResponse.json(updatedLocation)
  } catch (error) {
    console.error("[v0] API Print Locations: Erro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar usuário por email
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const { error } = await supabase.from("print_locations").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("[v0] API Print Locations: Erro ao deletar:", error)
      return NextResponse.json({ error: "Erro ao deletar local de impressão" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] API Print Locations: Erro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
