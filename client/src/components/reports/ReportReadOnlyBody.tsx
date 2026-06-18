import { Badge } from '@/components/ui/badge';

type ReportReadOnlyBodyProps = {
  report: {
    reportId?: string;
    _id?: string;
    title?: string;
    status?: string;
    severity?: string;
    researcherSeverity?: string;
    assetType?: string;
    vulnerabilityCategory?: string;
    vulnerableEndpoint?: string;
    description?: string;
    impact?: string;
    pocSteps?: string;
    cvssScore?: number;
    cvssVector?: string;
    assets?: string[];
    attachments?: Array<{ name?: string; url?: string; type?: string }>;
    programId?: string;
    createdAt?: string;
    researcherId?: { name?: string; username?: string; avatar?: string };
    triagerId?: { name?: string; username?: string };
    aiTriage?: { severity?: string; cvssScore?: number; cvssVector?: string };
  };
  compact?: boolean;
};

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

export function ReportReadOnlyBody({ report, compact }: ReportReadOnlyBodyProps) {
  const cloudinaryUrls = (report.assets || []).filter((u) => u?.includes?.('cloudinary.com'));
  const scopeAssets = (report.assets || []).filter((u) => u && !u.includes('cloudinary.com'));

  return (
    <div className={compact ? 'space-y-5' : 'space-y-8'}>
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="font-mono text-xs">
          {report.reportId || report._id}
        </Badge>
        {report.status && <Badge variant="secondary">{report.status}</Badge>}
        <SeverityBadge severity={report.severity} />
        {report.researcherSeverity && report.researcherSeverity !== report.severity && (
          <Badge variant="outline" className="text-[10px] font-mono text-zinc-500">
            Researcher: {report.researcherSeverity}
          </Badge>
        )}
        {report.assetType && (
          <Badge variant="outline" className="text-[10px] font-mono uppercase">
            {report.assetType}
          </Badge>
        )}
        {report.vulnerabilityCategory && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {report.vulnerabilityCategory}
          </Badge>
        )}
      </div>

      {report.title && (
        <h1 className={compact ? 'text-xl font-bold text-zinc-900 dark:text-white' : 'text-3xl font-bold text-zinc-900 dark:text-white'}>
          {report.title}
        </h1>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {report.researcherId && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-0.5">Researcher</p>
            <p className="font-medium">
              {report.researcherId.username || report.researcherId.name || 'Researcher'}
            </p>
          </div>
        )}
        {report.triagerId && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-0.5">Current triager</p>
            <p className="font-medium">{report.triagerId.username || report.triagerId.name}</p>
          </div>
        )}
        {report.programId && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-0.5">Program</p>
            <p className="font-mono text-xs">{report.programId}</p>
          </div>
        )}
        {report.createdAt && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-0.5">Submitted</p>
            <p className="font-mono text-xs">{new Date(report.createdAt).toLocaleString()}</p>
          </div>
        )}
        {(report.cvssScore != null || report.cvssVector) && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 sm:col-span-2">
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-0.5">CVSS</p>
            <p className="font-mono text-xs break-all">
              {report.cvssScore != null ? `${report.cvssScore}` : '—'}
              {report.cvssVector ? ` · ${report.cvssVector}` : ''}
            </p>
          </div>
        )}
        {report.aiTriage?.severity && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 sm:col-span-2">
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-0.5">AI triage</p>
            <p className="font-mono text-xs">
              {report.aiTriage.severity}
              {report.aiTriage.cvssScore != null ? ` · CVSS ${report.aiTriage.cvssScore}` : ''}
            </p>
          </div>
        )}
      </div>

      {report.vulnerableEndpoint && (
        <div>
          <h2 className="text-xs font-bold uppercase text-zinc-500 mb-1">Vulnerable endpoint</h2>
          <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">{report.vulnerableEndpoint}</p>
        </div>
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
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Description</h2>
          <div
            className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: report.description }}
          />
        </div>
      )}

      {report.impact && (
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Impact</h2>
          <div
            className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: report.impact }}
          />
        </div>
      )}

      {report.pocSteps && (
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Proof of concept</h2>
          <div
            className="font-mono text-sm p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto text-zinc-800 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: report.pocSteps }}
          />
        </div>
      )}

      {report.attachments && report.attachments.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Attachments</h2>
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
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Media (PoC)</h2>
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
