

import { shortenAddress } from './utils'
import type { Profile } from '@/types/api'


export function getDisplayName(
  address: string,
  profiles: Map<string, Profile> | Record<string, Profile | null>
): string {
  if (!address) return 'Unknown'
  
  const normalizedAddress = address.toLowerCase()
  
  
  if (profiles instanceof Map) {
    const profile = profiles.get(normalizedAddress)
    if (profile?.display_name) {
      return profile.display_name
    }
  } else {
    
    const profile = profiles[normalizedAddress]
    if (profile?.display_name) {
      return profile.display_name
    }
  }
  
  return shortenAddress(address)
}


export function getProfile(
  address: string,
  profiles: Map<string, Profile> | Record<string, Profile | null>
): Profile | null {
  if (!address) return null
  
  const normalizedAddress = address.toLowerCase()
  
  if (profiles instanceof Map) {
    return profiles.get(normalizedAddress) || null
  }
  
  return profiles[normalizedAddress] || null
}


export function createProfilesMap(profiles: Profile[]): Map<string, Profile> {
  return new Map(
    profiles.map((p) => [p.wallet_address.toLowerCase(), p])
  )
}


export function extractAddresses<T extends { creator_address?: string; donor_address?: string }>(
  items: T[]
): string[] {
  const addresses = new Set<string>()
  
  for (const item of items) {
    if (item.creator_address) {
      addresses.add(item.creator_address.toLowerCase())
    }
    if (item.donor_address) {
      addresses.add(item.donor_address.toLowerCase())
    }
  }
  
  return Array.from(addresses)
}
