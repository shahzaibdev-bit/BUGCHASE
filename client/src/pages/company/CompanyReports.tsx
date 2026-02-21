import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertTriangle, CheckCircle, Clock, XCircle, Eye, MessageSquare } from 'lucide-react';
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

const severityColors: Record<string, string> = {
  critical: 'severity-critical',
  high: 'severity-high',
  medium: 'severity-medium',
  low: 'severity-low',
  info: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/50',
  none: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/50',
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

export default function CompanyReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                toast({ title: "Error", description: "Failed to load reports", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  if (loading) return <div className="p-10 text-center animate-pulse">Loading Reports...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Reports</h1>
        <p className="text-muted-foreground text-sm">Review and manage vulnerability reports</p>
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
              ) : filteredReports.map((report) => (
                <tr key={report.id} className="border-b border-border/20 hover:bg-foreground/5 transition-colors">
                  <td className="p-4 font-mono text-sm text-primary">
                    <Link to={`/company/reports/${report.id}`} className="hover:underline">
                      {report.id.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="p-4">
                    <div>
                      <Link to={`/company/reports/${report.id}`} className="group">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{report.title}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{report.program}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={severityColors[report.severity] || severityColors.info}>
                      {report.severity}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {statusIcons[report.status] || <Clock className="h-4 w-4 text-zinc-500" />}
                      <span className="text-sm capitalize">{report.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm">@{report.researcher}</td>
                  <td className="p-4 font-mono font-semibold text-primary">
                    {report.bounty > 0 ? `$${report.bounty.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                        <Link to={`/company/reports/${report.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
