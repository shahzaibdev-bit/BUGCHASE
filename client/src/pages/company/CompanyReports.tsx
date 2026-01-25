import React, { useState } from 'react';
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

const mockReports = [
  {
    id: 'RPT-001',
    title: 'SQL Injection in Login Form',
    severity: 'critical',
    status: 'pending',
    program: 'Web Application Security',
    researcher: 'h4ck3r_one',
    submittedAt: '2024-03-15',
    bounty: 5000,
  },
  {
    id: 'RPT-002',
    title: 'XSS in Comment Section',
    severity: 'high',
    status: 'validated',
    program: 'Web Application Security',
    researcher: 'security_pro',
    submittedAt: '2024-03-14',
    bounty: 2500,
  },
  {
    id: 'RPT-003',
    title: 'IDOR in User Profile API',
    severity: 'high',
    status: 'in_review',
    program: 'API Security Audit',
    researcher: 'bug_hunter',
    submittedAt: '2024-03-13',
    bounty: 3000,
  },
  {
    id: 'RPT-004',
    title: 'Information Disclosure',
    severity: 'medium',
    status: 'resolved',
    program: 'Mobile App Testing',
    researcher: 'cyber_ninja',
    submittedAt: '2024-03-12',
    bounty: 1000,
  },
  {
    id: 'RPT-005',
    title: 'Weak Password Policy',
    severity: 'low',
    status: 'rejected',
    program: 'Web Application Security',
    researcher: 'newbie_hunter',
    submittedAt: '2024-03-11',
    bounty: 0,
  },
];

const severityColors: Record<string, string> = {
  critical: 'severity-critical',
  high: 'severity-high',
  medium: 'severity-medium',
  low: 'severity-low',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  in_review: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  validated: <CheckCircle className="h-4 w-4 text-green-500" />,
  resolved: <CheckCircle className="h-4 w-4 text-primary" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function CompanyReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredReports = mockReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
              {filteredReports.map((report) => (
                <tr key={report.id} className="border-b border-border/20 hover:bg-foreground/5 transition-colors">
                  <td className="p-4 font-mono text-sm text-primary">
                    <Link to={`/company/reports/${report.id}`} className="hover:underline">
                      {report.id}
                    </Link>
                  </td>
                  <td className="p-4">
                    <div>
                      <Link to={`/company/reports/${report.id}`} className="group">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{report.title}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{report.program}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={severityColors[report.severity]}>
                      {report.severity}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {statusIcons[report.status]}
                      <span className="text-sm capitalize">{report.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm">@{report.researcher}</td>
                  <td className="p-4 font-mono font-semibold text-primary">
                    {report.bounty > 0 ? `$${report.bounty.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
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
