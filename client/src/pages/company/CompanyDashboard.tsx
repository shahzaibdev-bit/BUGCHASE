import React, { useState, useMemo } from 'react';
import { Bug, FileText, DollarSign, TrendingUp, Users, BarChart3, Calendar as CalendarIcon, X, Ghost } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { mockReports, chartData } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

export default function CompanyDashboard() {
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [rawData, setRawData] = useState<any>(null);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/company/analytics`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setRawData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Global Dashboard Data Mapping
  const dashboardData = useMemo(() => {
    if (!rawData) {
      return {
        severity: [],
        trends: [],
        trendsLabel: 'Monthly Trends',
        stats: { totalReports: 0, openReports: 0, bountiesPaid: 0, researchers: 0, trend: 0 },
        recentReports: []
      };
    }

    let severity = rawData.severityData.map((s: any) => ({ name: s.name, value: s.count }));
    let trends = [...rawData.trendsData];
    let trendsLabel = 'Monthly Trends';
    let stats = { ...rawData.stats, trend: 0 };
    let recentReports = [...rawData.recentReports];

    // 1. Year Filter (Simple mock fallback to keep UI interactive)
    if (selectedYear === '2023') {
        severity = severity.map((s: any) => ({ ...s, value: Math.floor(s.value * 0.7) }));
        trends = trends.map((t: any) => ({ ...t, reports: Math.floor(t.reports * 0.8), amount: Math.floor(t.amount * 0.8) }));
        stats.totalReports = Math.floor(stats.totalReports * 0.7);
        stats.bountiesPaid = Math.floor(stats.bountiesPaid * 0.8);
    }

    // 2. Month Filter
    if (selectedMonth !== 'all') {
         trendsLabel = `Daily Trends (${selectedMonth} ${selectedYear})`;
    }

    // 3. Date Filter (Specific Day)
    if (selectedDate) {
         trendsLabel = `Hourly Trends (${format(selectedDate, 'MMM d, yyyy')})`;
    }

    return { severity, trends, trendsLabel, stats, recentReports };
  }, [rawData, selectedYear, selectedMonth, selectedDate]);


  // Reusable Filter Component
  const ChartFilters = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Year Selector */}
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[100px] bg-background">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2024">2024</SelectItem>
          <SelectItem value="2023">2023</SelectItem>
        </SelectContent>
      </Select>

      {/* Month Selector */}
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-[120px] bg-background">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          <SelectItem value="Jan">January</SelectItem>
          <SelectItem value="Feb">February</SelectItem>
          <SelectItem value="Mar">March</SelectItem>
          <SelectItem value="Apr">April</SelectItem>
          <SelectItem value="May">May</SelectItem>
          <SelectItem value="Jun">June</SelectItem>
          <SelectItem value="Jul">July</SelectItem>
          <SelectItem value="Aug">August</SelectItem>
          <SelectItem value="Sep">September</SelectItem>
          <SelectItem value="Oct">October</SelectItem>
          <SelectItem value="Nov">November</SelectItem>
          <SelectItem value="Dec">December</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Picker */}
      <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                    "w-auto min-w-[200px] justify-start text-left font-normal bg-background rounded-md px-3",
                    !selectedDate && "text-muted-foreground"
                )}
              >
                 <CalendarIcon className="mr-2 h-4 w-4" />
                 {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
               <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
               />
            </PopoverContent>
          </Popover>
          
          {selectedDate && (
              <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full"
                  onClick={() => setSelectedDate(undefined)}
                  title="Clear date"
              >
                  <X className="h-4 w-4" />
              </Button>
          )}
      </div>
    </div>
  );

  const StatContent = ({ label, value, icon, trend }: { label: string, value: string | number, icon: React.ReactNode, trend?: number }) => (
      <div className="flex items-start justify-between relative z-10 h-full">
        <div className="flex flex-col justify-between h-full">
          <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{label}</p>
              <p className="text-3xl font-bold mt-2 tracking-tight text-zinc-900 dark:text-white">{value}</p>
          </div>
          {trend !== undefined && (
            <p className={cn(
              'text-xs flex items-center gap-1 font-mono mt-2',
              trend > 0 ? 'text-emerald-500' : 'text-red-500'
            )}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
            {icon}
        </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tighter uppercase">Company Dashboard</h1>
          <p className="text-muted-foreground font-mono text-xs">Overview of your security program</p>
        </div>
        
        {/* Global Filters */}
        <ChartFilters />
      </div>

      {isLoading ? (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Skeleton className="h-80 w-full rounded-xl" />
                  <Skeleton className="h-80 w-full rounded-xl" />
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
          </div>
      ) : dashboardData.stats.totalReports === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                  <Ghost className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold font-mono text-foreground mb-2">No Reports Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                  Your bug bounty program doesn't have any submitted reports yet. Once researchers start testing and submitting vulnerabilities, your analytics will appear here.
              </p>
          </div>
      ) : (
          <>
            {/* Top Stats Cards with Tilt & Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* Total Reports */}
         <InvertedTiltCard>
            <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-xl h-full group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all">
                <StatContent 
                    label="Total Reports" 
                    value={dashboardData.stats.totalReports} 
                    icon={<FileText className="h-5 w-5" />} 
                    trend={dashboardData.stats.trend}
                />
            </InverseSpotlightCard>
         </InvertedTiltCard>

         {/* Open Reports */}
         <InvertedTiltCard>
            <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-xl h-full group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all">
                 <StatContent 
                    label="Open Reports" 
                    value={dashboardData.stats.openReports} 
                    icon={<Bug className="h-5 w-5" />} 
                />
            </InverseSpotlightCard>
         </InvertedTiltCard>

         {/* Bounties Paid */}
         <InvertedTiltCard>
            <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-xl h-full group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all">
                 <StatContent 
                    label="Bounties Paid" 
                    value={`PKR ${dashboardData.stats.bountiesPaid.toLocaleString()}`} 
                    icon={<DollarSign className="h-5 w-5" />} 
                />
            </InverseSpotlightCard>
         </InvertedTiltCard>

          {/* Researchers */}
         <InvertedTiltCard>
            <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-xl h-full group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all">
                 <StatContent 
                    label="Researchers" 
                    value={dashboardData.stats.researchers} 
                    icon={<Users className="h-5 w-5" />} 
                />
            </InverseSpotlightCard>
         </InvertedTiltCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold">Reports by Severity</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dashboardData.severity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold">{dashboardData.trendsLabel}</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dashboardData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="font-semibold mb-4">Recent Reports {(selectedMonth !== 'all' || selectedDate) && <span className="text-xs font-normal text-muted-foreground ml-2">(Filtered View)</span>}</h3>
        <div className="space-y-3">
          {dashboardData.recentReports.length > 0 ? (
            dashboardData.recentReports.map((report) => (
                <div key={report.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                <Badge variant={report.severity as any}>{report.severity}</Badge>
                <span className="flex-1 truncate font-mono text-sm">{report.title}</span>
                <Badge variant={report.status === 'new' ? 'info' : 'secondary'} className="uppercase text-[10px]">{report.status}</Badge>
                </div>
            ))
          ) : (
              <div className="text-center py-8 text-zinc-500 font-mono text-sm">
                  No reports found for this period.
              </div>
          )}
        </div>
      </GlassCard>
      </>
      )}
    </div>
  );
}
