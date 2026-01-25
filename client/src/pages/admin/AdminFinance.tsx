import React from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Building2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const monthlyRevenue = [
  { month: 'Jan', revenue: 45000, payouts: 38000 },
  { month: 'Feb', revenue: 52000, payouts: 42000 },
  { month: 'Mar', revenue: 61000, payouts: 48000 },
  { month: 'Apr', revenue: 58000, payouts: 51000 },
  { month: 'May', revenue: 72000, payouts: 55000 },
  { month: 'Jun', revenue: 68000, payouts: 52000 },
];

const lowBalanceCompanies = [
  { name: 'StartupXYZ', balance: 450, activePrograms: 2, pendingPayouts: 2500 },
  { name: 'TechSmall Inc.', balance: 800, activePrograms: 1, pendingPayouts: 1200 },
  { name: 'DevCorp', balance: 920, activePrograms: 3, pendingPayouts: 3800 },
];

const revenueBreakdown = [
  { name: 'Platform Fees', value: 45000, color: 'hsl(var(--primary))' },
  { name: 'Premium Plans', value: 28000, color: '#22c55e' },
  { name: 'API Access', value: 12000, color: '#f97316' },
  { name: 'Other', value: 5000, color: '#8b5cf6' },
];

export default function AdminFinance() {
  const totalLiquidity = 2450000;
  const monthlyGrowth = 12.5;
  const pendingPayouts = 125000;
  const totalRevenue = 356000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Financial Health</h1>
        <p className="text-muted-foreground text-sm">Platform financial overview and escrow management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 text-sm font-mono">
                <TrendingUp className="h-4 w-4" />
                +{monthlyGrowth}%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Total Liquidity</p>
              <p className="text-2xl font-bold font-mono text-foreground">${(totalLiquidity / 1000000).toFixed(2)}M</p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <ArrowUpRight className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue (YTD)</p>
              <p className="text-2xl font-bold font-mono text-foreground">${(totalRevenue / 1000).toFixed(0)}K</p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <ArrowDownRight className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold font-mono text-foreground">${(pendingPayouts / 1000).toFixed(0)}K</p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <Badge variant="destructive">{lowBalanceCompanies.length}</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Low Balance Alerts</p>
              <p className="text-2xl font-bold font-mono text-foreground">{lowBalanceCompanies.length} Companies</p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Payouts */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue vs Payouts</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="payouts" fill="#ef4444" radius={[4, 4, 0, 0]} name="Payouts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Revenue Breakdown */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Breakdown</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {revenueBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono text-sm">${(item.value / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Low Balance Companies */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Low Balance Companies (Below $1,000)
          </h3>
        </div>

        <div className="space-y-3">
          {lowBalanceCompanies.map((company, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Building2 className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.activePrograms} active programs • ${company.pendingPayouts.toLocaleString()} pending
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono font-semibold text-yellow-500">${company.balance}</p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
                <Button variant="outline" size="sm">
                  Contact
                </Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
