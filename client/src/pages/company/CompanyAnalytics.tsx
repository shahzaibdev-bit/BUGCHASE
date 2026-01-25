import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Clock, DollarSign, Users, FileText, Calendar as CalendarIcon, X } from 'lucide-react';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { cn } from '@/lib/utils';

// --- Mock Data ---
const INITIAL_SEVERITY = [
  { name: 'Critical', count: 12, color: '#ef4444' },
  { name: 'High', count: 28, color: '#f97316' },
  { name: 'Medium', count: 45, color: '#eab308' },
  { name: 'Low', count: 23, color: '#22c55e' },
];

const INITIAL_PAYOUTS = [
  { month: 'Jan', amount: 12500 },
  { month: 'Feb', amount: 18000 },
  { month: 'Mar', amount: 15500 },
  { month: 'Apr', amount: 22000 },
  { month: 'May', amount: 28500 },
  { month: 'Jun', amount: 24000 },
];

const INITIAL_TREND = [
  { week: 'W1', reports: 8 },
  { week: 'W2', reports: 12 },
  { week: 'W3', reports: 15 },
  { week: 'W4', reports: 11 },
  { week: 'W5', reports: 18 },
  { week: 'W6', reports: 14 },
];

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-popover-foreground text-sm">
          {label && <p className="font-semibold mb-2">{label}</p>}
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
              />
              <span className="font-medium">
                  {entry.name}: {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
};

export default function CompanyAnalytics() {
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Derived Data based on filters
  const { stats, severityData, payoutsData, trendData } = useMemo(() => {
    // Clone initial data
    let currentSeverity = [...INITIAL_SEVERITY];
    let currentPayouts = [...INITIAL_PAYOUTS];
    let currentTrend = [...INITIAL_TREND];
    
    let currentStats = [
        { label: 'Total Reports', value: '108', icon: FileText, trend: '+12%', up: true },
        { label: 'Active Researchers', value: '156', icon: Users, trend: '+8%', up: true },
        { label: 'Total Bounties Paid', value: '$120.5K', icon: DollarSign, trend: '+23%', up: true },
        { label: 'Avg Resolution Time', value: '4.2 days', icon: Clock, trend: '-15%', up: false },
    ];

    // 1. Year Filter
    if (selectedYear === '2023') {
        currentStats = [
            { label: 'Total Reports', value: '85', icon: FileText, trend: '-5%', up: false },
            { label: 'Active Researchers', value: '120', icon: Users, trend: '+2%', up: true },
            { label: 'Total Bounties Paid', value: '$95.2K', icon: DollarSign, trend: '+10%', up: true },
            { label: 'Avg Resolution Time', value: '5.1 days', icon: Clock, trend: '+5%', up: false },
        ];
        currentSeverity = currentSeverity.map(s => ({ ...s, count: Math.floor(s.count * 0.8) }));
        currentPayouts = currentPayouts.map(p => ({ ...p, amount: Math.floor(p.amount * 0.9) }));
    }

    // 2. Month Filter
    if (selectedMonth !== 'all') {
         // Generate daily trend for the month
         currentTrend = Array.from({ length: 15 }, (_, i) => ({
             week: `Day ${i * 2 + 1}`,
             reports: Math.floor(Math.random() * 8) + 2
         }));
         
         const factor = Math.random() * 0.5 + 0.5;
         currentStats = currentStats.map(s => ({
             ...s, 
             value: s.label.includes('Paid') ? `$${(120 * factor).toFixed(1)}K` : Math.floor(parseInt(s.value) * factor).toString()
         }));
    }

    // 3. Date Filter
    if (selectedDate) {
        currentStats = currentStats.map(s => ({
             ...s, 
             value: s.label.includes('Paid') ? `$${(Math.random() * 5).toFixed(1)}K` : Math.floor(Math.random() * 10).toString()
        }));
        currentTrend = Array.from({ length: 24 }, (_, i) => ({
             week: `${i}:00`,
             reports: Math.floor(Math.random() * 3)
        }));
    }

    return { stats: currentStats, severityData: currentSeverity, payoutsData: currentPayouts, trendData: currentTrend };
  }, [selectedYear, selectedMonth, selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Analytics</h1>
          <p className="text-muted-foreground text-sm">Track your security program performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {/* Year Select */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px] bg-background">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
            </Select>

            {/* Month Select */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[120px] bg-background">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
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
      </div>

      {/* Stats Grid with Tilt & Spotlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <InvertedTiltCard key={index} className="h-full rounded-xl">
              <InverseSpotlightCard className="h-full p-4 border border-border/50 bg-card/50 backdrop-blur-sm rounded-xl">
                <div className="flex items-start justify-between relative z-10">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${stat.up ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.trend}
                  </div>
                </div>
                <div className="mt-3 relative z-10">
                  <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </InverseSpotlightCard>
          </InvertedTiltCard>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vulnerability by Severity */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Reports by Severity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Bounty Payouts Over Time */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Bounty Payouts Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payoutsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickFormatter={(value) => `$${value/1000}k`} 
                    tickLine={false} 
                    axisLine={false}
                />
                <Tooltip 
                    content={<CustomTooltip formatter={(val: any) => `$${val.toLocaleString()}`} />}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Trend */}
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Report Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="reports" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Severity Distribution Pie */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Severity Ratio</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="count"
                  stroke="none"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {severityData.map((item) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
