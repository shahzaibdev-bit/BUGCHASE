import { useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AlertTriangle, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CyberLogoMark } from '@/components/CyberLogo';
import { isAiTriageUser } from '@/lib/aiTriageUser';
import { SupportReport, SupportReportComment, SupportReportUser } from '@/types';

const proseClass =
  'prose prose-sm md:prose-base prose-zinc dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-zinc-800 prose-pre:shadow-sm prose-pre:rounded-lg prose-code:text-zinc-800 dark:prose-code:text-emerald-400 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_pre_code]:text-zinc-300 dark:[&_pre_code]:text-zinc-300 [&_pre_code]:bg-transparent [&_pre_code]:p-0';

function userName(u?: SupportReportUser | string | null) {
  if (!u || typeof u !== 'object') return 'Unknown';
  return u.username || u.name || 'Unknown';
}

function roleLabel(role?: string) {
  if (role === 'researcher') return 'Security Researcher';
  if (role === 'triager') return 'Bugchase Triage';
  if (role === 'company') return 'Company';
  if (role === 'admin') return 'Platform Admin';
  return role || 'User';
}

function CommentBody({ comment }: { comment: SupportReportComment }) {
  if (comment.type === 'status_change') {
    return (
      <div className="mt-1 flex flex-col items-start w-full gap-2">
        <span className="text-zinc-800 dark:text-zinc-200 text-[14px] font-medium tracking-tight">
          changed the status to{' '}
          {(comment.metadata?.newStatus || comment.content || '').toString().toLowerCase()}
        </span>
        {comment.metadata?.reason != null && (
          <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%]">
            <div className={cn('relative z-10', proseClass, 'prose-sm')}>
              <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                {String(comment.metadata.reason)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (comment.type === 'bounty_awarded') {
    return (
      <div className="mt-1 flex flex-col items-start w-full gap-2">
        <span className="text-zinc-800 dark:text-zinc-200 text-[14px] font-medium tracking-tight">
          awarded a bounty.
        </span>
        {comment.content && (
          <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%]">
            <div className={cn('relative z-10', proseClass, 'prose-sm')}>
              <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                {comment.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (comment.type === 'severity_update') {
    return (
      <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>updated severity —</span>
        <span className="font-bold" dangerouslySetInnerHTML={{ __html: comment.content }} />
      </div>
    );
  }

  if (comment.type === 'ai_triage') {
    return (
      <div className="mt-1 bg-gradient-to-br from-cyan-50/80 to-white dark:from-cyan-950/30 dark:to-zinc-900/60 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-cyan-200/70 dark:border-cyan-900/40 max-w-full leading-relaxed">
        {comment.metadata?.oldSeverity != null && comment.metadata?.newSeverity != null && (
          <div className="mb-2 flex items-center flex-wrap gap-2 text-[12px] text-zinc-600 dark:text-zinc-300">
            <span className="font-medium">Severity changed:</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
              {String(comment.metadata.oldSeverity)}
            </span>
            <span>→</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 font-mono">
              {String(comment.metadata.newSeverity)}
            </span>
          </div>
        )}
        <div className={cn(proseClass, 'prose-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0')}>
          <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
            {comment.content || '_The AI did not return a reasoning breakdown._'}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full leading-relaxed">
      <div
        className={cn(
          proseClass,
          'prose-sm focus:outline-none break-words prose-p:m-0 prose-ul:m-0 prose-ol:m-0 [&>*:not(:last-child)]:mb-2',
        )}
        dangerouslySetInnerHTML={{ __html: comment.content }}
      />
      {comment.attachments && comment.attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {comment.attachments.map((url, fileIdx) => (
            <a
              key={fileIdx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-500 p-2 text-center"
            >
              Attachment {fileIdx + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReportActivityFeedProps {
  report: SupportReport;
  onPreviewMedia: (media: { url: string; type: 'image' | 'video' }) => void;
}

export function ReportActivityFeed({ report, onPreviewMedia }: ReportActivityFeedProps) {
  const researcher =
    report.researcherId && typeof report.researcherId === 'object' ? report.researcherId : null;
  const targetAsset =
    report.assets?.find((u) => u && !u.includes('cloudinary.com')) || 'the program';

  return (
    <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
      <h2 className="text-2xl font-bold font-mono mb-8 text-zinc-900 dark:text-white">Activity</h2>

      <div className="relative pl-12 space-y-12">
        <div className="relative group">
          <div className="absolute -left-[25px] top-0 -bottom-12 w-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10" />
          <div className="absolute -left-[44px] top-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center border-4 border-white dark:border-zinc-950 z-10 overflow-hidden">
            {researcher?.avatar ? (
              <img src={researcher.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-xs">{(researcher?.name || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                @{userName(researcher)}
              </span>
              <Badge className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal bg-transparent">
                Security Researcher
              </Badge>
              {report.createdAt && (
                <span className="text-xs text-zinc-500">
                  {format(new Date(report.createdAt), 'MMM d, HH:mm')}
                </span>
              )}
            </div>
            <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full leading-relaxed">
              Hi, I found a vulnerability in <span className="font-bold">{targetAsset}</span>. Please verify.
            </div>
          </div>
        </div>

        {(report.comments || []).map((comment, idx) => {
          const prev =
            idx === 0
              ? null
              : report.comments[idx - 1];
          const sender =
            comment.sender && typeof comment.sender === 'object' ? comment.sender : null;
          const prevSender =
            prev?.sender && typeof prev.sender === 'object' ? prev.sender : null;
          const isConsecutive =
            idx === 0
              ? sender?.username === researcher?.username
              : prevSender?.username === sender?.username && prevSender?.name === sender?.name;
          const isAiTriage =
            comment.type === 'ai_triage' ||
            isAiTriageUser(sender);

          return (
            <div key={comment._id || idx} className="relative group pl-12 -ml-12 mt-4 pt-2">
              <div className="absolute left-[23px] top-0 -bottom-12 w-0.5 bg-zinc-200 dark:bg-zinc-800 z-0" />

              {!isConsecutive ? (
                isAiTriage ? (
                  <div className="absolute left-[4px] top-2 w-10 h-10 rounded-xl flex items-center justify-center border-4 border-white dark:border-zinc-950 z-10 bg-white p-0.5">
                    <CyberLogoMark className="w-full h-full" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'absolute left-[4px] top-2 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-950 z-10 overflow-hidden',
                      !sender?.avatar && 'bg-blue-600 text-white',
                    )}
                  >
                    {sender?.avatar ? (
                      <img src={sender.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs">{sender?.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                )
              ) : (
                <div className="absolute left-[18px] top-6 w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-background z-10" />
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isAiTriage ? (
                    <>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        BugChase AI @bugchase_ai_triage
                      </span>
                      <Badge className="text-[10px] px-1 py-0 border-cyan-300 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 font-medium bg-cyan-50 dark:bg-cyan-950/40">
                        BugChase AI
                      </Badge>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {sender?.role === 'researcher'
                          ? `@${userName(sender)}`
                          : sender?.role === 'triager'
                            ? `@${userName(sender)}`
                            : sender?.role === 'admin'
                              ? `Platform Admin @${userName(sender)}`
                              : sender?.name || 'User'}
                      </span>
                      <Badge className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal bg-transparent">
                        {roleLabel(sender?.role)}
                      </Badge>
                    </>
                  )}
                  <span className="text-zinc-400 text-[10px] ml-2">
                    {format(new Date(comment.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
                <CommentBody comment={comment} />
              </div>
            </div>
          );
        })}

        <div className="relative">
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-3 text-sm text-zinc-500 font-mono">
            Read-only view — support cannot post comments on this report.
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReportContentSectionsProps {
  report: SupportReport;
  onPreviewMedia: (media: { url: string; type: 'image' | 'video' }) => void;
}

export function ReportContentSections({ report, onPreviewMedia }: ReportContentSectionsProps) {
  const program =
    report.programId && typeof report.programId === 'object' ? report.programId : null;
  const companyAvatar = program?.companyId && typeof program.companyId === 'object'
    ? program.companyId.avatar
    : undefined;
  const targetLabel =
    report.assets?.find((u) => u && !u.includes('cloudinary.com')) || 'Unknown Target';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-sm overflow-hidden flex items-center justify-center">
          {companyAvatar ? (
            <img src={companyAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-zinc-700 dark:text-white uppercase">
              {targetLabel.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-zinc-500 dark:text-zinc-400 font-mono text-xs mb-1 uppercase tracking-wider">
            Target
          </h3>
          <span className="text-xl font-bold text-zinc-900 dark:text-white">{targetLabel}</span>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Vulnerability Details</h2>
        <div className={proseClass}>
          <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
            {report.description || '*No description provided.*'}
          </ReactMarkdown>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Steps to Reproduce & PoC</h2>
        <div
          className={cn(
            proseClass,
            'bg-white dark:bg-zinc-900/40 p-6 md:p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-relaxed',
          )}
        >
          <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
            {report.pocSteps || '*No steps provided.*'}
          </ReactMarkdown>
        </div>
      </div>

      {report.impact && (
        <div className="pt-4">
          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rotate-45 transform translate-x-16 -translate-y-16 pointer-events-none" />
            <h4 className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-sm uppercase tracking-widest mb-4 font-bold relative z-10">
              <AlertTriangle className="w-4 h-4" /> Impact Assessment
            </h4>
            <div
              className={cn(
                proseClass,
                'prose-p:text-zinc-800 dark:prose-p:text-rose-100/80 leading-relaxed relative z-10',
              )}
            >
              <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                {report.impact}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const cloudinaryUrls =
          report.assets?.filter((url) => url.includes('cloudinary.com')) || [];
        if (cloudinaryUrls.length === 0) return null;

        return (
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Attachments (PoC)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cloudinaryUrls.map((url, index) => {
                const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
                const isPdf = url.includes('/raw/') || /\.pdf$/i.test(url);

                return (
                  <div
                    key={index}
                    className="group relative aspect-video bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
                  >
                    {isVideo ? (
                      <button
                        type="button"
                        className="w-full h-full cursor-pointer relative block"
                        onClick={() => onPreviewMedia({ url, type: 'video' })}
                      >
                        <video src={url} className="w-full h-full object-contain bg-black pointer-events-none" />
                      </button>
                    ) : isPdf ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2 p-4 w-full h-full justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-rose-500" />
                        <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">View PDF</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="w-full h-full block cursor-pointer"
                        onClick={() => onPreviewMedia({ url, type: 'image' })}
                      >
                        <img
                          src={url}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
