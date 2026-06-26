import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, Shield, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SupportReport } from '@/types';
import { Badge } from '@/components/ui/badge';
import { CyberLogoMark } from '@/components/CyberLogo';
import { isAiTriageUser, userAvatarUrl } from '@/lib/aiTriageUser';
import { ReportActivityFeed, ReportContentSections } from '@/components/reports/ReportReadOnlySections';

export function SupportReportDetails() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<SupportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(
    null,
  );

  useEffect(() => {
    if (!reportId) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch<{ data: { report: SupportReport } }>(
          `/disputes/reports/${reportId}`,
        );
        setReport(res.data.report);
      } catch (err: any) {
        setError(err.message || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500 font-mono text-sm">
        Loading report…
      </div>
    );
  }

  if (!report || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500 font-mono text-sm">
        {error || 'Report not found.'}
      </div>
    );
  }

  const displayReportId = report.reportId || report._id?.slice(-6) || 'N/A';
  const program =
    report.programId && typeof report.programId === 'object' ? report.programId : null;
  const researcher =
    report.researcherId && typeof report.researcherId === 'object' ? report.researcherId : null;
  const triager =
    report.triagerId && typeof report.triagerId === 'object' ? report.triagerId : null;

  const participantMap = new Map<
    string,
    { name: string; role: string; avatarUrl?: string; isAiTriage?: boolean }
  >();
  if (researcher) {
    participantMap.set(researcher._id || 'researcher', {
      name: researcher.name || researcher.username || 'Researcher',
      role: 'Author',
      avatarUrl: researcher.avatar,
    });
  }
  if (triager?._id) {
    participantMap.set(triager._id, {
      name: triager.name || triager.username || 'Triager',
      role: 'Triager',
      avatarUrl: triager.avatar,
    });
  }
  for (const c of report.comments || []) {
    const s = c.sender && typeof c.sender === 'object' ? c.sender : null;
    if (!s?._id || participantMap.has(s._id)) continue;
    if (s._id === researcher?._id) continue;
    if (isAiTriageUser(s)) {
      participantMap.set(s._id, {
        name: 'BugChase AI',
        role: 'BugChase AI',
        isAiTriage: true,
      });
      continue;
    }
    participantMap.set(s._id, {
      name: s.name || s.username || 'User',
      role: s.role || 'Participant',
      avatarUrl: userAvatarUrl(s) || undefined,
    });
  }
  const participants = Array.from(participantMap.values());

  const duplicateProcessing =
    report.aiDuplicateAnalysis?.status === 'pending' ||
    report.aiDuplicateAnalysis?.status === 'processing';
  const triageProcessing =
    report.aiTriage?.status === 'pending' || report.aiTriage?.status === 'processing';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-wrap items-center gap-2">
        <Eye className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Read-only report view for support — same layout as the researcher portal, without edit actions.
        </p>
      </div>

      <div className="p-8 pt-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3" /> Bug Bounty Report
            </span>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {report.title}
              </h1>
              <Badge className="font-mono bg-transparent border border-zinc-300 dark:border-zinc-600">
                {report.status}
              </Badge>
              {(duplicateProcessing || triageProcessing) && (
                <Badge className="font-mono gap-2 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  UNDER SYSTEM PROCESS
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ReportContentSections report={report} onPreviewMedia={setPreviewMedia} />
            <ReportActivityFeed report={report} onPreviewMedia={setPreviewMedia} />
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold">
                  Details
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm text-zinc-500 shrink-0">Program</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white text-right">
                    {program?.title || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Report ID</span>
                  <span className="text-sm font-mono text-zinc-900 dark:text-white">
                    {displayReportId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Created</span>
                  <span className="text-sm font-mono text-zinc-900 dark:text-white">
                    {report.createdAt
                      ? format(new Date(report.createdAt), 'dd.MM.yyyy HH:mm')
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Severity</span>
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-500">
                    {report.severity}
                  </span>
                </div>
                {report.vulnerableEndpoint && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                    <span className="text-xs text-zinc-500 block mb-1">Vulnerable endpoint</span>
                    <span className="text-sm text-zinc-900 dark:text-white font-mono break-all block">
                      {report.vulnerableEndpoint}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                  <span className="text-xs text-zinc-500 block mb-1">Vulnerability Type</span>
                  <span
                    className="text-sm text-zinc-900 dark:text-white font-medium block truncate"
                    title={report.vrtVariant || report.vulnerabilityCategory}
                  >
                    {report.vrtVariant || report.vulnerabilityCategory || 'N/A'}
                  </span>
                  {(report.vrtParent || report.vrtCategory) && (
                    <span className="text-xs text-zinc-500 block truncate mt-0.5">
                      {[report.vrtParent, report.vrtCategory].filter(Boolean).join(' → ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg backdrop-blur-sm p-4 shadow-sm">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold mb-4">
                Participants ({participants.length})
              </h3>
              <div className="space-y-3">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {p.isAiTriage ? (
                      <CyberLogoMark className="w-8 h-8" />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-zinc-900 dark:text-zinc-300 font-medium leading-none truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-mono mt-0.5">
                        {p.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-700 dark:text-blue-200/80 font-mono">
                Support read-only mode — return to the dispute tab to reply to the user.
              </p>
            </div>
          </div>
        </div>
      </div>

      {previewMedia &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 md:p-12"
            onClick={() => setPreviewMedia(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewMedia(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[100000]"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="relative max-w-full max-h-full rounded-lg overflow-hidden flex items-center justify-center outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.url}
                  alt="Preview"
                  className="max-w-full max-h-[85vh] object-contain rounded-md"
                />
              ) : (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[85vh] rounded-md ring-1 ring-white/20 shadow-2xl bg-black"
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
