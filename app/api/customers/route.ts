import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("customers").select("*").limit(1)
    return !error
  } catch (error) {
    return false
  }
}

const fallbackCustomers = [
  {
    id: "1",
    name: "João Silva",
    phone: "+5511999999999",
    address: "Rua das Flores, 123 - Centro",
    email: "joao@email.com",
    notes: "Cliente preferencial, sempre pede sem cebola",
    on_off: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Maria Santos",
    phone: "+5511988888888",
    address: "Av. Principal, 456 - Jardim",
    email: "maria@email.com",
    notes: "",
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
      const filteredCustomers = fallbackCustomers.filter((customer) => {
        const matchesSearch =
          customer.name.toLowerCase().includes(search.toLowerCase()) || customer.phone.includes(search)
        const matchesStatus = showInactive || customer.on_off
        return matchesSearch && matchesStatus
      })

      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

      return NextResponse.json({
        data: paginatedCustomers,
        pagination: {
          page,
          limit,
          total: filteredCustomers.length,
          totalPages: Math.ceil(filteredCustomers.length / limit),
        },
      })
    }

    let query = supabase.from("customers").select("*", { count: "exact" })

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (!showInactive) {
      query = query.eq("on_off", true)
    }

    const {
      data: customers,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Erro ao buscar clientes:", error)
      return NextResponse.json({
        data: fallbackCustomers,
        pagination: { page: 1, limit: 10, total: fallbackCustomers.length, totalPages: 1 },
      })
    }

    return NextResponse.json({
      data: customers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Erro na API de clientes:", error)
    return NextResponse.json({
      data: fallbackCustomers,
      pagination: { page: 1, limit: 10, total: fallbackCustomers.length, totalPages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const newCustomer = {
        id: Date.now().toString(),
        name: body.name,
        phone: body.phone,
        address: body.address || "",
        email: body.email || "",
        notes: body.notes || "",
        on_off: body.on_off ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(newCustomer)
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: body.name,
        phone: body.phone,
        address: body.address || "",
        email: body.email || "",
        notes: body.notes || "",
        on_off: body.on_off ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar cliente:", error)
      return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro na API de clientes:", error)
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
      const updatedCustomer = {
        id,
        ...updateData,
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(updatedCustomer)
    }

    const { data, error } = await supabase.from("customers").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Erro ao atualizar cliente:", error)
      return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro na API de clientes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID do cliente é obrigatório" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase.from("customers").delete().eq("id", id)

    if (error) {
      console.error("Erro ao deletar cliente:", error)
      return NextResponse.json({ error: "Erro ao deletar cliente" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de clientes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
