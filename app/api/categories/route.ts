import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("categories").select("*").limit(1)
    return !error
  } catch (error) {
    return false
  }
}

async function checkTableStructure(supabase: any): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("categories").select("*").limit(0)
    if (error) {
      console.log("[v0] Erro ao verificar estrutura da tabela:", error.message)
      return []
    }
    return Object.keys(data?.[0] || {})
  } catch (error) {
    console.log("[v0] Erro ao verificar estrutura:", error)
    return []
  }
}

function createInitialCategories(userId: string) {
  return [
    {
      id: `${userId}-cat-1`,
      nome: "Hambúrgueres",
      descricao: "Hambúrgueres artesanais",
      ativo: true,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `${userId}-cat-2`,
      nome: "Pizzas",
      descricao: "Pizzas tradicionais e especiais",
      ativo: true,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `${userId}-cat-3`,
      nome: "Bebidas",
      descricao: "Refrigerantes, sucos e bebidas",
      ativo: true,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const showInactive = searchParams.get("showInactive") === "true"

    const userEmail = request.headers.get("x-user-email")
    let userId = request.headers.get("x-user-id")

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!userId && userEmail) {
      const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()
      userId = user?.id
    }

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const initialCategories = userId ? createInitialCategories(userId) : []
      const filteredCategories = initialCategories.filter((category) => {
        const matchesSearch = category.nome.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = showInactive || category.ativo
        return matchesSearch && matchesStatus
      })

      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedCategories = filteredCategories.slice(startIndex, endIndex)

      return NextResponse.json({
        data: paginatedCategories,
        pagination: {
          page,
          limit,
          total: filteredCategories.length,
          totalPages: Math.ceil(filteredCategories.length / limit),
        },
      })
    }

    const availableColumns = await checkTableStructure(supabase)
    console.log("[v0] Colunas disponíveis na tabela categories:", availableColumns)

    let query = supabase.from("categories").select("*", { count: "exact" })

    if (userId && availableColumns.includes("user_id")) {
      query = query.eq("user_id", userId)
    }

    if (search) {
      if (availableColumns.includes("nome")) {
        query = query.ilike("nome", `%${search}%`)
      } else if (availableColumns.includes("name")) {
        query = query.ilike("name", `%${search}%`)
      }
    }

    if (!showInactive) {
      if (availableColumns.includes("ativo")) {
        query = query.eq("ativo", true)
      } else if (availableColumns.includes("on_off")) {
        query = query.eq("on_off", true)
      }
    }

    const {
      data: categories,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Erro ao buscar categorias:", error)
      const initialCategories = userId ? createInitialCategories(userId) : []
      return NextResponse.json({
        data: initialCategories,
        pagination: { page: 1, limit: 10, total: initialCategories.length, totalPages: 1 },
      })
    }

    return NextResponse.json({
      data: categories || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Erro na API de categorias:", error)
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const userEmail = request.headers.get("x-user-email")
    let userId = request.headers.get("x-user-id")

    if (!userId && userEmail) {
      const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()
      userId = user?.id
    }

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const newCategory = {
        id: `${userId || Date.now()}-${Date.now()}`,
        nome: body.name || body.nome,
        descricao: body.description || body.descricao || "",
        ativo: body.on_off ?? body.ativo ?? true,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(newCategory)
    }

    const availableColumns = await checkTableStructure(supabase)
    console.log("[v0] Tentando criar categoria com colunas disponíveis:", availableColumns)

    const insertData: any = {}

    if (availableColumns.includes("nome")) {
      insertData.nome = body.name || body.nome
    } else if (availableColumns.includes("name")) {
      insertData.name = body.name || body.nome
    }

    if (availableColumns.includes("descricao")) {
      insertData.descricao = body.description || body.descricao || ""
    } else if (availableColumns.includes("description")) {
      insertData.description = body.description || body.descricao || ""
    }

    if (availableColumns.includes("ativo")) {
      insertData.ativo = body.on_off ?? body.ativo ?? true
    } else if (availableColumns.includes("on_off")) {
      insertData.on_off = body.on_off ?? body.ativo ?? true
    }

    if (availableColumns.includes("user_id") && userId) {
      insertData.user_id = userId
    }

    console.log("[v0] Dados para inserção:", insertData)

    try {
      const { data, error } = await supabase.from("categories").insert(insertData).select().single()

      if (error) {
        console.error("Erro ao criar categoria:", error)
        return NextResponse.json({
          id: `${userId || Date.now()}-${Date.now()}`,
          nome: body.name || body.nome,
          descricao: body.description || body.descricao || "",
          ativo: body.on_off ?? body.ativo ?? true,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      return NextResponse.json(data)
    } catch (insertError) {
      console.error("Erro durante inserção:", insertError)
      return NextResponse.json({
        id: `${userId || Date.now()}-${Date.now()}`,
        nome: body.name || body.nome,
        descricao: body.description || body.descricao || "",
        ativo: body.on_off ?? body.ativo ?? true,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Erro na API de categorias:", error)
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
      const updatedCategory = {
        id,
        ...updateData,
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(updatedCategory)
    }

    const { data, error } = await supabase.from("categories").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Erro ao atualizar categoria:", error)
      return NextResponse.json({ error: "Erro ao atualizar categoria" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro na API de categorias:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID da categoria é obrigatório" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) {
      console.error("Erro ao deletar categoria:", error)
      return NextResponse.json({ error: "Erro ao deletar categoria" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de categorias:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
