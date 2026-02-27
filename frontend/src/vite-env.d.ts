

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string
  
  readonly VITE_FACTORY_ADDRESS: string 
  readonly VITE_SEPOLIA_FACTORY_ADDRESS?: string 
  readonly VITE_MAINNET_FACTORY_ADDRESS?: string 
  
  readonly VITE_PINATA_JWT?: string 
  readonly VITE_PINATA_API_KEY?: string 
  readonly VITE_PINATA_SECRET?: string 
  readonly VITE_IPFS_GATEWAY?: string 
  
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}
