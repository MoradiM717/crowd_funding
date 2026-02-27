

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import {
  Profile,
  connectWallet,
  login as authLogin,
  logout as authLogout,
  getStoredProfile,
  getAccessToken,
  clearAuthData,
  isTokenExpired,
  refreshAccessToken,
  AuthError,
} from '@/lib/auth'

interface AuthContextValue {
  
  isConnected: boolean          
  isAuthenticated: boolean      
  isLoading: boolean
  profile: Profile | null
  error: string | null
  
  
  signIn: () => Promise<void>   
  signOut: () => Promise<void>  
  refreshProfile: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)


const REFRESH_INTERVAL = 50 * 60 * 1000

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, isConnected: walletConnected } = useAccount()
  const { disconnect } = useDisconnect()
  
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  
  const lastConnectedAddress = useRef<string | null>(null)

  
  useEffect(() => {
    const handleWalletConnect = async () => {
      if (!walletConnected || !address) {
        
        if (profile) {
          clearAuthData()
          setProfile(null)
          setIsAuthenticated(false)
          lastConnectedAddress.current = null
        }
        return
      }

      
      if (lastConnectedAddress.current?.toLowerCase() === address.toLowerCase()) {
        return
      }

      
      setIsLoading(true)
      setError(null)

      
      if (lastConnectedAddress.current && lastConnectedAddress.current.toLowerCase() !== address.toLowerCase()) {
        clearAuthData()
        setIsAuthenticated(false)
      }

      try {
        
        const userProfile = await connectWallet(address)
        setProfile(userProfile)
        lastConnectedAddress.current = address
        
        
        const storedProfile = getStoredProfile()
        const accessToken = getAccessToken()
        
        if (storedProfile?.wallet_address.toLowerCase() === address.toLowerCase() && accessToken) {
          if (!isTokenExpired(accessToken)) {
            setIsAuthenticated(true)
          } else {
            
            try {
              await refreshAccessToken()
              setIsAuthenticated(true)
            } catch {
              setIsAuthenticated(false)
            }
          }
        }
      } catch (err) {
        console.error('Error connecting wallet:', err)
        if (err instanceof AuthError) {
          setError(err.message)
        } else {
          setError('Failed to connect wallet')
        }
      } finally {
        setIsLoading(false)
      }
    }

    handleWalletConnect()
  }, [walletConnected, address])

  
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      const token = getAccessToken()
      if (token && isTokenExpired(token)) {
        try {
          await refreshAccessToken()
        } catch {
          
          setIsAuthenticated(false)
        }
      }
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  
  const signIn = useCallback(async () => {
    if (!address) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userProfile = await authLogin(address)
      setProfile(userProfile)
      setIsAuthenticated(true)
    } catch (err) {
      console.error('Sign in error:', err)
      if (err instanceof AuthError) {
        setError(err.message)
      } else if (err instanceof Error) {
        
        if (err.message.includes('rejected') || err.message.includes('denied')) {
          setError('Signature request was rejected')
        } else {
          setError(err.message || 'Sign in failed')
        }
      } else {
        setError('Sign in failed')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [address])

  
  const signOut = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await authLogout()
    } catch (err) {
      console.error('Sign out error:', err)
      
    } finally {
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }, [])

  
  const refreshProfile = useCallback(async () => {
    if (!address) return

    try {
      const userProfile = await connectWallet(address)
      setProfile(userProfile)
    } catch (err) {
      console.error('Error refreshing profile:', err)
    }
  }, [address])

  
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = useMemo(() => ({
    isConnected: walletConnected,
    isAuthenticated,
    isLoading,
    profile,
    error,
    signIn,
    signOut,
    refreshProfile,
    clearError,
  }), [walletConnected, isAuthenticated, isLoading, profile, error, signIn, signOut, refreshProfile, clearError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


export function useDisplayName(): string {
  const { profile, isConnected } = useAuth()
  const { address } = useAccount()
  
  if (profile?.display_name) {
    return profile.display_name
  }
  
  if (profile || isConnected) {
    return 'Anonymous User'
  }
  
  if (address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  return 'Not Connected'
}
