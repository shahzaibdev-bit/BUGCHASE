import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatReportVrt } from '@/lib/vrtTaxonomy';
import { Calendar, Clock, Shield, User } from 'lucide-react';

export type ReportReadOnlyData = {
  reportId?: string;
  _id?: string;
  title?: string;
  status?: string;
  severity?: string;
  researcherSeverity?: string;
  assetType?: string;
  vulnerabilityCategory?: string;
  vrtParent?: string;
  vrtCategory?: string;
  vrtVariant?: string;
  vulnerableEndpoint?: string;
  description?: string;
  impact?: string;
  pocSteps?: string;
  cvssScore?: number;
  cvssVector?: string;
  assets?: string[];
  attachments?: Array<{ name?: string; url?: string; type?: string }>;
  programId?:
    | string
    | {
        _id?: string;
        title?: string;
        companyName?: string;
        type?: string;
        bountyRange?: string;
        companyId?: { name?: string; avatar?: string };
      };
  createdAt?: string;
  researcherId?: { name?: string; username?: string; avatar?: string };
  triagerId?:
    | string
    | { _id?: string; name?: string; username?: string; avatar?: string };
  triagerParticipants?: Array<{
    role?: string;
    triagerId?: { _id?: string; name?: string; username?: string; avatar?: string };
  }>;
  comments?: Array<{
    type?: string;
    sender?: { _id?: string; name?: string; username?: string; avatar?: string; role?: string };
  }>;
  aiTriage?: { severity?: string; cvssScore?: number; cvssVector?: string };
};

type ReportReadOnlyBodyProps = {
  report: ReportReadOnlyData;
  compact?: boolean;
};

function formatProgramLabel(
  programId: NonNullable<ReportReadOnlyData['programId']>,
): string {
  if (typeof programId === 'string') return programId;
  const title = programId.title || programId.companyName;
  if (title && programId.type) return `${title} (${programId.type})`;
  return title || programId._id || 'Program';
}

function isObjectIdString(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function resolvePerson(
  person: ReportReadOnlyData['researcherId'] | ReportReadOnlyData['triagerId'],
): { label: string; username?: string; name?: string; avatar?: string } | null {
  if (!person) return null;
  if (typeof person === 'string') {
    if (isObjectIdString(person)) return null;
    return { label: person };
  }
  const username = person.username?.trim();
  const name = person.name?.trim();
  if (username) return { label: `@${username}`, username, name, avatar: person.avatar };
  if (name) return { label: name, name, avatar: person.avatar };
  return null;
}

function resolveCurrentTriager(report: ReportReadOnlyData) {
  const direct = resolvePerson(report.triagerId);
  if (direct) return direct;

  const participants = report.triagerParticipants || [];
  const primary =
    participants.find((p) => p.role === 'primary') || participants[0];
  const fromParticipant = resolvePerson(primary?.triagerId);
  if (fromParticipant) return fromParticipant;

  const assignment = [...(report.comments || [])]
    .reverse()
    .find((c) => c.type === 'assignment' && c.sender);
  return resolvePerson(assignment?.sender);
}

function formatSubmittedAt(createdAt?: string) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  let relative = 'Today';
  if (dayDiff === 1) relative = 'Yesterday';
  else if (dayDiff > 1) relative = `${dayDiff} days ago`;
  else if (dayDiff < 0) relative = 'In the future';

  return {
    relative,
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    calendar: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

function PersonCard({
  label,
  person,
  fallback,
  icon: Icon,
  accent = 'zinc',
}: {
  label: string;
  person: { label: string; username?: string; name?: string; avatar?: string } | null;
  fallback: string;
  icon: typeof User;
  accent?: 'zinc' | 'indigo';
}) {
  const displayName = person?.name || (person?.username ? `@${person.username}` : null);
  const handle = person?.username;
  const initial = (person?.name || person?.username || fallback).replace('@', '').charAt(0).toUpperCase();
  const accentBorder =
    accent === 'indigo'
      ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20'
      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950';

  return (
    <div className={`rounded-lg border p-3 ${accentBorder}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      </div>
      {person ? (
        <div className="flex items-center gap-3 min-w-0">
          {person.avatar && person.avatar !== 'default.jpg' ? (
            <img src={person.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-zinc-900" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm text-zinc-600 dark:text-zinc-300 font-bold shrink-0 ring-2 ring-white dark:ring-zinc-900">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            {displayName && (
              <p className="font-semibold text-zinc-900 dark:text-white truncate leading-tight">
                {person.name || `@${person.username}`}
              </p>
            )}
            {handle && (
              <a
                href={`/h/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono truncate block"
              >
                @{handle}
              </a>
            )}
            {!displayName && !handle && (
              <p className="font-medium text-zinc-900 dark:text-white truncate">{person.label}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{fallback}</p>
      )}
    </div>
  );
}

function SubmittedCard({ createdAt }: { createdAt?: string }) {
  const formatted = formatSubmittedAt(createdAt);
  if (!formatted) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Submitted</p>
        <p className="text-sm font-medium text-zinc-400">—</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Submitted</p>
      </div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatted.relative}</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{formatted.weekday}</p>
      <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-zinc-500">
        <Clock className="h-3 w-3 shrink-0" />
        <span>
          {formatted.calendar} · {formatted.time}
        </span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  const key = severity.toLowerCase();
  const styles: Record<string, string> = {
    critical: 'border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10',
    high: 'border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10',
    medium: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
    low: 'border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10',
  };
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${styles[key] || ''}`}>
      {severity}
    </Badge>
  );
}

/** Right sidebar metadata — matches triager report details layout. */
export function ReportReadOnlySidebar({ report }: { report: ReportReadOnlyData }) {
  const vrt = formatReportVrt(report);
  const program =
    report.programId && typeof report.programId !== 'string' ? report.programId : null;
  const currentTriager = resolveCurrentTriager(report);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase">Current Status</span>
          <Badge
            variant="outline"
            className="bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 text-black dark:text-white px-3 py-1"
          >
            {report.status || 'Unknown'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity={report.severity} />
          {report.researcherSeverity && report.researcherSeverity !== report.severity && (
            <Badge variant="outline" className="text-[10px] font-mono text-zinc-500">
              Researcher: {report.researcherSeverity}
            </Badge>
          )}
        </div>
      </div>

      <Separator className="bg-zinc-200 dark:border-zinc-800" />

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Report Details</h4>
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Report ID</p>
            <p className="font-mono text-xs font-medium text-zinc-900 dark:text-white break-all">
              {report.reportId || report._id}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Program</p>
            {program ? (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                  {program.companyId?.avatar ? (
                    <img src={program.companyId.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm text-zinc-400">
                      {(program.companyName || program.title || '?')[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white leading-snug">
                    {program.title || program.companyName || 'Program'}
                  </p>
                  {program.companyName && program.title && (
                    <p className="text-xs text-zinc-500 truncate">{program.companyName}</p>
                  )}
                  {program.type && (
                    <Badge variant="outline" className="mt-1 text-[10px] font-mono uppercase">
                      {program.type}
                    </Badge>
                  )}
                </div>
              </div>
            ) : report.programId ? (
              <p className="font-medium text-zinc-900 dark:text-white">{formatProgramLabel(report.programId)}</p>
            ) : (
              <p className="font-medium text-zinc-400">Unknown</p>
            )}
          </div>
          <SubmittedCard createdAt={report.createdAt} />
          <PersonCard
            label="Reporter"
            person={resolvePerson(report.researcherId)}
            fallback="Unknown"
            icon={User}
          />
          <PersonCard
            label="Current triager"
            person={currentTriager}
            fallback="Unassigned"
            icon={Shield}
            accent="indigo"
          />
          {report.assetType && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">Asset type</p>
              <p className="font-medium text-zinc-900 dark:text-white uppercase text-xs font-mono">
                {report.assetType}
              </p>
            </div>
          )}
          {(report.vulnerabilityCategory || report.vrtVariant) && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">VRT classification</p>
              <p className="font-medium text-zinc-900 dark:text-white text-sm" title={vrt.breadcrumb}>
                {vrt.label}
              </p>
              {vrt.breadcrumb !== vrt.label && (
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{vrt.breadcrumb}</p>
              )}
            </div>
          )}
          {report.vulnerableEndpoint && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">Vulnerable endpoint</p>
              <p className="font-mono text-xs text-zinc-900 dark:text-white break-all leading-relaxed">
                {report.vulnerableEndpoint}
              </p>
            </div>
          )}
        </div>
      </div>

      {(report.cvssScore != null || report.cvssVector || report.aiTriage?.severity) && (
        <>
          <Separator className="bg-zinc-200 dark:border-zinc-800" />
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Severity / CVSS</h4>
            {(report.cvssScore != null || report.cvssVector) && (
              <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div className="flex justify-between items-end mb-2 gap-2">
                  <span className="text-3xl font-bold text-black dark:text-white">
                    {report.cvssScore != null ? report.cvssScore : '—'}
                  </span>
                  {report.severity && (
                    <span className="text-sm font-bold text-orange-500 uppercase">{report.severity}</span>
                  )}
                </div>
                {report.cvssVector && (
                  <div className="text-[10px] font-mono text-zinc-500 break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                    {report.cvssVector}
                  </div>
                )}
              </div>
            )}
            {report.aiTriage?.severity && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-lg">
                <p className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 mb-1">
                  AI triage
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {report.aiTriage.severity}
                  {report.aiTriage.cvssScore != null ? ` · CVSS ${report.aiTriage.cvssScore}` : ''}
                </p>
                {report.aiTriage.cvssVector && (
                  <p className="text-[10px] font-mono text-zinc-500 mt-1 break-all">
                    {report.aiTriage.cvssVector}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Main report content (left column). */
export function ReportReadOnlyContent({ report, compact }: ReportReadOnlyBodyProps) {
  const cloudinaryUrls = (report.assets || []).filter((u) => u?.includes?.('cloudinary.com'));
  const scopeAssets = (report.assets || []).filter((u) => u && !u.includes('cloudinary.com'));
  const vrt = formatReportVrt(report);

  return (
    <div className={compact ? 'space-y-5' : 'space-y-8'}>
      <div className="flex flex-wrap gap-2 items-center lg:hidden">
        <Badge variant="outline" className="font-mono text-xs">
          {report.reportId || report._id}
        </Badge>
        {report.status && <Badge variant="secondary">{report.status}</Badge>}
        <SeverityBadge severity={report.severity} />
        {(report.vulnerabilityCategory || report.vrtVariant) && (
          <Badge variant="outline" className="text-[10px] font-mono" title={vrt.breadcrumb}>
            {vrt.label}
          </Badge>
        )}
      </div>

      {report.title && (
        <h1
          className={
            compact
              ? 'text-xl font-bold text-zinc-900 dark:text-white'
              : 'text-3xl font-bold text-zinc-900 dark:text-white leading-tight'
          }
        >
          {report.title}
        </h1>
      )}

      {scopeAssets.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase text-zinc-500 mb-2">In-scope assets</h2>
          <ul className="space-y-1">
            {scopeAssets.map((url, i) => (
              <li key={i} className="font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all">
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.description && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
            Description
          </h2>
          <div
            className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: report.description }}
          />
        </div>
      )}

      {report.impact && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            Impact
          </h2>
          <div
            className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: report.impact }}
          />
        </div>
      )}

      {report.pocSteps && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            Proof of concept
          </h2>
          <div
            className="font-mono text-sm p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto text-zinc-800 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: report.pocSteps }}
          />
        </div>
      )}

      {report.attachments && report.attachments.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            Attachments
          </h2>
          <ul className="space-y-2">
            {report.attachments.map((a, i) => (
              <li key={i}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 text-sm underline break-all"
                >
                  {a.name || a.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cloudinaryUrls.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            Media (PoC)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cloudinaryUrls.map((url, index) => {
              const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
              if (isVideo) {
                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-mono text-zinc-500"
                  >
                    Video
                  </a>
                );
              }
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Stacked layout (legacy). Prefer split layout in TriagerReportPeek. */
export function ReportReadOnlyBody({ report, compact }: ReportReadOnlyBodyProps) {
  return (
    <div className="space-y-8">
      <ReportReadOnlyContent report={report} compact={compact} />
      <ReportReadOnlySidebar report={report} />
    </div>
  );
}
