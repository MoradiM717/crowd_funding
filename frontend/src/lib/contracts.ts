import CampaignFactoryABI from './abi/CampaignFactory.json'
import CampaignABI from './abi/Campaign.json'

export const campaignFactoryAbi = CampaignFactoryABI
export const campaignAbi = CampaignABI


const FACTORY_ADDRESSES: Record<number, `0x${string}` | undefined> = {
  
  31337: import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}` | undefined,
  
  11155111: import.meta.env.VITE_SEPOLIA_FACTORY_ADDRESS as `0x${string}` | undefined,
  
  1: import.meta.env.VITE_MAINNET_FACTORY_ADDRESS as `0x${string}` | undefined,
}


export const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}` | undefined


export function getFactoryAddress(chainId: number): `0x${string}` | undefined {
  return FACTORY_ADDRESSES[chainId] || FACTORY_ADDRESS
}


export function getFactoryConfig(chainId: number) {
  return {
    address: getFactoryAddress(chainId),
    abi: campaignFactoryAbi,
  } as const
}


export const campaignFactoryConfig = {
  address: FACTORY_ADDRESS,
  abi: campaignFactoryAbi,
} as const

export function getCampaignConfig(address: `0x${string}`) {
  return {
    address,
    abi: campaignAbi,
  } as const
}
