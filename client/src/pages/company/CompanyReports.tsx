import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle, Clock, XCircle, Eye, Sparkles } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { API_URL } from '@/config';

const SEEN_KEY = 'bugchase_seen_reports';

const severityVariant: Record<string, any> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
  none: 'info',
};

const statusIcons: Record<string, React.ReactNode> = {
  submitted: <Clock className="h-4 w-4 text-blue-500" />,
  triaging: <Clock className="h-4 w-4 text-purple-500" />,
  triaged: <CheckCircle className="h-4 w-4 text-primary" />,
  pending_fix: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  resolved: <CheckCircle className="h-4 w-4 text-green-500" />,
  paid: <CheckCircle className="h-4 w-4 text-green-600" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
  spam: <XCircle className="h-4 w-4 text-zinc-500" />,
  duplicate: <XCircle className="h-4 w-4 text-zinc-500" />,
  na: <XCircle className="h-4 w-4 text-zinc-500" />,
  'out-of-scope': <XCircle className="h-4 w-4 text-zinc-500" />,
  'needs info': <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  closed: <XCircle className="h-4 w-4 text-zinc-500" />,
};

function getSeenReports(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markReportSeen(id: string) {
  const seen = getSeenReports();
  seen.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export default function CompanyReports() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenReports);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/company/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setReports(data.data.reports);
        } else {
          toast({ title: 'Error', description: 'Failed to load reports', variant: 'destructive' });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleRowClick = useCallback((reportId: string) => {
    markReportSeen(reportId);
    setSeenIds(prev => new Set([...prev, reportId]));
    navigate(`/company/reports/${reportId}`);
  }, [navigate]);

  const filteredReports = reports
    .filter(report => {
      const matchesSearch =
        (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.reportId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const newCount = filteredReports.filter(r => !seenIds.has(r.id.toString())).length;

  if (loading) return <div className="p-10 text-center animate-pulse">Loading Reports...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Reports</h1>
          <p className="text-muted-foreground text-sm">Review and manage vulnerability reports</p>
        </div>
        {newCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {newCount} new {newCount === 1 ? 'report' : 'reports'}
          </div>
        )}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="triaged">Triaged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Reports Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">ID</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Title</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Severity</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Researcher</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Bounty</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No reports found.</td>
                </tr>
              ) : filteredReports.map((report) => {
                const isNew = !seenIds.has(report.id.toString());
                return (
                  <tr
                    key={report.id}
                    onClick={() => handleRowClick(report.id.toString())}
                    className={`border-b border-border/20 hover:bg-foreground/5 transition-colors cursor-pointer ${isNew ? 'bg-emerald-500/5' : ''}`}
                  >
                    {/* ID */}
                    <td className="p-4 font-mono text-sm text-primary">
                      {report.reportId || `${report.id.toString().substring(0, 8)}...`}
                    </td>

                    {/* Title + NEW badge */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNew && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white shrink-0">
                            <Sparkles className="h-2.5 w-2.5" />
                            New
                          </span>
                        )}
                        <div>
                          <p className={`font-medium line-clamp-1 ${isNew ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                            {report.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{report.program}</p>
                        </div>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="p-4">
                      <Badge variant={severityVariant[report.severity] || 'info'} className="w-20 justify-center">
                        {report.severity}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {statusIcons[report.status] || <Clock className="h-4 w-4 text-zinc-500" />}
                        <span className="text-sm capitalize">{report.status.replace('_', ' ')}</span>
                      </div>
                    </td>

                    {/* Researcher */}
                    <td className="p-4 font-mono text-sm">@{report.researcher}</td>

                    {/* Bounty */}
                    <td className="p-4 font-mono font-semibold text-primary">
                      {report.bounty > 0 ? `PKR ${report.bounty.toLocaleString()}` : '-'}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(report.id.toString()); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
