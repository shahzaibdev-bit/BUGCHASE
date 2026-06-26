import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Sparkles,
  ShieldAlert,
  Award,
  FileBadge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const SEEN_KEY = 'bugchase_seen_reports';

type ProgramChannel = 'bbp' | 'vdp' | 'private';
type PrivateProgramType = 'bbp' | 'vdp';
type StatusTab = 'new' | 'resolved' | 'rejected' | 'awarded';

interface CompanyReportRow {
  id: string;
  reportId: string;
  title: string;
  severity: string;
  status: string;
  program: string;
  programType: 'BBP' | 'VDP';
  isPrivate: boolean;
  researcher: string;
  submittedAt: string;
  bounty: number;
  certificateId: string | null;
  hasBountyAwarded: boolean;
}

const REJECTED_STATUSES = new Set([
  'spam',
  'duplicate',
  'na',
  'out-of-scope',
  'closed',
  'rejected',
]);

const severityVariant: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
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
  'in dispute': <ShieldAlert className="h-4 w-4 text-amber-500" />,
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

function isVdpReport(report: CompanyReportRow) {
  return report.programType === 'VDP';
}

function isAwarded(report: CompanyReportRow) {
  return isVdpReport(report)
    ? Boolean(report.certificateId)
    : report.hasBountyAwarded;
}

function isRejected(report: CompanyReportRow) {
  return REJECTED_STATUSES.has(report.status);
}

function isResolved(report: CompanyReportRow) {
  return (report.status === 'resolved' || report.status === 'paid') && !isAwarded(report);
}

function isInPipeline(report: CompanyReportRow) {
  return !isAwarded(report) && !isRejected(report) && !isResolved(report);
}

function isNew(report: CompanyReportRow, seenIds: Set<string>) {
  return isInPipeline(report) && !seenIds.has(String(report.id));
}

function getStatusBucket(report: CompanyReportRow): StatusTab {
  if (isAwarded(report)) return 'awarded';
  if (isRejected(report)) return 'rejected';
  if (isResolved(report)) return 'resolved';
  return 'new';
}

function matchesProgramChannel(
  report: CompanyReportRow,
  channel: ProgramChannel,
  privateType: PrivateProgramType,
) {
  const type = report.programType.toLowerCase() as PrivateProgramType;
  if (channel === 'bbp') return type === 'bbp' && !report.isPrivate;
  if (channel === 'vdp') return type === 'vdp' && !report.isPrivate;
  return report.isPrivate && type === privateType;
}

const slideSpring = { type: 'spring' as const, stiffness: 380, damping: 32 };

interface SlidingSegmentOption<T extends string> {
  value: T;
  label: string;
  /** Unopened report count — only rendered when > 0 */
  newCount?: number;
}

function SlidingSegmentControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  className,
}: {
  options: SlidingSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full max-w-lg rounded-md border border-border bg-zinc-150 dark:bg-zinc-800/70 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-sm py-2.5 px-3 text-sm font-mono uppercase tracking-wide transition-colors',
              isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground/80',
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-sm border border-border bg-background shadow-sm"
                transition={slideSpring}
              />
            )}
            <span className="relative z-10">{option.label}</span>
            {option.newCount !== undefined && option.newCount > 0 && (
              <span
                className={cn(
                  'relative z-10 text-[10px] font-mono font-semibold',
                  isActive ? 'text-muted-foreground' : 'text-foreground/60',
                )}
              >
                {option.newCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function countNewReports(
  items: CompanyReportRow[],
  channel: ProgramChannel,
  privateType: PrivateProgramType,
  seenIds: Set<string>,
) {
  return items.filter((r) => matchesProgramChannel(r, channel, privateType) && isNew(r, seenIds)).length;
}

export default function CompanyReports() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [programChannel, setProgramChannel] = useState<ProgramChannel>('bbp');
  const [privateProgramType, setPrivateProgramType] = useState<PrivateProgramType>('bbp');
  const [statusTab, setStatusTab] = useState<StatusTab>('new');
  const [reports, setReports] = useState<CompanyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenReports);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await apiFetch('/company/reports', {
          headers: { Authorization: `Bearer ${token}` },
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

  const handleRowClick = useCallback(
    (reportId: string) => {
      markReportSeen(reportId);
      setSeenIds((prev) => new Set([...prev, reportId]));
      navigate(`/company/reports/${reportId}`);
    },
    [navigate],
  );

  const channelReports = useMemo(
    () => reports.filter((r) => matchesProgramChannel(r, programChannel, privateProgramType)),
    [reports, programChannel, privateProgramType],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = {
      new: 0,
      resolved: 0,
      rejected: 0,
      awarded: 0,
    };
    for (const report of channelReports) {
      counts[getStatusBucket(report)] += 1;
    }
    return counts;
  }, [channelReports, seenIds]);

  const filteredReports = useMemo(() => {
    return channelReports
      .filter((report) => {
        const matchesSearch =
          (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (report.reportId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(report.id).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
        const matchesStatus = getStatusBucket(report) === statusTab;
        return matchesSearch && matchesSeverity && matchesStatus;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [channelReports, searchTerm, severityFilter, statusTab, seenIds]);

  const showCertificateColumn = programChannel === 'vdp' || (programChannel === 'private' && privateProgramType === 'vdp');
  const programNewCounts = useMemo(
    () => ({
      bbp: countNewReports(reports, 'bbp', privateProgramType, seenIds),
      vdp: countNewReports(reports, 'vdp', privateProgramType, seenIds),
      private: reports.filter((r) => r.isPrivate && isNew(r, seenIds)).length,
      privateBbp: countNewReports(reports, 'private', 'bbp', seenIds),
      privateVdp: countNewReports(reports, 'private', 'vdp', seenIds),
    }),
    [reports, privateProgramType, seenIds],
  );

  const showBountyColumn = programChannel === 'bbp' || (programChannel === 'private' && privateProgramType === 'bbp');

  if (loading) return <div className="p-10 text-center animate-pulse">Loading Reports...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Reports</h1>
          <p className="text-muted-foreground text-sm">Review and manage vulnerability reports by program and status</p>
        </div>
        {statusCounts.new > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {channelReports.filter((r) => isNew(r, seenIds)).length} unopened{' '}
            {channelReports.filter((r) => isNew(r, seenIds)).length === 1 ? 'report' : 'reports'}
          </div>
        )}
      </div>

      {/* Search — above tabs, outside any card */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-background">
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
      </div>

      {/* Program + status tabs */}
      <div className="space-y-4">
        <SlidingSegmentControl<ProgramChannel>
          layoutId="companyReportsProgramChannel"
          value={programChannel}
          onChange={setProgramChannel}
          options={[
            { value: 'bbp', label: 'BBP', newCount: programNewCounts.bbp },
            { value: 'vdp', label: 'VDP', newCount: programNewCounts.vdp },
            { value: 'private', label: 'Private', newCount: programNewCounts.private },
          ]}
        />

        {programChannel === 'private' && (
          <SlidingSegmentControl<PrivateProgramType>
            layoutId="companyReportsPrivateType"
            value={privateProgramType}
            onChange={setPrivateProgramType}
            className="max-w-xs"
            options={[
              { value: 'bbp', label: 'BBP', newCount: programNewCounts.privateBbp },
              { value: 'vdp', label: 'VDP', newCount: programNewCounts.privateVdp },
            ]}
          />
        )}

        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
          <TabsList className="bg-transparent h-auto p-0 gap-2 flex-wrap justify-start">
            <TabsTrigger
              value="new"
              className="text-xs gap-1.5 rounded-full px-3 py-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 data-[state=inactive]:text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New
              <span className="font-mono text-[10px] opacity-70">{statusCounts.new}</span>
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="text-xs gap-1.5 rounded-full px-3 py-1.5 data-[state=active]:bg-foreground/10 data-[state=inactive]:text-muted-foreground"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Resolved
              <span className="font-mono text-[10px] opacity-70">{statusCounts.resolved}</span>
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="text-xs gap-1.5 rounded-full px-3 py-1.5 data-[state=active]:bg-foreground/10 data-[state=inactive]:text-muted-foreground"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rejected
              <span className="font-mono text-[10px] opacity-70">{statusCounts.rejected}</span>
            </TabsTrigger>
            <TabsTrigger
              value="awarded"
              className="text-xs gap-1.5 rounded-full px-3 py-1.5 data-[state=active]:bg-foreground/10 data-[state=inactive]:text-muted-foreground"
            >
              <Award className="h-3.5 w-3.5" />
              Awarded
              <span className="font-mono text-[10px] opacity-70">{statusCounts.awarded}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card/30">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">ID</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Title</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Severity</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Researcher</th>
                {showBountyColumn && (
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Bounty</th>
                )}
                {showCertificateColumn && (
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Certificate</th>
                )}
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + (showBountyColumn ? 1 : 0) + (showCertificateColumn ? 1 : 0)}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No reports in this view.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isUnread = !seenIds.has(String(report.id));
                  return (
                    <tr
                      key={report.id}
                      onClick={() => handleRowClick(String(report.id))}
                      className={`border-b border-border/20 hover:bg-foreground/5 transition-colors cursor-pointer ${
                        isUnread ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <td className="p-4 font-mono text-sm text-primary">
                        {report.reportId || `${String(report.id).substring(0, 8)}...`}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUnread && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white shrink-0">
                              <Sparkles className="h-2.5 w-2.5" />
                              New
                            </span>
                          )}
                          {report.isPrivate && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
                              Private
                            </Badge>
                          )}
                          <div>
                            <p
                              className={`font-medium line-clamp-1 ${
                                isUnread ? 'font-semibold text-foreground' : 'text-foreground'
                              }`}
                            >
                              {report.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{report.program}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge variant={severityVariant[report.severity] || 'info'} className="w-20 justify-center">
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

                      {showBountyColumn && (
                        <td className="p-4 font-mono font-semibold text-primary">
                          {report.bounty > 0 ? `PKR ${report.bounty.toLocaleString()}` : '-'}
                        </td>
                      )}

                      {showCertificateColumn && (
                        <td className="p-4">
                          {report.certificateId ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-600">
                              <FileBadge className="h-4 w-4" />
                              {report.certificateId}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}

                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(String(report.id));
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
