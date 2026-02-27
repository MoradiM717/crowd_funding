import { useParams, Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  User,
  Wallet,
  Target,
  TrendingUp,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Save,
  X,
  Loader2,
  Globe,
  Twitter,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreatorStats,
  useCreatorCampaigns,
  useDonorStats,
  useDonorContributions,
} from '@/hooks/useApi'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { shortenAddress, formatDateTime, formatEthValue } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile as apiUpdateProfile } from '@/lib/auth'
import { profilesApi } from '@/lib/api'
import type { Profile as ProfileType } from '@/types/api'

export function Profile() {
  const { address: paramAddress } = useParams<{ address: string }>()
  const { address: connectedAddress } = useAccount()
  const { isConnected, isAuthenticated, profile: authProfile, refreshProfile, signIn, isLoading: authLoading } = useAuth()

  
  const profileAddress = paramAddress || connectedAddress
  const isOwnProfile = !paramAddress || (isConnected && paramAddress?.toLowerCase() === connectedAddress?.toLowerCase())
  const canEdit = isOwnProfile && isAuthenticated
  const needsSignIn = isOwnProfile && isConnected && !isAuthenticated

  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  
  const [otherProfile, setOtherProfile] = useState<ProfileType | null>(null)
  const [otherProfileLoading, setOtherProfileLoading] = useState(false)

  
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    website: '',
    twitter_handle: '',
  })

  
  const displayProfile = isOwnProfile ? authProfile : otherProfile
  const displayName = displayProfile?.display_name || (isOwnProfile ? 'Anonymous User' : shortenAddress(profileAddress || ''))

  
  useEffect(() => {
    if (paramAddress && !isOwnProfile) {
      setOtherProfileLoading(true)
      profilesApi.get(paramAddress)
        .then((profile) => {
          setOtherProfile(profile)
        })
        .catch((err) => {
          console.error('Failed to fetch profile:', err)
          setOtherProfile(null)
        })
        .finally(() => {
          setOtherProfileLoading(false)
        })
    }
  }, [paramAddress, isOwnProfile])

  
  useEffect(() => {
    if (isEditing && authProfile) {
      setEditForm({
        display_name: authProfile.display_name || '',
        bio: authProfile.bio || '',
        website: authProfile.website || '',
        twitter_handle: authProfile.twitter_handle || '',
      })
    }
  }, [isEditing, authProfile])

  const { data: creatorStats, isLoading: creatorStatsLoading } = useCreatorStats(
    profileAddress as string
  )
  const { data: creatorCampaigns, isLoading: campaignsLoading } = useCreatorCampaigns(
    profileAddress as string
  )
  const { data: donorStats } = useDonorStats(profileAddress as string)
  const { data: donorContributions, isLoading: contributionsLoading } = useDonorContributions(
    profileAddress as string
  )

  const copyAddress = () => {
    if (profileAddress) {
      navigator.clipboard.writeText(profileAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError(null)

    try {
      await apiUpdateProfile({
        display_name: editForm.display_name || null,
        bio: editForm.bio || null,
        website: editForm.website || null,
        twitter_handle: editForm.twitter_handle || null,
      })
      await refreshProfile()
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setSaveError(null)
  }

  if (!profileAddress) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No wallet connected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your wallet to view your profile
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      {}
      <Card className="mb-8">
        <CardContent className="pt-6">
          {isEditing ? (
            
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  {displayProfile?.avatar_url ? (
                    <img
                      src={displayProfile.avatar_url}
                      alt={displayName}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <User className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-medium">Edit Profile</h2>
                    <p className="text-sm text-muted-foreground">Update your public profile</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      placeholder="Enter display name"
                      value={editForm.display_name}
                      onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter_handle">Twitter Handle</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input
                        id="twitter_handle"
                        className="pl-8"
                        placeholder="username"
                        value={editForm.twitter_handle}
                        onChange={(e) => setEditForm({ ...editForm, twitter_handle: e.target.value.replace('@', '') })}
                        maxLength={50}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {editForm.bio.length}/500
                  </p>
                </div>

                {saveError && (
                  <div className="text-sm text-destructive">{saveError}</div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {displayProfile?.avatar_url ? (
                <img
                  src={displayProfile.avatar_url}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{displayName}</h1>
                  {isOwnProfile && (
                    <Badge variant="secondary">You</Badge>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="ml-2"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {needsSignIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={signIn}
                      disabled={authLoading}
                      className="ml-2"
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Signing...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-1" />
                          Sign in to Edit
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {displayProfile?.bio && (
                  <p className="text-muted-foreground mb-3">{displayProfile.bio}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <code className="text-xs">{shortenAddress(profileAddress)}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyAddress}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  <a
                    href={`https://etherscan.io/address/${profileAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View on Etherscan
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  {displayProfile?.website && (
                    <a
                      href={displayProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}

                  {displayProfile?.twitter_handle && (
                    <a
                      href={`https://twitter.com/${displayProfile.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Twitter className="h-3 w-3" />
                      @{displayProfile.twitter_handle}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Campaigns Created"
          value={creatorStats?.total_campaigns.toString() ?? '0'}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          loading={creatorStatsLoading}
        />
        <StatsCard
          title="Total Raised"
          value={creatorStats ? `${formatEthValue(creatorStats.total_raised_eth)} ETH` : '0 ETH'}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={creatorStatsLoading}
        />
        <StatsCard
          title="Contributions Made"
          value={donorStats?.total_contributions.toString() ?? '0'}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          loading={creatorStatsLoading}
        />
        <StatsCard
          title="Total Donated"
          value={donorStats ? `${donorStats.total_donated_eth} ETH` : '0 ETH'}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={creatorStatsLoading}
        />
      </div>

      {}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">
            Created Campaigns ({creatorCampaigns?.count ?? 0})
          </TabsTrigger>
          <TabsTrigger value="contributions">
            Contributions ({donorContributions?.count ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          {campaignsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CampaignCardSkeleton key={i} />
              ))}
            </div>
          ) : creatorCampaigns?.results && creatorCampaigns.results.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {creatorCampaigns.results.map((campaign) => (
                <CampaignCard key={campaign.address} campaign={campaign} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No campaigns yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isOwnProfile
                    ? "You haven't created any campaigns yet"
                    : 'This address has not created any campaigns'}
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link to="/create">Create Campaign</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contributions" className="mt-6">
          {contributionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : donorContributions?.results && donorContributions.results.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Contribution History</CardTitle>
                <CardDescription>
                  All contributions made by this address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {donorContributions.results.map((contribution, index) => (
                    <div
                      key={`${contribution.campaign_address}-${index}`}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div>
                        <Link
                          to={`/campaign/${contribution.campaign_address}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {shortenAddress(contribution.campaign_address)}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(contribution.created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{contribution.contributed_eth} ETH</p>
                        <Badge variant="outline" className="text-xs">
                          {contribution.refunded_wei !== '0' ? 'Refunded' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No contributions yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isOwnProfile
                    ? "You haven't made any contributions yet"
                    : 'This address has not made any contributions'}
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link to="/campaigns">Browse Campaigns</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string
  value: string
  icon: React.ReactNode
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

function CampaignCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-48 rounded-t-lg rounded-b-none" />
      <div className="p-6">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-2 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  )
}
