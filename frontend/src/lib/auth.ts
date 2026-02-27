

import { signMessage as wagmiSignMessage } from '@wagmi/core'
import { config } from './wagmi'


const ACCESS_TOKEN_KEY = 'crowdfund_access_token'
const REFRESH_TOKEN_KEY = 'crowdfund_refresh_token'
const PROFILE_KEY = 'crowdfund_profile'


const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'


export interface Profile {
  wallet_address: string
  display_name: string | null
  avatar_cid: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  twitter_handle: string | null
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse {
  access: string
  refresh: string
  profile: Profile
}

export interface NonceResponse {
  wallet_address: string
  nonce: string
  message: string
  expires_in_seconds: number
}


export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AuthError'
  }
}


export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}


export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}


export function getStoredProfile(): Profile | null {
  const stored = localStorage.getItem(PROFILE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}


function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}


function storeProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}


export function clearAuthData(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}


export function isAuthenticated(): boolean {
  return !!getAccessToken()
}


export async function requestNonce(walletAddress: string): Promise<NonceResponse> {
  const response = await fetch(`${API_BASE}/auth/nonce/${walletAddress}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AuthError(error.error || 'Failed to get nonce', 'NONCE_ERROR')
  }

  return response.json()
}


export async function verifySignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/verify/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      signature,
      message,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AuthError(error.error || 'Signature verification failed', 'VERIFY_ERROR')
  }

  return response.json()
}


export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    throw new AuthError('No refresh token available', 'NO_REFRESH_TOKEN')
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh: refreshToken,
    }),
  })

  if (!response.ok) {
    
    clearAuthData()
    throw new AuthError('Session expired. Please sign in again.', 'REFRESH_FAILED')
  }

  const data = await response.json()
  
  
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
  
  return data.access
}


export async function logout(): Promise<void> {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  
  clearAuthData()

  
  if (accessToken && refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      })
    } catch {
      
    }
  }
}


export async function connectWallet(walletAddress: string): Promise<Profile> {
  const response = await fetch(`${API_BASE}/profiles/connect/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AuthError(error.error || 'Failed to connect wallet', 'CONNECT_ERROR')
  }

  const data = await response.json()
  
  
  storeProfile(data.profile)
  
  return data.profile
}


export async function login(walletAddress: string): Promise<Profile> {
  
  const nonceResponse = await requestNonce(walletAddress)
  
  
  const signature = await wagmiSignMessage(config, {
    message: nonceResponse.message,
  })
  
  
  const authResponse = await verifySignature(
    walletAddress,
    signature,
    nonceResponse.message
  )
  
  
  storeTokens({
    access: authResponse.access,
    refresh: authResponse.refresh,
  })
  storeProfile(authResponse.profile)
  
  return authResponse.profile
}


export async function fetchCurrentProfile(): Promise<Profile> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED')
  }

  const response = await fetch(`${API_BASE}/auth/me/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (response.status === 401) {
    
    try {
      const newToken = await refreshAccessToken()
      
      
      const retryResponse = await fetch(`${API_BASE}/auth/me/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        },
      })
      
      if (!retryResponse.ok) {
        throw new AuthError('Failed to fetch profile', 'PROFILE_ERROR')
      }
      
      return retryResponse.json()
    } catch {
      clearAuthData()
      throw new AuthError('Session expired. Please sign in again.', 'SESSION_EXPIRED')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AuthError(error.error || 'Failed to fetch profile', 'PROFILE_ERROR')
  }

  const profile = await response.json()
  storeProfile(profile)
  
  return profile
}


export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    throw new AuthError('Not authenticated', 'NOT_AUTHENTICATED')
  }

  const response = await fetch(`${API_BASE}/profiles/me/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  })

  if (response.status === 401) {
    
    const newToken = await refreshAccessToken()
    
    
    const retryResponse = await fetch(`${API_BASE}/profiles/me/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
      },
      body: JSON.stringify(updates),
    })
    
    if (!retryResponse.ok) {
      throw new AuthError('Failed to update profile', 'UPDATE_ERROR')
    }
    
    const profile = await retryResponse.json()
    storeProfile(profile)
    return profile
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AuthError(error.error || 'Failed to update profile', 'UPDATE_ERROR')
  }

  const profile = await response.json()
  storeProfile(profile)
  
  return profile
}


export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken()
  if (!token) return {}
  return {
    'Authorization': `Bearer ${token}`,
  }
}


export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}


export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  
  
  const expiresAt = payload.exp * 1000
  return Date.now() > expiresAt - 30000
}


export async function ensureValidToken(): Promise<string | null> {
  const accessToken = getAccessToken()
  
  if (!accessToken) return null
  
  if (isTokenExpired(accessToken)) {
    try {
      return await refreshAccessToken()
    } catch {
      return null
    }
  }
  
  return accessToken
}
