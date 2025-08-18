import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("additionals").select("*").limit(1)
    return !error
  } catch (error) {
    return false
  }
}

const fallbackAdditionals = [
  {
    id: "1",
    name: "Bacon",
    price: 3.5,
    description: "Bacon crocante",
    on_off: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Queijo Extra",
    price: 2.0,
    description: "Queijo mussarela extra",
    on_off: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const showInactive = searchParams.get("showInactive") === "true"

    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const filteredAdditionals = fallbackAdditionals.filter((additional) => {
        const matchesSearch = additional.name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = showInactive || additional.on_off
        return matchesSearch && matchesStatus
      })

      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedAdditionals = filteredAdditionals.slice(startIndex, endIndex)

      return NextResponse.json({
        data: paginatedAdditionals,
        pagination: {
          page,
          limit,
          total: filteredAdditionals.length,
          totalPages: Math.ceil(filteredAdditionals.length / limit),
        },
      })
    }

    let query = supabase.from("additionals").select("*", { count: "exact" })

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    if (!showInactive) {
      query = query.eq("on_off", true)
    }

    const {
      data: additionals,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Erro ao buscar adicionais:", error)
      return NextResponse.json({
        data: fallbackAdditionals,
        pagination: { page: 1, limit: 10, total: fallbackAdditionals.length, totalPages: 1 },
      })
    }

    return NextResponse.json({
      data: additionals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Erro na API de adicionais:", error)
    return NextResponse.json({
      data: fallbackAdditionals,
      pagination: { page: 1, limit: 10, total: fallbackAdditionals.length, totalPages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const newAdditional = {
        id: Date.now().toString(),
        name: body.name,
        price: body.price,
        description: body.description || "",
        on_off: body.on_off ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(newAdditional)
    }

    const { data, error } = await supabase
      .from("additionals")
      .insert({
        name: body.name,
        price: body.price,
        description: body.description || "",
        on_off: body.on_off ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar adicional:", error)
      return NextResponse.json({ error: "Erro ao criar adicional" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro na API de adicionais:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const updatedAdditional = {
        id,
        ...updateData,
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(updatedAdditional)
    }

    const { data, error } = await supabase.from("additionals").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Erro ao atualizar adicional:", error)
      return NextResponse.json({ error: "Erro ao atualizar adicional" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro na API de adicionais:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID do adicional é obrigatório" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase.from("additionals").delete().eq("id", id)

    if (error) {
      console.error("Erro ao deletar adicional:", error)
      return NextResponse.json({ error: "Erro ao deletar adicional" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de adicionais:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
