"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "react-hot-toast"

interface SettingsContextType {
  settings: Record<string, any>
  updateSetting: (key: string, value: any) => Promise<void>
  getSetting: (key: string, defaultValue?: any) => any
  loading: boolean
  error: string | null
}

interface CacheEntry {
  data: Record<string, any>
  timestamp: number
  loading: boolean
}

const settingsCache = new Map<string, CacheEntry>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
const DEBOUNCE_DELAY = 500 // 500ms - mais responsivo
const activeRequests = new Map<string, Promise<any>>()
const pendingUpdates = new Map<string, Record<string, any>>()
const debounceTimers = new Map<string, NodeJS.Timeout>()

// Cache local usando localStorage para persistência entre sessões
const LOCAL_STORAGE_KEY = "ana_food_settings_cache"

function getLocalStorageCache(userId: string): Record<string, any> | null {
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Verificar se o cache não expirou (24 horas)
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data
      }
    }
  } catch (error) {
    console.error("Erro ao ler cache local:", error)
  }
  return null
}

function setLocalStorageCache(userId: string, data: Record<string, any>) {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY}_${userId}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("Erro ao salvar cache local:", error)
  }
}

// Hook para gerenciar configurações do usuário
export function useSettings(userId = "default-user"): SettingsContextType {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const isCacheValid = useCallback((cacheEntry: CacheEntry) => {
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION
  }, [])

  const flushPendingUpdates = useCallback(async (userId: string) => {
    const pending = pendingUpdates.get(userId)
    if (!pending || Object.keys(pending).length === 0) return

    try {
      // Salvar todas as configurações pendentes de uma vez
      for (const [key, value] of Object.entries(pending)) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, key, value }),
        })
      }

      // Limpar pendências após sucesso
      pendingUpdates.delete(userId)
      console.log("[v0] Configurações sincronizadas com o banco:", Object.keys(pending))
    } catch (error) {
      console.error("Erro ao sincronizar configurações:", error)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const localCache = getLocalStorageCache(userId)
      if (localCache) {
        setSettings(localCache)
        setLoading(false)
        // Continuar carregando do servidor em background para sincronizar
      }

      // Verificar cache em memória
      const cacheKey = `settings_${userId}`
      const cached = settingsCache.get(cacheKey)

      if (cached && isCacheValid(cached)) {
        setSettings(cached.data)
        setLoading(false)
        return
      }

      // Verificar se já há uma requisição em andamento
      if (activeRequests.has(cacheKey)) {
        const result = await activeRequests.get(cacheKey)
        setSettings(result)
        setLoading(false)
        return
      }

      if (!localCache) setLoading(true)
      setError(null)

      const requestPromise = fetch(`/api/settings?userId=${userId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.settings) {
            settingsCache.set(cacheKey, {
              data: data.settings,
              timestamp: Date.now(),
              loading: false,
            })
            setLocalStorageCache(userId, data.settings)
            return data.settings
          } else {
            throw new Error(data.error || "Erro ao carregar configurações")
          }
        })
        .finally(() => {
          activeRequests.delete(cacheKey)
        })

      activeRequests.set(cacheKey, requestPromise)
      const result = await requestPromise

      if (mountedRef.current) {
        setSettings(result)
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")

        // Usar configurações padrão em caso de erro
        const defaultSettings = getDefaultSettings()
        setSettings(defaultSettings)
        setLocalStorageCache(userId, defaultSettings)

        settingsCache.set(`settings_${userId}`, {
          data: defaultSettings,
          timestamp: Date.now(),
          loading: false,
        })
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [userId, isCacheValid])

  const updateSetting = useCallback(
    async (key: string, value: any) => {
      try {
        const newSettings = {
          ...settings,
          [key]: value,
        }
        setSettings(newSettings)

        // Atualizar cache local imediatamente
        setLocalStorageCache(userId, newSettings)

        const cacheKey = `settings_${userId}`
        settingsCache.set(cacheKey, {
          data: newSettings,
          timestamp: Date.now(),
          loading: false,
        })

        const currentPending = pendingUpdates.get(userId) || {}
        pendingUpdates.set(userId, {
          ...currentPending,
          [key]: value,
        })

        const existingTimer = debounceTimers.get(userId)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        const newTimer = setTimeout(() => {
          flushPendingUpdates(userId)
          debounceTimers.delete(userId)
        }, DEBOUNCE_DELAY)

        debounceTimers.set(userId, newTimer)

        // Feedback imediato sem esperar o banco
        console.log(`[v0] Configuração ${key} atualizada localmente, salvando no banco em ${DEBOUNCE_DELAY / 1000}s`)
      } catch (err) {
        console.error("Erro ao atualizar configuração:", err)
        toast.error("Erro ao salvar configuração")
        throw err
      }
    },
    [userId, settings, flushPendingUpdates],
  )

  // Obter configuração específica com valor padrão
  const getSetting = useCallback(
    (key: string, defaultValue: any = null) => {
      const value = settings[key]
      return value !== undefined ? value : defaultValue
    },
    [settings],
  )

  useEffect(() => {
    return () => {
      mountedRef.current = false
      // Salvar pendências imediatamente ao sair
      const pending = pendingUpdates.get(userId)
      if (pending && Object.keys(pending).length > 0) {
        flushPendingUpdates(userId)
      }

      // Limpar timers
      const timer = debounceTimers.get(userId)
      if (timer) {
        clearTimeout(timer)
        debounceTimers.delete(userId)
      }
    }
  }, [userId, flushPendingUpdates])

  // Carregar configurações na inicialização
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    const handleBeforeUnload = () => {
      const pending = pendingUpdates.get(userId)
      if (pending && Object.keys(pending).length > 0) {
        // Usar sendBeacon para envio assíncrono confiável
        navigator.sendBeacon(
          "/api/settings",
          JSON.stringify({
            userId,
            settings: pending,
          }),
        )
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [userId])

  return {
    settings,
    updateSetting,
    getSetting,
    loading,
    error,
  }
}

// Configurações padrão de fallback
function getDefaultSettings() {
  return {
    auto_accept: { enabled: false },
    sound_enabled: { enabled: true },
    visible_columns: {
      novo: true,
      preparando: true,
      pronto: true,
      em_entrega: true,
      concluido: true,
      cancelado: false,
    },
    inactivity_alert: { minutes: 30 },
    default_filter: { status: ["novo", "preparando"] },
    notification_settings: {
      new_order: true,
      order_ready: true,
      order_delayed: true,
    },
    theme_settings: { mode: "light", color: "blue" },
    printer_settings: { auto_print: false, copies: 1 },
    order_display: {
      show_customer_info: true,
      show_payment_method: true,
      show_address: true,
    },
  }
}
