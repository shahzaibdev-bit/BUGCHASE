import React, { useEffect, useState } from 'react';
import { Users, DollarSign, AlertTriangle, Bug, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard, StatCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { API_URL } from '@/config';

const COLORS = ['hsl(var(--primary))', 'hsl(174 72% 60%)', 'hsl(200 85% 55%)', 'hsl(220 70% 50%)'];

import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

type ChartPoint = { name: string; value: number };

type AdminDashboardData = {
  stats: {
    totalUsers: number;
    totalReports: number;
    totalBountiesPaid: number;
    criticalVulns: number;
  };
  charts: {
    roleDistribution: ChartPoint[];
    severityDistribution: ChartPoint[];
    reportStatusDistribution: ChartPoint[];
  };
  lowBalanceCompanies: { id: string; name: string; balance: number }[];
  recentUsers: { id: string; name: string; role: string; createdAt: string }[];
};

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/dashboard/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setDashboardData(data.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard analytics', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = dashboardData?.stats;
  const roleDistribution = dashboardData?.charts.roleDistribution || [];
  const severityDistribution = dashboardData?.charts.severityDistribution || [];
  const reportStatusDistribution = dashboardData?.charts.reportStatusDistribution || [];
  const lowBalanceCompanies = dashboardData?.lowBalanceCompanies || [];
  const recentUsers = dashboardData?.recentUsers || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-between transition-colors">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{isLoading ? '...' : stats?.totalUsers || 0}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Users className="h-6 w-6" />
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-between transition-colors">
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
              <p className="text-2xl font-bold">{isLoading ? '...' : stats?.totalReports || 0}</p>
            </div>
             <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Bug className="h-6 w-6" />
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-between transition-colors">
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Bounties Paid</p>
              <p className="text-2xl font-bold">PKR {isLoading ? '...' : (stats?.totalBountiesPaid || 0).toLocaleString()}</p>
            </div>
             <div className="p-3 bg-primary/10 rounded-full text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-between transition-colors">
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Critical Vulns</p>
              <p className="text-2xl font-bold">{isLoading ? '...' : stats?.criticalVulns || 0}</p>
            </div>
             <div className="p-3 bg-primary/10 rounded-full text-primary">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="font-semibold mb-4">User Role Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {roleDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))', 
                  color: 'hsl(var(--foreground))',
                  borderRadius: '0.5rem'
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-4">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={severityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {severityDistribution.map((_, index) => (
                  <Cell key={`severity-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  borderRadius: '0.5rem'
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="font-semibold mb-4">Low Balance Companies</h3>
          <div className="space-y-3">
            {lowBalanceCompanies.map((company) => (
              <div key={company.name} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-destructive" />
                  <span>{company.name}</span>
                </div>
                <Badge variant="destructive">PKR {company.balance.toLocaleString()}</Badge>
              </div>
            ))}
            {!isLoading && lowBalanceCompanies.length === 0 && (
              <p className="text-sm text-muted-foreground">No company wallets found.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-4">Report Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={reportStatusDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  borderRadius: '0.5rem'
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="font-semibold mb-4">Recent Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Joined</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/20">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4"><Badge variant="tag">{user.role}</Badge></td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && recentUsers.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">No users found.</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
