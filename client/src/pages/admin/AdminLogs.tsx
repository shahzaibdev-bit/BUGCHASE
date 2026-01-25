import React, { useState } from 'react';
import { Search, Filter, Terminal, User, Shield, DollarSign, FileText, Settings, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockLogs = [
  { id: '1', timestamp: '2024-03-15 14:32:15', type: 'auth', level: 'info', user: 'alex@email.com', action: 'User logged in', details: 'IP: 192.168.1.1' },
  { id: '2', timestamp: '2024-03-15 14:30:22', type: 'report', level: 'info', user: 'h4ck3r@email.com', action: 'Report submitted', details: 'RPT-089 - SQL Injection' },
  { id: '3', timestamp: '2024-03-15 14:28:45', type: 'payment', level: 'success', user: 'system', action: 'Bounty paid', details: '$5,000 to @elite_hacker' },
  { id: '4', timestamp: '2024-03-15 14:25:10', type: 'security', level: 'warning', user: 'unknown', action: 'Failed login attempt', details: 'Multiple attempts from IP: 10.0.0.5' },
  { id: '5', timestamp: '2024-03-15 14:22:33', type: 'admin', level: 'info', user: 'admin@bugchase.com', action: 'User suspended', details: 'User: spam_account' },
  { id: '6', timestamp: '2024-03-15 14:20:00', type: 'report', level: 'info', user: 'triager@bugchase.com', action: 'Report validated', details: 'RPT-088 promoted to High' },
  { id: '7', timestamp: '2024-03-15 14:15:45', type: 'security', level: 'error', user: 'system', action: 'Rate limit exceeded', details: 'API endpoint: /api/submit' },
  { id: '8', timestamp: '2024-03-15 14:10:22', type: 'payment', level: 'info', user: 'techcorp@company.com', action: 'Escrow topped up', details: '$25,000 added' },
];

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  auth: { icon: <User className="h-4 w-4" />, color: 'text-blue-500' },
  report: { icon: <FileText className="h-4 w-4" />, color: 'text-purple-500' },
  payment: { icon: <DollarSign className="h-4 w-4" />, color: 'text-green-500' },
  security: { icon: <Shield className="h-4 w-4" />, color: 'text-yellow-500' },
  admin: { icon: <Settings className="h-4 w-4" />, color: 'text-primary' },
};

const levelConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  info: { icon: <Info className="h-3 w-3" />, color: 'bg-blue-500/10 text-blue-500' },
  success: { icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-500/10 text-green-500' },
  warning: { icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-yellow-500/10 text-yellow-500' },
  error: { icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-red-500/10 text-red-500' },
};

export default function AdminLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesType && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Activity Logs</h1>
        <p className="text-muted-foreground text-sm">Monitor platform activity and events</p>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="auth">Authentication</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Terminal-style Logs */}
      <GlassCard className="p-0 overflow-hidden overflow-x-auto">
        <div className="flex items-center gap-2 px-4 py-3 bg-foreground/5 border-b border-border/30 min-w-[600px]">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm text-foreground">Activity Log Stream</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto min-w-[600px]">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-foreground/5 transition-colors font-mono text-sm">
              <div className="flex items-start gap-4">
                {/* Timestamp */}
                <span className="text-muted-foreground whitespace-nowrap text-xs">
                  {log.timestamp}
                </span>

                {/* Level Badge */}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${levelConfig[log.level].color}`}>
                  {levelConfig[log.level].icon}
                  {log.level.toUpperCase()}
                </div>

                {/* Type */}
                <div className={`flex items-center gap-1 ${typeConfig[log.type].color}`}>
                  {typeConfig[log.type].icon}
                  <span className="uppercase text-xs">{log.type}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground">{log.action}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground truncate">{log.details}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">by {log.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-blue-500">
            {mockLogs.filter(l => l.level === 'info').length}
          </p>
          <p className="text-sm text-muted-foreground">Info</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-green-500">
            {mockLogs.filter(l => l.level === 'success').length}
          </p>
          <p className="text-sm text-muted-foreground">Success</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-500">
            {mockLogs.filter(l => l.level === 'warning').length}
          </p>
          <p className="text-sm text-muted-foreground">Warnings</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-red-500">
            {mockLogs.filter(l => l.level === 'error').length}
          </p>
          <p className="text-sm text-muted-foreground">Errors</p>
        </GlassCard>
      </div>
    </div>
  );
}
