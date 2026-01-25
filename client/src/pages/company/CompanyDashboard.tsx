import React, { useState, useMemo } from 'react';
import { Bug, FileText, DollarSign, TrendingUp, Users, BarChart3, Calendar as CalendarIcon, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  // Global Dashboard Data Simulation
  const dashboardData = useMemo(() => {
    let severity = [...chartData.severityDistribution];
    let trends = [...chartData.monthlyReports];
    let trendsLabel = 'Monthly Trends';
    let stats = {
        totalReports: 142,
        openReports: 23,
        bountiesPaid: 45200,
        researchers: 89,
        trend: 12
    };
    let recentReports = [...mockReports];

    // 1. Year Filter (Mock Simulation)
    if (selectedYear === '2023') {
        // Scramble data for "2023"
        severity = severity.map(s => ({ ...s, value: Math.floor(s.value * 0.7) }));
        trends = trends.map(t => ({ ...t, reports: Math.floor(t.reports * 0.8) }));
        stats = {
            totalReports: 98,
            openReports: 15,
            bountiesPaid: 32100,
            researchers: 65,
            trend: -5
        };
        recentReports = recentReports.slice(2); 
    }

    // 2. Month Filter
    if (selectedMonth !== 'all') {
         // Create daily data
         const daysInMonth = 30;
         trends = Array.from({ length: daysInMonth }, (_, i) => ({
            month: `${i + 1}`,
            reports: Math.floor(Math.random() * 15),
            bounties: Math.floor(Math.random() * 5000)
        }));
        trendsLabel = `Daily Trends (${selectedMonth} ${selectedYear})`;
        
        // Randomize Stats for the month
        stats = {
            totalReports: Math.floor(stats.totalReports / 12) + Math.floor(Math.random() * 10),
            openReports: Math.floor(Math.random() * 10),
            bountiesPaid: Math.floor(stats.bountiesPaid / 12),
            researchers: Math.floor(stats.researchers * 0.8),
            trend: Math.floor(Math.random() * 20) - 10
        };
         recentReports = recentReports.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    // 3. Date Filter (Specific Day)
    if (selectedDate) {
         // Hourly trends
         const hours = 24;
         trends = Array.from({ length: hours }, (_, i) => ({
             month: `${i}:00`,
             reports: Math.floor(Math.random() * 5),
             bounties: Math.floor(Math.random() * 1000)
         }));
         trendsLabel = `Hourly Trends (${format(selectedDate, 'MMM d, yyyy')})`;
         
         // Aggressive Jitter
         severity = severity.map(s => ({ ...s, value: Math.floor(s.value * 0.2 + Math.random() * 5) }));
         
          stats = {
            totalReports: Math.floor(Math.random() * 5),
            openReports: Math.floor(Math.random() * 3),
            bountiesPaid: Math.floor(Math.random() * 2000),
            researchers: Math.floor(Math.random() * 5),
            trend: 0
        };
         recentReports = recentReports.slice(0, 2);
    }

    return { severity, trends, trendsLabel, stats, recentReports };
  }, [selectedYear, selectedMonth, selectedDate]);


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
                    value={`$${dashboardData.stats.bountiesPaid.toLocaleString()}`} 
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
    </div>
  );
}
