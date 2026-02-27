import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CampaignFilters, TrendingFilters } from '@/types/api'


export const queryKeys = {
  chains: {
    all: ['chains'] as const,
    list: () => [...queryKeys.chains.all, 'list'] as const,
    detail: (chainId: number) => [...queryKeys.chains.all, chainId] as const,
    syncState: (chainId: number) => [...queryKeys.chains.all, chainId, 'sync-state'] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    list: (filters?: CampaignFilters) => [...queryKeys.campaigns.all, 'list', filters] as const,
    detail: (address: string) => [...queryKeys.campaigns.all, address] as const,
    metadata: (address: string) => [...queryKeys.campaigns.all, address, 'metadata'] as const,
    contributions: (address: string, page?: number) =>
      [...queryKeys.campaigns.all, address, 'contributions', page] as const,
    events: (address: string) => [...queryKeys.campaigns.all, address, 'events'] as const,
  },
  creators: {
    campaigns: (address: string, filters?: CampaignFilters) =>
      ['creators', address, 'campaigns', filters] as const,
  },
  donors: {
    contributions: (address: string, page?: number) =>
      ['donors', address, 'contributions', page] as const,
  },
  events: {
    all: ['events'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.events.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.events.all, id] as const,
  },
  stats: {
    platform: ['stats', 'platform'] as const,
    trending: (filters?: TrendingFilters) => ['stats', 'trending', filters] as const,
    campaignLeaderboard: (params?: Record<string, unknown>) =>
      ['stats', 'leaderboard', 'campaigns', params] as const,
    donorLeaderboard: (params?: Record<string, unknown>) =>
      ['stats', 'leaderboard', 'donors', params] as const,
    creator: (address: string) => ['stats', 'creator', address] as const,
  },
}


export function useChains() {
  return useQuery({
    queryKey: queryKeys.chains.list(),
    queryFn: () => api.chains.list(),
  })
}

export function useChain(chainId: number) {
  return useQuery({
    queryKey: queryKeys.chains.detail(chainId),
    queryFn: () => api.chains.get(chainId),
    enabled: !!chainId,
  })
}

export function useSyncState(chainId: number) {
  return useQuery({
    queryKey: queryKeys.chains.syncState(chainId),
    queryFn: () => api.chains.getSyncState(chainId),
    enabled: !!chainId,
  })
}


export function useCampaigns(filters?: CampaignFilters) {
  return useQuery({
    queryKey: queryKeys.campaigns.list(filters),
    queryFn: () => api.campaigns.list(filters),
  })
}

export function useCampaign(address: string, includeMetadata = true) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(address),
    queryFn: () => api.campaigns.get(address, includeMetadata),
    enabled: !!address,
  })
}

export function useCampaignMetadata(address: string) {
  return useQuery({
    queryKey: queryKeys.campaigns.metadata(address),
    queryFn: () => api.campaigns.getMetadata(address),
    enabled: !!address,
    retry: false, 
  })
}

export function useRefreshMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (address: string) => api.campaigns.refreshMetadata(address),
    onSuccess: (data, address) => {
      
      queryClient.setQueryData(queryKeys.campaigns.metadata(address), data)
      
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.detail(address) })
    },
  })
}

export function useCampaignContributions(address: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.campaigns.contributions(address, page),
    queryFn: () => api.campaigns.getContributions(address, page, pageSize),
    enabled: !!address,
  })
}

export function useCampaignEvents(address: string, filters?: { event_name?: string; removed?: boolean }) {
  return useQuery({
    queryKey: queryKeys.campaigns.events(address),
    queryFn: () => api.campaigns.getEvents(address, filters),
    enabled: !!address,
  })
}


export function useCreatorCampaigns(creatorAddress: string, filters?: CampaignFilters) {
  return useQuery({
    queryKey: queryKeys.creators.campaigns(creatorAddress, filters),
    queryFn: () => api.creators.getCampaigns(creatorAddress, filters),
    enabled: !!creatorAddress,
  })
}


export function useDonorContributions(donorAddress: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.donors.contributions(donorAddress, page),
    queryFn: () => api.donors.getContributions(donorAddress, page),
    enabled: !!donorAddress,
  })
}


export function useEvents(filters?: Parameters<typeof api.events.list>[0]) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => api.events.list(filters),
  })
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => api.events.get(id),
    enabled: !!id,
  })
}


export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.stats.platform,
    queryFn: () => api.stats.getPlatform(),
    staleTime: 1000 * 60 * 5, 
  })
}

export function useTrendingCampaigns(filters?: TrendingFilters) {
  return useQuery({
    queryKey: queryKeys.stats.trending(filters),
    queryFn: () => api.stats.getTrending(filters),
    staleTime: 1000 * 60 * 5, 
  })
}

export function useCampaignLeaderboard(params?: { limit?: number; offset?: number; status?: string }) {
  return useQuery({
    queryKey: queryKeys.stats.campaignLeaderboard(params),
    queryFn: () => api.stats.getCampaignLeaderboard(params),
    staleTime: 1000 * 60 * 5, 
  })
}

export function useDonorLeaderboard(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.stats.donorLeaderboard(params),
    queryFn: () => api.stats.getDonorLeaderboard(params),
    staleTime: 1000 * 60 * 5, 
  })
}

export function useCreatorStats(creatorAddress: string) {
  return useQuery({
    queryKey: queryKeys.stats.creator(creatorAddress),
    queryFn: () => api.stats.getCreatorStats(creatorAddress),
    enabled: !!creatorAddress,
  })
}


export function useDonorStats(donorAddress: string) {
  return useQuery({
    queryKey: ['donors', donorAddress, 'stats'] as const,
    queryFn: async () => {
      const contributions = await api.donors.getContributions(donorAddress, 1, 1000)
      
      const totalContributed = contributions.results.reduce(
        (sum, c) => sum + BigInt(c.contributed_wei),
        BigInt(0)
      )
      const uniqueCampaigns = new Set(contributions.results.map(c => c.campaign_address))

      return {
        donor_address: donorAddress,
        total_contributions: contributions.count,
        total_donated_wei: totalContributed.toString(),
        total_donated_eth: (Number(totalContributed) / 1e18).toFixed(6),
        campaigns_supported: uniqueCampaigns.size,
      }
    },
    enabled: !!donorAddress,
  })
}


export function useProfile(walletAddress: string) {
  return useQuery({
    queryKey: ['profiles', walletAddress.toLowerCase()] as const,
    queryFn: () => api.profiles.get(walletAddress),
    enabled: !!walletAddress,
    retry: false, 
  })
}

export function useProfiles(addresses: string[]) {
  
  const uniqueAddresses = [...new Set(addresses.map(a => a.toLowerCase()))]
  
  return useQuery({
    queryKey: ['profiles', 'batch', uniqueAddresses.sort().join(',')] as const,
    queryFn: () => api.profiles.batch(uniqueAddresses),
    enabled: uniqueAddresses.length > 0,
    staleTime: 1000 * 60 * 5, 
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof api.profiles.updateMe>[0]) =>
      api.profiles.updateMe(data),
    onSuccess: (data) => {
      
      queryClient.setQueryData(['profiles', data.wallet_address.toLowerCase()], data)
      
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
