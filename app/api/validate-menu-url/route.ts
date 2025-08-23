import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email")
    const body = await request.json()
    const { url } = body

    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 })
    }

    if (!url?.trim()) {
      return NextResponse.json({ isValid: true })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: existingCompany, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("url", url.trim().toLowerCase())
      .neq("id", userData.company_id)
      .maybeSingle()

    if (error) {
      console.error("[v0] API ValidateMenuUrl: Erro ao verificar URL:", error)
      return NextResponse.json({ isValid: true })
    }

    if (existingCompany) {
      const { data: currentCompany } = await supabase
        .from("companies")
        .select("name")
        .eq("id", userData.company_id)
        .single()

      const baseName =
        currentCompany?.name
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 20) || "restaurante"

      const suggestions = [
        `${baseName}1`,
        `${baseName}-delivery`,
        `${baseName}-cardapio`,
        `${baseName}${Math.floor(Math.random() * 99) + 1}`,
      ]

      for (const suggestion of suggestions) {
        const { data: suggestionExists } = await supabase
          .from("companies")
          .select("id")
          .eq("url", suggestion)
          .maybeSingle()

        if (!suggestionExists) {
          return NextResponse.json({
            isValid: false,
            suggestion,
          })
        }
      }

      return NextResponse.json({
        isValid: false,
        suggestion: suggestions[0],
      })
    }

    return NextResponse.json({ isValid: true })
  } catch (error) {
    console.error("[v0] API ValidateMenuUrl: Erro:", error)
    return NextResponse.json({ isValid: true })
  }
}
