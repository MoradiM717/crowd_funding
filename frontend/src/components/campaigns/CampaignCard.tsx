import { Link } from 'react-router-dom'
import { Clock, Users, Target } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Campaign, CampaignWithMetadata, Profile } from '@/types/api'
import { shortenAddress, formatTimeRemaining, formatEthValue } from '@/lib/utils'
import { getDisplayName } from '@/lib/displayName'

interface CampaignCardProps {
  campaign: Campaign | CampaignWithMetadata
  
  profiles?: Record<string, Profile | null>
}

export function CampaignCard({ campaign, profiles }: CampaignCardProps) {
  const progress = campaign.progress_percent
  const timeRemaining = formatTimeRemaining(campaign.deadline_iso)
  const isEnded = new Date(campaign.deadline_iso) < new Date()
  const metadata = 'metadata' in campaign ? campaign.metadata : undefined
  
  
  const creatorDisplayName = profiles
    ? getDisplayName(campaign.creator_address, profiles)
    : metadata?.creator_name || shortenAddress(campaign.creator_address)

  return (
    <Link to={`/campaign/${campaign.address}`}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
        {}
        {metadata?.image_url ? (
          <div className="h-48 overflow-hidden">
            <img
              src={metadata.image_url}
              alt={metadata.name || 'Campaign'}
              className="w-full h-full object-cover"
              onError={(e) => {
                
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                    <svg class="h-16 w-16 text-primary/40" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                `
              }}
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
            <Target className="h-16 w-16 text-primary/40" />
          </div>
        )}

        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant={getStatusVariant(campaign.status)}>
              {formatStatus(campaign.status)}
            </Badge>
            {metadata?.category && (
              <Badge variant="outline">{metadata.category}</Badge>
            )}
          </div>
          <CardTitle className="line-clamp-2">
            {metadata?.name || `Campaign ${shortenAddress(campaign.address)}`}
          </CardTitle>
          {metadata?.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {metadata.short_description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="font-medium">{formatEthValue(campaign.total_raised_eth)} ETH</span>
              <span className="text-muted-foreground">
                of {formatEthValue(campaign.goal_eth)} ETH goal
              </span>
            </div>
          </div>

          {}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>contributors</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{isEnded ? 'Ended' : timeRemaining}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
            <span>by {creatorDisplayName}</span>
            <span>{progress.toFixed(0)}% funded</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
      return 'default'
    case 'SUCCESS':
      return 'secondary'
    case 'FAILED':
      return 'destructive'
    case 'WITHDRAWN':
      return 'outline'
    default:
      return 'outline'
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'SUCCESS':
      return 'Successful'
    case 'FAILED':
      return 'Failed'
    case 'WITHDRAWN':
      return 'Withdrawn'
    default:
      return status
  }
}
