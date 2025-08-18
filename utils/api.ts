const EVOLUTION_API_BASE_URL = "https://evo.anafood.vip"

export const callEvolutionAPI = async (endpoint: string, method = "GET", body?: any) => {
  const apiKey = process.env.EVOLUTION_API_KEY
  if (!apiKey) {
    throw new Error("API Key não configurada.")
  }

  try {
    const url = `${EVOLUTION_API_BASE_URL}${endpoint}`
    console.log(`Chamando API: ${method} ${url}`)

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    console.log(`Response status: ${response.status}`)

    const responseText = await response.text()
    console.log(`Response text (first 200 chars):`, responseText.substring(0, 200))

    if (responseText.trim().startsWith("<!DOCTYPE") || responseText.trim().startsWith("<html")) {
      console.error("API retornou HTML em vez de JSON. Possível problema de URL ou servidor.")
      throw new Error(
        `Servidor retornou HTML em vez de JSON. Verifique se a URL ${EVOLUTION_API_BASE_URL} está correta e se a Evolution API está rodando.`,
      )
    }

    if (!response.ok) {
      console.error(`API Error Response: ${responseText}`)

      if (response.status === 401) {
        throw new Error(`Erro de autenticação: API Key inválida ou expirada. Verifique sua API Key nas configurações.`)
      }

      if (response.status === 404) {
        throw new Error(`Endpoint não encontrado: ${url}. Verifique se a URL da API está correta.`)
      }

      throw new Error(`API Error: ${response.status} - ${response.statusText}`)
    }

    try {
      return JSON.parse(responseText)
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError)
      throw new Error(`Resposta da API não é JSON válido. Resposta: ${responseText.substring(0, 100)}...`)
    }
  } catch (error) {
    console.error("Erro na chamada da API:", error)
    throw error
  }
}
