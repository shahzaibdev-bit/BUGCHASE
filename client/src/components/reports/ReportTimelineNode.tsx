import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export interface ReportTimelineEvent {
  id: string;
  type: 'comment' | 'status_change' | 'action' | 'assignment' | 'severity_update' | 'bounty_awarded';
  author: string;
  authorAvatar?: string;
  role: 'Triager' | 'Researcher' | 'Company' | 'System' | 'Admin';
  content: string;
  attachments?: string[];
  timestamp: string;
  metadata?: any;
}

export function ReportTimelineNode({
  event,
  isConsecutive,
  onPreviewMedia,
  researcherProfileLinks = true,
}: {
  event: ReportTimelineEvent;
  isConsecutive?: boolean;
  onPreviewMedia?: (media: { url: string; type: 'image' | 'video' | 'pdf' }) => void;
  researcherProfileLinks?: boolean;
}) {
  const isSystem = event.role === 'System';

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const roleBadgeLabel =
    event.role === 'Triager' ? 'Bugchase Triage' : event.role === 'Admin' ? 'Platform Admin' : event.role;
  const authorHandle = (event.author || '').replace(/^@/, '').trim();

  const Avatar = () => {
    if (isConsecutive) {
      return (
        <div
          className="absolute left-[11px] top-[18px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-zinc-400 bg-white dark:border-zinc-500 dark:bg-zinc-950 z-10"
          aria-hidden
        />
      );
    }

    if (isSystem)
      return (
        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm z-10">
          <Activity className="h-4 w-4 text-zinc-500" />
        </div>
      );

    if (event.authorAvatar && event.authorAvatar !== 'default.jpg') {
      return (
        <img
          src={event.authorAvatar}
          alt={event.author}
          className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 z-10 bg-white"
        />
      );
    }

    return (
      <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs z-10 text-white bg-blue-600">
        {getInitials(event.author)}
      </div>
    );
  };

  return (
    <div className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="absolute left-[15px] top-0 bottom-[-24px] w-0.5 bg-zinc-200 dark:bg-zinc-800 last:hidden" />
      <div className="relative shrink-0 w-8">
        <Avatar />
      </div>
      <div className="flex-1 pb-6 relative group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {event.role === 'Researcher' && researcherProfileLinks ? (
              <div className="flex items-center gap-2">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <a
                      href={`/h/${event.author}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      @{event.author}
                    </a>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 font-inter">
                    <div className="flex justify-between space-x-4">
                      <UIAvatar>
                        <AvatarImage src={event.authorAvatar} />
                        <AvatarFallback>{event.author[0]?.toUpperCase()}</AvatarFallback>
                      </UIAvatar>
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-semibold">@{event.author}</h4>
                        <p className="text-sm text-muted-foreground">Security Researcher</p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal"
                >
                  Security Researcher
                </Badge>
              </div>
            ) : event.role === 'Researcher' && !researcherProfileLinks ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">@{event.author}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal"
                >
                  Security Researcher
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {isSystem
                    ? event.author
                    : event.role === 'Admin'
                      ? `Platform Admin @${authorHandle || 'admin'}`
                      : `@${authorHandle || 'unknown'}`}
                </span>
                {!isSystem && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal"
                  >
                    {roleBadgeLabel}
                  </Badge>
                )}
              </div>
            )}
            {event.type === 'status_change' && (
              <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                changed the status to{' '}
                {event.metadata?.newStatus?.toLowerCase() ||
                  event.content
                    .replace('Changed status to ', '')
                    .replace('System changed status to ', '')
                    .split('.')[0]
                    .toLowerCase()}
              </span>
            )}
            {event.type === 'bounty_awarded' && (
              <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                rewarded the researcher with a PKR{' '}
                {event.metadata?.bountyAwarded?.toLocaleString() ||
                  event.content.match(/\$(\d+)/)?.[1] ||
                  event.content.match(/PKR\s(\d+)/)?.[1] ||
                  0}{' '}
                bounty.
              </span>
            )}
            <span className="text-zinc-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(event.timestamp).toLocaleString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        </div>

        {event.type === 'status_change' ? (
          <div className="mt-1 flex flex-col items-start w-full gap-2">
            {event.metadata?.reason && (
              <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                    {event.metadata.reason}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : event.type === 'bounty_awarded' ? (
          <div className="mt-1 flex flex-col items-start w-full gap-2">
            {event.content && (
              <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                    {event.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : event.type === 'severity_update' ? (
          <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <span>updated severity —</span>
            <span className="font-bold" dangerouslySetInnerHTML={{ __html: event.content }} />
          </div>
        ) : event.type === 'comment' || event.type === 'assignment' ? (
          (() => {
            const isHtml = /^\s*<[a-z]/i.test(event.content);
            return (
              <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full font-inter leading-relaxed">
                {isHtml ? (
                  <div
                    className="prose prose-sm prose-zinc dark:prose-invert max-w-none focus:outline-none break-words prose-p:m-0 prose-ul:m-0 prose-ol:m-0 [&>*:not(:last-child)]:mb-2"
                    dangerouslySetInnerHTML={{ __html: event.content }}
                  />
                ) : (
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                      {event.content}
                    </ReactMarkdown>
                  </div>
                )}
                {event.attachments && event.attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {event.attachments.map((url: string, fileIdx: number) => {
                      const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
                      const isPdf = url.includes('/raw/') || /\.pdf$/i.test(url);

                      return (
                        <div
                          key={fileIdx}
                          className="group/att relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
                        >
                          {isVideo ? (
                            <div
                              className="w-full h-full cursor-pointer relative block"
                              onClick={() => onPreviewMedia?.({ url, type: 'video' })}
                            >
                              <video src={url} className="w-full h-full object-cover bg-black pointer-events-none" />
                              <div className="absolute inset-0 bg-black/20 group-hover/att:bg-black/40 transition-colors flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center backdrop-blur-sm">
                                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-black border-b-[5px] border-b-transparent ml-1" />
                                </div>
                              </div>
                            </div>
                          ) : isPdf ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-full cursor-pointer relative flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 group-hover/att:bg-zinc-200 dark:group-hover/att:bg-zinc-700 transition-colors p-2"
                            >
                              <svg className="w-8 h-8 text-red-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9.5 11.5C9.5 12.3 8.8 13 8 13H7V15H5.5V9H8C8.8 9 9.5 9.7 9.5 10.5V11.5ZM14.5 13.5C14.5 14.3 13.8 15 13 15H10.5V9H13C13.8 9 14.5 9.7 14.5 10.5V13.5ZM18.5 10.5H17V11.5H18.5V13H17V15H15.5V9H18.5V10.5ZM7 10.5H8V11.5H7V10.5ZM12 10.5H13V13.5H12V10.5Z" />
                              </svg>
                              <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
                                PDF Document
                              </span>
                            </a>
                          ) : (
                            <img
                              src={url}
                              alt={`Attachment ${fileIdx + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => onPreviewMedia?.({ url, type: 'image' })}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()
        ) : null}
      </div>
    </div>
  );
}
