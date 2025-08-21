export interface PaginationParams {
  page: number
  limit: number
  search?: string
  filters?: Record<string, any>
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters?: Record<string, any>
}

export function buildPaginationQuery(params: PaginationParams) {
  const { page = 1, limit = 10, search, filters = {} } = params
  const offset = (page - 1) * limit

  return {
    offset,
    limit,
    search,
    filters,
    page,
  }
}

export function createPaginationResult<T>(data: T[], total: number, params: PaginationParams): PaginationResult<T> {
  const { page, limit, filters } = params
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    filters,
  }
}

export function parseUrlFilters(searchParams: URLSearchParams): Record<string, any> {
  const filters: Record<string, any> = {}

  for (const [key, value] of searchParams.entries()) {
    if (key !== "page" && key !== "limit" && value) {
      filters[key] = value
    }
  }

  return filters
}

export function buildUrlWithFilters(
  baseUrl: string,
  page: number,
  limit: number,
  filters: Record<string, any>,
): string {
  const url = new URL(baseUrl, window.location.origin)
  url.searchParams.set("page", page.toString())
  url.searchParams.set("limit", limit.toString())

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value.toString())
    }
  })

  return url.toString()
}
