import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { campaignFactoryAbi, campaignAbi, getFactoryAddress, getCampaignConfig } from '@/lib/contracts'


export function useFactoryAddress() {
  const chainId = useChainId()
  return getFactoryAddress(chainId)
}


export function useCreateCampaign() {
  const chainId = useChainId()
  const factoryAddress = getFactoryAddress(chainId)
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createCampaign = async (args: {
    goalEth: string
    deadline: number
    cid: string
  }) => {
    if (!factoryAddress) {
      throw new Error(`Factory address not configured for chain ${chainId}`)
    }

    const goalWei = parseEther(args.goalEth)

    writeContract({
      address: factoryAddress,
      abi: campaignFactoryAbi,
      functionName: 'createCampaign',
      args: [goalWei, BigInt(args.deadline), args.cid],
    })
  }

  return {
    createCampaign,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    factoryAddress,
    chainId,
  }
}


export function useCampaignCount() {
  const chainId = useChainId()
  const factoryAddress = getFactoryAddress(chainId)

  return useReadContract({
    address: factoryAddress,
    abi: campaignFactoryAbi,
    functionName: 'getCampaignCount',
    query: {
      enabled: !!factoryAddress,
    },
  })
}


export function useAllCampaigns() {
  const chainId = useChainId()
  const factoryAddress = getFactoryAddress(chainId)

  return useReadContract({
    address: factoryAddress,
    abi: campaignFactoryAbi,
    functionName: 'getAllCampaigns',
    query: {
      enabled: !!factoryAddress,
    },
  })
}


export function useCreatorCampaignsOnChain(creatorAddress: `0x${string}` | undefined) {
  const chainId = useChainId()
  const factoryAddress = getFactoryAddress(chainId)

  return useReadContract({
    address: factoryAddress,
    abi: campaignFactoryAbi,
    functionName: 'getCampaignsByCreator',
    args: creatorAddress ? [creatorAddress] : undefined,
    query: {
      enabled: !!creatorAddress && !!factoryAddress,
    },
  })
}


export function useDonate(campaignAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const donate = (amountEth: string) => {
    const amountWei = parseEther(amountEth)

    writeContract({
      ...getCampaignConfig(campaignAddress),
      functionName: 'donate',
      value: amountWei,
    })
  }

  return {
    donate,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}


export function useWithdraw(campaignAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const withdraw = () => {
    writeContract({
      ...getCampaignConfig(campaignAddress),
      functionName: 'withdraw',
    })
  }

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}


export function useRefund(campaignAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const refund = () => {
    writeContract({
      ...getCampaignConfig(campaignAddress),
      functionName: 'refund',
    })
  }

  return {
    refund,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}


export function useContributionOf(
  campaignAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'contributionOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!campaignAddress && !!userAddress,
    },
  })
}


export function useCampaignCreator(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'creator',
    query: {
      enabled: !!campaignAddress,
    },
  })
}


export function useCampaignGoal(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'goal',
    query: {
      enabled: !!campaignAddress,
    },
  })
}


export function useCampaignDeadline(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'deadline',
    query: {
      enabled: !!campaignAddress,
    },
  })
}


export function useCampaignTotalRaised(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'totalRaised',
    query: {
      enabled: !!campaignAddress,
    },
  })
}


export function useCampaignWithdrawn(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'withdrawn',
    query: {
      enabled: !!campaignAddress,
    },
  })
}


export function useCampaignCid(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'cid',
    query: {
      enabled: !!campaignAddress,
    },
  })
}


export function useHasRefunded(
  campaignAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: 'hasRefunded',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!campaignAddress && !!userAddress,
    },
  })
}
