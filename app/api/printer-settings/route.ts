import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getUserByEmail(email: string) {
  const { data: user, error } = await supabase.from("users").select("id").eq("email", email).maybeSingle()

  if (error) {
    console.error("Erro ao buscar usuário:", error)
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const user = await getUserByEmail(userEmail)

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("key", "printer_settings")
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.error("Erro ao buscar configurações de impressora:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    const printerSettings = settings?.value || {
      defaultPrinter: "",
      showLogo: true,
      showTitle: true,
      showAddress: true,
      showPhone: true,
    }

    return NextResponse.json(printerSettings)
  } catch (error) {
    console.error("Erro ao buscar configurações de impressora:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const user = await getUserByEmail(userEmail)

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { defaultPrinter, showLogo, showTitle, showAddress, showPhone } = body

    const printerSettings = {
      defaultPrinter: defaultPrinter || "",
      showLogo: showLogo !== undefined ? showLogo : true,
      showTitle: showTitle !== undefined ? showTitle : true,
      showAddress: showAddress !== undefined ? showAddress : true,
      showPhone: showPhone !== undefined ? showPhone : true,
    }

    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      key: "printer_settings",
      value: printerSettings,
    })

    if (error) {
      console.error("Erro ao salvar configurações de impressora:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: printerSettings })
  } catch (error) {
    console.error("Erro ao salvar configurações de impressora:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
