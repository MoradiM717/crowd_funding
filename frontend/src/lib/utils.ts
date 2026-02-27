import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function weiToEth(wei: bigint | string | number): string {
  const weiValue = BigInt(wei)
  const eth = Number(weiValue) / 1e18
  return eth.toFixed(6)
}


export function formatEth(wei: bigint | string | number): string {
  return `${weiToEth(wei)} ETH`
}


export function ethToWei(eth: string | number): bigint {
  const ethValue = typeof eth === 'string' ? parseFloat(eth) : eth
  return BigInt(Math.floor(ethValue * 1e18))
}


export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}


export function formatDate(timestamp: number | string): string {
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}


export function formatDateTime(timestamp: number | string): string {
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


export function getTimeRemaining(deadline: number | string): {
  days: number
  hours: number
  minutes: number
  isExpired: boolean
} {
  const now = Date.now()
  const deadlineMs = typeof deadline === 'string'
    ? new Date(deadline).getTime()
    : deadline * 1000
  const diff = Math.floor((deadlineMs - now) / 1000)

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true }
  }

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  return { days, hours, minutes, isExpired: false }
}


export function formatTimeRemaining(deadline: number | string): string {
  const { days, hours, minutes, isExpired } = getTimeRemaining(deadline)

  if (isExpired) return 'Ended'

  if (days > 0) {
    return `${days}d ${hours}h left`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`
  }
  return `${minutes}m left`
}


export function calculateProgress(raised: bigint | string | number, goal: bigint | string | number): number {
  const raisedValue = Number(BigInt(raised))
  const goalValue = Number(BigInt(goal))

  if (goalValue === 0) return 0
  return Math.min((raisedValue / goalValue) * 100, 100)
}


export function formatEthValue(ethValue: string | number, maxDecimals = 4): string {
  const num = typeof ethValue === 'string' ? parseFloat(ethValue) : ethValue
  
  if (isNaN(num)) return '0'
  
  
  if (num > 0 && num < 0.0001) {
    return num.toExponential(2)
  }
  
  
  const formatted = num.toFixed(maxDecimals)
  
  
  if (formatted.includes('.')) {
    return formatted.replace(/\.?0+$/, '')
  }
  
  return formatted
}
