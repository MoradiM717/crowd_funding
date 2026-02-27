

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { 
  User, 
  LogOut, 
  ChevronDown, 
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { useAuth, useDisplayName } from '@/contexts/AuthContext'

interface ProfileButtonProps {
  
  variant?: 'desktop' | 'mobile'
}

export function ProfileButton({ variant = 'desktop' }: ProfileButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const { isConnected, isLoading, profile } = useAuth()
  const displayName = useDisplayName()

  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    variant="default"
                    size={variant === 'mobile' ? 'default' : 'sm'}
                    className={variant === 'mobile' ? 'w-full' : ''}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </Button>
                )
              }

              
              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="destructive"
                    size={variant === 'mobile' ? 'default' : 'sm'}
                    className={variant === 'mobile' ? 'w-full' : ''}
                  >
                    Wrong Network
                  </Button>
                )
              }

              
              if (variant === 'mobile') {
                return (
                  <div className="space-y-2">
                    {}
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {isLoading ? 'Loading...' : displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {account.displayName}
                        </p>
                      </div>
                    </Link>

                    {}
                    <div className="flex gap-2">
                      <Button
                        onClick={openChainModal}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {chain.hasIcon && chain.iconUrl && (
                          <img
                            src={chain.iconUrl}
                            alt={chain.name ?? 'Chain'}
                            className="h-4 w-4 mr-2"
                          />
                        )}
                        {chain.name}
                      </Button>
                      <Button
                        onClick={openAccountModal}
                        variant="outline"
                        size="sm"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              }

              
              return (
                <div className="relative" ref={menuRef}>
                  <Button
                    onClick={() => setShowMenu(!showMenu)}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-3"
                  >
                    {}
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        src={chain.iconUrl}
                        alt={chain.name ?? 'Chain'}
                        className="h-4 w-4"
                      />
                    )}
                    
                    {}
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    {}
                    <span className="max-w-[100px] truncate text-sm">
                      {isLoading ? '...' : displayName}
                    </span>
                    
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>

                  {}
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-background border z-50 overflow-hidden">
                      {}
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-center gap-3">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{displayName}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="truncate">{account.displayName}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyAddress(account.address)
                                }}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {copied ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {}
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <User className="mr-3 h-4 w-4 text-muted-foreground" />
                          My Profile
                        </Link>
                        
                        <button
                          onClick={() => {
                            setShowMenu(false)
                            openChainModal()
                          }}
                          className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          {chain.hasIcon && chain.iconUrl && (
                            <img
                              src={chain.iconUrl}
                              alt={chain.name ?? 'Chain'}
                              className="mr-3 h-4 w-4"
                            />
                          )}
                          <span className="flex-1 text-left">{chain.name}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>

                        <a
                          href={`https://etherscan.io/address/${account.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <ExternalLink className="mr-3 h-4 w-4 text-muted-foreground" />
                          View on Explorer
                        </a>
                      </div>

                      {}
                      <div className="border-t py-1">
                        <button
                          onClick={() => {
                            setShowMenu(false)
                            openAccountModal()
                          }}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
