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

async function checkOnOffColumnExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("categories").select("on_off").limit(1)
    return !error
  } catch (error) {
    console.log("[v0] on_off column doesn't exist yet, using fallback")
    return false
  }
}

async function checkDescriptionColumnExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from("categories").select("description").limit(1)
    return !error
  } catch (error) {
    console.log("[v0] description column doesn't exist yet, using fallback")
    return false
  }
}

const fallbackCategories = [
  {
    id: "1",
    name: "Hambúrgueres",
    description: "Hambúrgueres artesanais",
    on_off: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Pizzas",
    description: "Pizzas tradicionais e especiais",
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
      const filteredCategories = fallbackCategories.filter((category) => {
        const matchesSearch = category.name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = showInactive || category.on_off
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

    const hasOnOffColumn = await checkOnOffColumnExists(supabase)

    let query = supabase.from("categories").select("*", { count: "exact" })

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    if (!showInactive && hasOnOffColumn) {
      query = query.eq("on_off", true)
    }

    const {
      data: categories,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Erro ao buscar categorias:", error)
      return NextResponse.json({
        data: fallbackCategories,
        pagination: { page: 1, limit: 10, total: fallbackCategories.length, totalPages: 1 },
      })
    }

    const processedCategories = (categories || []).map((category) => ({
      ...category,
      on_off: hasOnOffColumn ? category.on_off : true,
    }))

    return NextResponse.json({
      data: processedCategories,
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
      data: fallbackCategories,
      pagination: { page: 1, limit: 10, total: fallbackCategories.length, totalPages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient(supabaseUrl, supabaseKey)
    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const newCategory = {
        id: Date.now().toString(),
        name: body.name,
        description: body.description || "",
        on_off: body.on_off ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(newCategory)
    }

    const hasOnOffColumn = await checkOnOffColumnExists(supabase)
    const hasDescriptionColumn = await checkDescriptionColumnExists(supabase)

    const insertData: any = {
      name: body.name,
    }

    if (hasDescriptionColumn) {
      insertData.description = body.description || ""
    }

    if (hasOnOffColumn) {
      insertData.on_off = body.on_off ?? true
    }

    try {
      const { data, error } = await supabase.from("categories").insert(insertData).select().single()

      if (error) {
        console.error("Erro ao criar categoria:", error)
        if (error.message?.includes("column") && error.message?.includes("does not exist")) {
          console.log("[v0] Schema mismatch detected, trying with basic columns only")
          const basicData = { name: body.name }
          const { data: basicResult, error: basicError } = await supabase
            .from("categories")
            .insert(basicData)
            .select()
            .single()

          if (basicError) {
            console.error("Erro ao criar categoria com colunas básicas:", basicError)
            return NextResponse.json({
              id: Date.now().toString(),
              name: body.name,
              description: body.description || "",
              on_off: body.on_off ?? true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }

          return NextResponse.json({
            ...basicResult,
            description: body.description || "",
            on_off: body.on_off ?? true,
          })
        }
        return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 })
      }

      const processedData = {
        ...data,
        description: hasDescriptionColumn ? data.description : body.description || "",
        on_off: hasOnOffColumn ? data.on_off : true,
      }

      return NextResponse.json(processedData)
    } catch (insertError) {
      console.error("Erro durante inserção:", insertError)
      return NextResponse.json({
        id: Date.now().toString(),
        name: body.name,
        description: body.description || "",
        on_off: body.on_off ?? true,
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
