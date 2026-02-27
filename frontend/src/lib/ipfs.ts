

const PINATA_API_URL = 'https://api.pinata.cloud'
const PINATA_UPLOAD_URL = `${PINATA_API_URL}/pinning/pinFileToIPFS`
const PINATA_JSON_URL = `${PINATA_API_URL}/pinning/pinJSONToIPFS`


const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'


export interface CampaignMetadata {
  name: string
  description: string
  short_description?: string
  image?: string  
  category?: string
  tags?: string[]
  location?: string
  creator_name?: string
  website_url?: string
  twitter_handle?: string
  discord_url?: string
}

export interface IPFSUploadResult {
  cid: string
  url: string
  size?: number
}

export class IPFSError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'IPFSError'
  }
}


function getPinataHeaders(): Record<string, string> {
  
  const jwt = import.meta.env.VITE_PINATA_JWT
  if (jwt) {
    return {
      'Authorization': `Bearer ${jwt}`,
    }
  }

  
  const apiKey = import.meta.env.VITE_PINATA_API_KEY
  const apiSecret = import.meta.env.VITE_PINATA_SECRET

  if (apiKey && apiSecret) {
    return {
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': apiSecret,
    }
  }

  
  if (apiKey && !apiSecret) {
    throw new IPFSError(
      'Pinata API key found but secret is missing. Add VITE_PINATA_SECRET to your .env file, or use VITE_PINATA_JWT instead.',
      'MISSING_SECRET'
    )
  }

  throw new IPFSError(
    'Pinata not configured. Set either VITE_PINATA_JWT or both VITE_PINATA_API_KEY and VITE_PINATA_SECRET in your .env file.',
    'NO_CREDENTIALS'
  )
}


export function getIPFSGateway(): string {
  return import.meta.env.VITE_IPFS_GATEWAY || DEFAULT_GATEWAY
}


export function cidToUrl(cid: string): string {
  if (!cid) return ''
  
  
  if (cid.startsWith('ipfs://')) {
    cid = cid.replace('ipfs://', '')
  }
  
  const gateway = getIPFSGateway()
  return `${gateway}${cid}`
}


export function isPinataConfigured(): boolean {
  
  if (import.meta.env.VITE_PINATA_JWT) {
    return true
  }
  
  if (import.meta.env.VITE_PINATA_API_KEY && import.meta.env.VITE_PINATA_SECRET) {
    return true
  }
  return false
}


export async function uploadFileToIPFS(
  file: File,
  name?: string
): Promise<IPFSUploadResult> {
  const headers = getPinataHeaders()
  
  const formData = new FormData()
  formData.append('file', file)
  
  
  const metadata = JSON.stringify({
    name: name || file.name,
  })
  formData.append('pinataMetadata', metadata)
  
  
  const options = JSON.stringify({
    cidVersion: 1,
  })
  formData.append('pinataOptions', options)
  
  try {
    const response = await fetch(PINATA_UPLOAD_URL, {
      method: 'POST',
      headers,
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new IPFSError(
        error.error?.message || error.message || `Upload failed: ${response.status}`,
        'UPLOAD_FAILED'
      )
    }
    
    const data = await response.json()
    
    return {
      cid: data.IpfsHash,
      url: cidToUrl(data.IpfsHash),
      size: data.PinSize,
    }
  } catch (error) {
    if (error instanceof IPFSError) throw error
    throw new IPFSError(
      error instanceof Error ? error.message : 'Failed to upload file to IPFS',
      'UPLOAD_ERROR'
    )
  }
}


export async function uploadImageToIPFS(file: File): Promise<IPFSUploadResult> {
  
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!validTypes.includes(file.type)) {
    throw new IPFSError(
      `Invalid image type: ${file.type}. Supported: JPEG, PNG, GIF, WebP, SVG`,
      'INVALID_TYPE'
    )
  }
  
  
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new IPFSError(
      `Image too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 10MB`,
      'FILE_TOO_LARGE'
    )
  }
  
  return uploadFileToIPFS(file, `campaign-image-${Date.now()}`)
}


export async function uploadJSONToIPFS(
  metadata: Record<string, unknown>,
  name?: string
): Promise<IPFSUploadResult> {
  const headers = getPinataHeaders()
  
  const body = {
    pinataContent: metadata,
    pinataMetadata: {
      name: name || `metadata-${Date.now()}`,
    },
    pinataOptions: {
      cidVersion: 1,
    },
  }
  
  try {
    const response = await fetch(PINATA_JSON_URL, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new IPFSError(
        error.error?.message || error.message || `Upload failed: ${response.status}`,
        'UPLOAD_FAILED'
      )
    }
    
    const data = await response.json()
    
    return {
      cid: data.IpfsHash,
      url: cidToUrl(data.IpfsHash),
      size: data.PinSize,
    }
  } catch (error) {
    if (error instanceof IPFSError) throw error
    throw new IPFSError(
      error instanceof Error ? error.message : 'Failed to upload JSON to IPFS',
      'UPLOAD_ERROR'
    )
  }
}


export async function uploadCampaignMetadata(
  metadata: CampaignMetadata,
  imageFile?: File
): Promise<IPFSUploadResult> {
  let imageCid: string | undefined
  
  
  if (imageFile) {
    const imageResult = await uploadImageToIPFS(imageFile)
    imageCid = imageResult.cid
  }
  
  
  const fullMetadata: CampaignMetadata = {
    ...metadata,
    image: imageCid || metadata.image,
  }
  
  
  return uploadJSONToIPFS(
    fullMetadata as unknown as Record<string, unknown>,
    `campaign-${metadata.name.slice(0, 20)}-${Date.now()}`
  )
}


export async function fetchFromIPFS<T = unknown>(cid: string): Promise<T> {
  const url = cidToUrl(cid)
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new IPFSError(
        `Failed to fetch from IPFS: ${response.status}`,
        'FETCH_FAILED'
      )
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof IPFSError) throw error
    throw new IPFSError(
      error instanceof Error ? error.message : 'Failed to fetch from IPFS',
      'FETCH_ERROR'
    )
  }
}
