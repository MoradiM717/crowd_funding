import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Trophy,
  ArrowRight,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  usePlatformStats,
  useCampaignLeaderboard,
  useDonorLeaderboard,
  useProfiles,
} from '@/hooks/useApi'
import { shortenAddress, formatEthValue } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { getDisplayName } from '@/lib/displayName'

export function Stats() {
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats()
  const { data: campaignLeaderboard, isLoading: campaignsLoading } = useCampaignLeaderboard({
    limit: 10,
  })
  const { data: donorLeaderboard, isLoading: donorsLoading } = useDonorLeaderboard({
    limit: 10,
  })

  
  const allAddresses = useMemo(() => {
    const addresses = new Set<string>()
    
    
    donorLeaderboard?.results?.forEach(donor => {
      addresses.add(donor.donor_address.toLowerCase())
    })
    
    
    campaignLeaderboard?.results?.forEach(campaign => {
      addresses.add(campaign.creator_address.toLowerCase())
    })
    
    return Array.from(addresses)
  }, [donorLeaderboard, campaignLeaderboard])

  
  const { data: profilesData } = useProfiles(allAddresses)
  const profiles = profilesData?.profiles || {}

  return (
    <div className="container py-8">
      {}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Platform Statistics</h1>
        <p className="text-muted-foreground mt-1">
          Explore analytics and leaderboards for the crowdfunding platform
        </p>
      </div>

      {}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Campaigns"
          value={platformStats?.total_campaigns.toString() ?? '0'}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Total Raised"
          value={platformStats ? `${formatEthValue(platformStats.total_raised_eth)} ETH` : '0 ETH'}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Unique Donors"
          value={platformStats?.unique_donors.toString() ?? '0'}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Success Rate"
          value={platformStats ? `${platformStats.success_rate.toFixed(1)}%` : '0%'}
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
      </div>

      {}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {platformStats?.active_campaigns ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Currently accepting donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successful Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {platformStats?.successful_campaigns ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Reached their funding goal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {platformStats?.total_contributions ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Individual donations made</p>
          </CardContent>
        </Card>
      </div>

      {}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Top Campaigns</TabsTrigger>
          <TabsTrigger value="donors">Top Donors</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Funded Campaigns
              </CardTitle>
              <CardDescription>
                Campaigns that have raised the most funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : campaignLeaderboard?.results && campaignLeaderboard.results.length > 0 ? (
                <div className="space-y-4">
                  {campaignLeaderboard.results.map((campaign, index) => (
                    <Link
                      key={campaign.address}
                      to={`/campaign/${campaign.address}`}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          Campaign {shortenAddress(campaign.address)}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>by {getDisplayName(campaign.creator_address, profiles)}</span>
                          <span>•</span>
                          <span>{campaign.contributions_count} contributions</span>
                        </div>
                        <div className="mt-2">
                          <Progress
                            value={campaign.progress_percent}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatEthValue(campaign.total_raised_eth)} ETH</p>
                        <p className="text-sm text-muted-foreground">
                          of {formatEthValue(campaign.goal_eth)} ETH
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No campaigns yet
                </div>
              )}

              {campaignLeaderboard?.results && campaignLeaderboard.results.length > 0 && (
                <div className="mt-6 text-center">
                  <Button variant="outline" asChild>
                    <Link to="/campaigns?ordering=-total_raised_wei">
                      View All Campaigns
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Contributors
              </CardTitle>
              <CardDescription>
                The most generous supporters on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {donorsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : donorLeaderboard?.results && donorLeaderboard.results.length > 0 ? (
                <div className="space-y-4">
                  {donorLeaderboard.results.map((donor, index) => {
                    const profile = profiles[donor.donor_address.toLowerCase()]
                    const displayName = getDisplayName(donor.donor_address, profiles)
                    
                    return (
                      <Link
                        key={donor.donor_address}
                        to={`/profile/${donor.donor_address}`}
                        className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{displayName}</p>
                            <p className="text-sm text-muted-foreground">
                              {donor.campaigns_supported} campaigns supported
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatEthValue(donor.total_contributed_eth)} ETH</p>
                          <p className="text-sm text-muted-foreground">total donated</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No donors yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Platform Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-4">Campaign Status Distribution</h4>
              {statsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-3">
                  <StatusBar
                    label="Active"
                    value={platformStats?.active_campaigns ?? 0}
                    total={platformStats?.total_campaigns ?? 1}
                    color="bg-blue-500"
                  />
                  <StatusBar
                    label="Successful"
                    value={platformStats?.successful_campaigns ?? 0}
                    total={platformStats?.total_campaigns ?? 1}
                    color="bg-green-500"
                  />
                  <StatusBar
                    label="Failed"
                    value={platformStats?.failed_campaigns ?? 0}
                    total={platformStats?.total_campaigns ?? 1}
                    color="bg-red-500"
                  />
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-4">Key Metrics</h4>
              {statsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Raised per Campaign</span>
                    <span className="font-medium">
                      {platformStats && platformStats.total_campaigns > 0
                        ? `${formatEthValue(parseFloat(platformStats.total_raised_eth) / platformStats.total_campaigns)} ETH`
                        : '0 ETH'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Donation Size</span>
                    <span className="font-medium">
                      {platformStats && platformStats.total_contributions > 0
                        ? `${formatEthValue(parseFloat(platformStats.total_raised_eth) / platformStats.total_contributions)} ETH`
                        : '0 ETH'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Donors per Campaign</span>
                    <span className="font-medium">
                      {platformStats && platformStats.total_campaigns > 0
                        ? (platformStats.unique_donors / platformStats.total_campaigns).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
