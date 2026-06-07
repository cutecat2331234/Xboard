import { useEffect, useState } from 'react'
import { fetchDashboardStats, type DashboardOverride } from '@/lib/api'
import { t } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardOverride>({})
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [])

  const gb = (n?: number) => ((n ?? 0) / 1073741824).toFixed(2) + ' GB'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.dashboard')}</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Online Nodes" value={stats.online_nodes ?? 0} />
        <StatCard label="Online Users" value={stats.online_users ?? 0} />
        <StatCard label="Online Devices" value={stats.online_devices ?? 0} />
        <StatCard label="Today Traffic" value={gb(stats.today_traffic?.total)} />
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Month Traffic</CardTitle>
        </CardHeader>
        <CardContent>{gb(stats.month_traffic?.total)}</CardContent>
      </Card>
    </div>
  )
}
