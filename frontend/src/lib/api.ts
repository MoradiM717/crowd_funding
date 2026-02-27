import type {
  Campaign,
  CampaignDetail,
  CampaignWithMetadata,
  CampaignMetadata,
  Contribution,
  ContributionWithCampaign,
  BlockchainEvent,
  PlatformStats,
  TrendingResponse,
  LeaderboardResponse,
  CampaignLeaderboardEntry,
  DonorLeaderboardEntry,
  CreatorStats,
  PaginatedResponse,
  CampaignFilters,
  TrendingFilters,
  Chain,
  SyncState,
  Profile,
  ProfileBatchResponse,
} from '@/types/api'
import { getAccessToken, refreshAccessToken, clearAuthData, isTokenExpired } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}


function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken()
  if (!token) return {}
  return {
    'Authorization': `Bearer ${token}`,
  }
}


async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { requireAuth?: boolean }
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const { requireAuth, ...fetchOptions } = options || {}
  
  
  const accessToken = getAccessToken()
  if (accessToken && isTokenExpired(accessToken)) {
    try {
      await refreshAccessToken()
    } catch {
      
      clearAuthData()
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(fetchOptions?.headers as Record<string, string> || {}),
  }
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  
  if (response.status === 401) {
    try {
      await refreshAccessToken()
      
      
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...headers,
          ...getAuthHeaders(),
        },
      })
      
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({}))
        throw new ApiError(
          retryResponse.status,
          errorData.detail || errorData.error || `HTTP ${retryResponse.status}`
        )
      }
      
      return retryResponse.json()
    } catch (refreshError) {
      
      clearAuthData()
      throw new ApiError(401, 'Session expired. Please sign in again.')
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorData.detail || errorData.error || `HTTP ${response.status}`
    )
  }

  return response.json()
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}


export const chainsApi = {
  list: () => fetchApi<Chain[]>('/chains/'),

  get: (chainId: number) => fetchApi<Chain>(`/chains/${chainId}/`),

  getSyncState: (chainId: number) =>
    fetchApi<SyncState>(`/chains/${chainId}/sync-state/`),
}


export const campaignsApi = {
  list: (filters?: CampaignFilters) => {
    const params = filters?.include_metadata
      ? { ...filters, include_metadata: 'true' }
      : filters
    return fetchApi<PaginatedResponse<CampaignWithMetadata>>(
      `/campaigns/${buildQueryString(params || {})}`
    )
  },

  get: (address: string, includeMetadata = true) =>
    fetchApi<CampaignDetail>(
      `/campaigns/${address}/${buildQueryString({ include_metadata: includeMetadata })}`
    ),

  getMetadata: (address: string) =>
    fetchApi<CampaignMetadata>(`/campaigns/${address}/metadata/`),

  refreshMetadata: (address: string) =>
    fetchApi<CampaignMetadata>(`/campaigns/${address}/metadata/refresh/`, {
      method: 'POST',
    }),

  getContributions: (address: string, page = 1, pageSize = 20) =>
    fetchApi<PaginatedResponse<Contribution>>(
      `/campaigns/${address}/contributions/${buildQueryString({ page, page_size: pageSize })}`
    ),

  getEvents: (address: string, filters?: { event_name?: string; removed?: boolean }) =>
    fetchApi<PaginatedResponse<BlockchainEvent>>(
      `/campaigns/${address}/events/${buildQueryString(filters || {})}`
    ),
}


export const creatorsApi = {
  getCampaigns: (creatorAddress: string, filters?: CampaignFilters) =>
    fetchApi<PaginatedResponse<Campaign>>(
      `/creators/${creatorAddress}/campaigns/${buildQueryString(filters || {})}`
    ),
}


export const donorsApi = {
  getContributions: (donorAddress: string, page = 1, pageSize = 20) =>
    fetchApi<PaginatedResponse<ContributionWithCampaign>>(
      `/donors/${donorAddress}/contributions/${buildQueryString({ page, page_size: pageSize })}`
    ),
}


export const eventsApi = {
  list: (filters?: {
    chain_id?: number
    event_name?: string
    address?: string
    block_number_gte?: number
    block_number_lte?: number
    tx_hash?: string
    removed?: boolean
    page?: number
  }) =>
    fetchApi<PaginatedResponse<BlockchainEvent>>(
      `/events/${buildQueryString(filters || {})}`
    ),

  get: (id: number) => fetchApi<BlockchainEvent>(`/events/${id}/`),
}


export const statsApi = {
  getPlatform: () => fetchApi<PlatformStats>('/stats/platform/'),

  getTrending: (filters?: TrendingFilters) =>
    fetchApi<TrendingResponse>(`/stats/trending/${buildQueryString(filters || {})}`),

  getCampaignLeaderboard: (params?: { limit?: number; offset?: number; status?: string }) =>
    fetchApi<LeaderboardResponse<CampaignLeaderboardEntry>>(
      `/stats/leaderboard/campaigns/${buildQueryString(params || {})}`
    ),

  getDonorLeaderboard: (params?: { limit?: number; offset?: number }) =>
    fetchApi<LeaderboardResponse<DonorLeaderboardEntry>>(
      `/stats/leaderboard/donors/${buildQueryString(params || {})}`
    ),

  getCreatorStats: (creatorAddress: string) =>
    fetchApi<CreatorStats>(`/stats/creator/${creatorAddress}/`),
}


export const profilesApi = {
  

  get: (walletAddress: string) =>
    fetchApi<Profile>(`/profiles/${walletAddress}/`),

  
  batch: (addresses: string[]) =>
    fetchApi<ProfileBatchResponse>(
      `/profiles/batch/${buildQueryString({ addresses: addresses.join(',') })}`
    ),

  
  list: (params?: { page?: number; search?: string }) =>
    fetchApi<PaginatedResponse<Profile>>(
      `/profiles/${buildQueryString(params || {})}`
    ),

  
  me: () =>
    fetchApi<Profile>('/profiles/me/', { requireAuth: true }),

  
  updateMe: (data: Partial<Profile>) =>
    fetchApi<Profile>('/profiles/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
      requireAuth: true,
    }),
}


export const api = {
  chains: chainsApi,
  campaigns: campaignsApi,
  creators: creatorsApi,
  donors: donorsApi,
  events: eventsApi,
  stats: statsApi,
  profiles: profilesApi,
}

export { ApiError }
