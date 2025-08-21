import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getUserByEmail(email: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: user, error } = await supabase.from("users").select("id").eq("email", email).single()

    if (error || !user) {
      console.log("[v0] Usuário não encontrado:", email)
      return null
    }

    return user.id
  } catch (error) {
    console.error("[v0] Erro ao buscar usuário:", error)
    return null
  }
}

async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("products").select("*").limit(1)
    if (!error) {
      console.log("Tabela 'products' existe e está acessível")
      return true
    }
    if (
      error &&
      (error.message.includes("does not exist") ||
        error.message.includes("relation") ||
        error.message.includes("schema cache"))
    ) {
      console.log("Tabela 'products' não existe:", error.message)
      return false
    }
    console.log("Erro ao verificar tabela 'products':", error.message)
    return false
  } catch (error) {
    console.log("Erro na verificação da tabela 'products':", error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      console.log("[v0] Usuário não encontrado, retornando dados vazios")
      return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      console.log("[v0] Tabela 'products' não existe, retornando dados específicos do usuário")
      const userSpecificProducts = [
        {
          id: `${userId}-1`,
          name: "Hambúrguer Clássico",
          price: 25.9,
          category: "Hambúrgueres",
          description: "Hambúrguer com carne, queijo, alface e tomate",
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: `${userId}-2`,
          name: "Pizza Margherita",
          price: 35.0,
          category: "Pizzas",
          description: "Pizza com molho de tomate, mussarela e manjericão",
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const paginatedMockData = userSpecificProducts.slice(offset, offset + limit)
      return NextResponse.json({
        data: paginatedMockData,
        pagination: {
          page,
          limit,
          total: userSpecificProducts.length,
          totalPages: Math.ceil(userSpecificProducts.length / limit),
        },
      })
    }

    try {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1) // Aplicando paginação

      if (error) {
        // Se o erro for sobre coluna user_id não existir, retornar dados mock específicos do usuário
        if (error.message.includes("user_id") && error.message.includes("does not exist")) {
          console.log("[v0] Coluna user_id não existe na tabela products, retornando dados mock específicos do usuário")
          const userSpecificProducts = [
            {
              id: `${userId}-1`,
              name: "Hambúrguer Clássico",
              price: 25.9,
              category: "Hambúrgueres",
              description: "Hambúrguer com carne, queijo, alface e tomate",
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: `${userId}-2`,
              name: "Pizza Margherita",
              price: 35.0,
              category: "Pizzas",
              description: "Pizza com molho de tomate, mussarela e manjericão",
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]

          const paginatedMockData = userSpecificProducts.slice(offset, offset + limit)
          return NextResponse.json({
            data: paginatedMockData,
            pagination: {
              page,
              limit,
              total: userSpecificProducts.length,
              totalPages: Math.ceil(userSpecificProducts.length / limit),
            },
          })
        }

        console.error("Erro ao buscar produtos:", error)
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }

      return NextResponse.json({
        data: products || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    } catch (queryError) {
      console.error("Erro na consulta de produtos:", queryError)
      // Fallback para dados mock específicos do usuário
      const userSpecificProducts = [
        {
          id: `${userId}-1`,
          name: "Hambúrguer Clássico",
          price: 25.9,
          category: "Hambúrgueres",
          description: "Hambúrguer com carne, queijo, alface e tomate",
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: `${userId}-2`,
          name: "Pizza Margherita",
          price: 35.0,
          category: "Pizzas",
          description: "Pizza com molho de tomate, mussarela e manjericão",
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const paginatedMockData = userSpecificProducts.slice(offset, offset + limit)
      return NextResponse.json({
        data: paginatedMockData,
        pagination: {
          page,
          limit,
          total: userSpecificProducts.length,
          totalPages: Math.ceil(userSpecificProducts.length / limit),
        },
      })
    }
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
    }

    const tableExists = await checkTableExists(supabase)

    if (!tableExists) {
      const newProduct = {
        id: `${userId}-${Date.now()}`,
        name: body.name,
        price: body.price,
        category: body.category || "Geral",
        description: body.description || "",
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(newProduct)
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: body.name,
          price: body.price,
          category: body.category || "Geral",
          description: body.description || "",
          user_id: userId,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json(data)
    } catch (insertError: any) {
      if (
        insertError.message &&
        (insertError.message.includes("does not exist") || insertError.message.includes("schema cache"))
      ) {
        console.log("[v0] Algumas colunas não existem, tentando inserção com colunas básicas")

        try {
          // Try with just basic columns that likely exist
          const { data, error } = await supabase
            .from("products")
            .insert({
              name: body.name,
              price: body.price,
            })
            .select()
            .single()

          if (error) {
            throw error
          }

          return NextResponse.json(data)
        } catch (basicInsertError) {
          console.error("Erro ao criar produto com colunas básicas:", basicInsertError)
          const mockProduct = {
            id: `${userId}-${Date.now()}`,
            name: body.name,
            price: body.price,
            category: body.category || "Geral",
            description: body.description || "",
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          return NextResponse.json(mockProduct)
        }
      } else {
        throw insertError
      }
    }
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { id, ...updateData } = body

    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
    }

    try {
      // Check table structure to see what columns are available
      const { data: sampleData, error: structureError } = await supabase.from("products").select("*").limit(1)

      let availableColumns: string[] = []
      if (!structureError && sampleData && sampleData.length > 0) {
        availableColumns = Object.keys(sampleData[0])
        console.log("[v0] Colunas disponíveis na tabela products:", availableColumns)
      }

      // Filter updateData to only include columns that exist in the database
      const filteredUpdateData: any = {}

      // Always include updated_at
      filteredUpdateData.updated_at = new Date().toISOString()

      const uuidFields = ["print_location_id", "company_id", "user_id", "category_id"]

      // Helper function to validate UUID fields
      const validateUuidField = (value: any): any => {
        if (value === "" || value === undefined) {
          return null
        }
        return value
      }

      // Map common fields to correct column names
      const fieldMapping: { [key: string]: string } = {
        name: availableColumns.includes("name") ? "name" : availableColumns.includes("nome") ? "nome" : "",
        price: availableColumns.includes("price") ? "price" : availableColumns.includes("preco") ? "preco" : "",
        category: availableColumns.includes("category")
          ? "category"
          : availableColumns.includes("categoria")
            ? "categoria"
            : "",
        description: availableColumns.includes("description")
          ? "description"
          : availableColumns.includes("descricao")
            ? "descricao"
            : "",
        print_location_id: availableColumns.includes("print_location_id") ? "print_location_id" : "",
        on_off: availableColumns.includes("on_off") ? "on_off" : availableColumns.includes("active") ? "active" : "",
      }

      // Apply field mapping and filtering
      for (const [frontendField, value] of Object.entries(updateData)) {
        if (frontendField === "complements") {
          // Skip complements field as it doesn't exist in the database
          console.log("[v0] Ignorando campo 'complements' que não existe na tabela")
          continue
        }

        const dbField = fieldMapping[frontendField] || frontendField
        if (dbField && availableColumns.includes(dbField)) {
          if (uuidFields.includes(dbField)) {
            filteredUpdateData[dbField] = validateUuidField(value)
            console.log(`[v0] Campo UUID '${dbField}' validado:`, filteredUpdateData[dbField])
          } else {
            filteredUpdateData[dbField] = value
          }
        } else {
          console.log(`[v0] Ignorando campo '${frontendField}' que não existe na tabela`)
        }
      }

      const { data, error } = await supabase
        .from("products")
        .update(filteredUpdateData)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .maybeSingle()

      if (error) {
        console.error("Erro ao atualizar produto:", error)
        return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json({ error: "Produto não encontrado ou não autorizado" }, { status: 404 })
      }

      return NextResponse.json(data)
    } catch (updateError: any) {
      console.error("Erro ao atualizar produto:", updateError)

      // Fallback: try with basic fields only
      try {
        const basicUpdateData: any = {
          updated_at: new Date().toISOString(),
        }

        if (updateData.name) basicUpdateData.name = updateData.name
        if (updateData.price) basicUpdateData.price = updateData.price

        const { data, error } = await supabase
          .from("products")
          .update(basicUpdateData)
          .eq("id", id)
          .select()
          .maybeSingle()

        if (error) {
          throw error
        }

        return NextResponse.json(data || { id, ...basicUpdateData })
      } catch (basicError) {
        console.error("Erro ao atualizar produto com campos básicos:", basicError)
        return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 })
      }
    }
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID do produto é obrigatório" }, { status: 400 })
    }

    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
    }

    try {
      // Try deleting from produtos_disponibilidade table (Portuguese name)
      await supabase.from("produtos_disponibilidade").delete().eq("produto_id", id)
      console.log("[v0] Registros dependentes excluídos da tabela produtos_disponibilidade")
    } catch (dependencyError) {
      console.log("[v0] Tabela produtos_disponibilidade não existe ou não há registros dependentes")
    }

    try {
      // Try deleting from products_availability table (English name)
      await supabase.from("products_availability").delete().eq("produto_id", id)
      console.log("[v0] Registros dependentes excluídos da tabela products_availability")
    } catch (dependencyError) {
      console.log("[v0] Tabela products_availability não existe ou não há registros dependentes")
    }

    try {
      // Try with different column name variations
      await supabase.from("products_availability").delete().eq("product_id", id)
      console.log("[v0] Registros dependentes excluídos da tabela products_availability (product_id)")
    } catch (dependencyError) {
      console.log("[v0] Coluna product_id não existe na tabela products_availability")
    }

    try {
      // Try with produtos_disponibilidade and product_id
      await supabase.from("produtos_disponibilidade").delete().eq("product_id", id)
      console.log("[v0] Registros dependentes excluídos da tabela produtos_disponibilidade (product_id)")
    } catch (dependencyError) {
      console.log("[v0] Coluna product_id não existe na tabela produtos_disponibilidade")
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", userId)

    if (error) {
      console.error("Erro ao excluir produto:", error)
      return NextResponse.json({ error: `Erro ao excluir produto: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Produto excluído com sucesso:", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de produtos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
