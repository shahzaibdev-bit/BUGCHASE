import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { API_URL } from '@/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ReportTimelineNode } from '@/components/reports/ReportTimelineNode';
import type { ReportTimelineEvent } from '@/components/reports/ReportTimelineNode';
import { toast } from '@/hooks/use-toast';

/**
 * Read-only comparison view for triagers. Opens in a new tab from duplicate review.
 * No status, severity, or promote actions.
 */
export default function TriagerReportPeek() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/triager/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to load report');

        const r = data.data.report;
        setReport(r);

        const comments: ReportTimelineEvent[] = (r.comments || []).map((c: any) => ({
          id: c._id,
          type: c.type || 'comment',
          author:
            c.sender?.role === 'admin'
              ? c.sender?.username || c.sender?.name || 'admin'
              : c.sender?.role !== 'company'
                ? c.sender?.username || c.sender?.name || 'User'
                : c.sender?.name || 'Company',
          authorAvatar: c.sender?.avatar,
          role:
            c.sender?.role === 'researcher'
              ? 'Researcher'
              : c.sender?.role === 'triager'
                ? 'Triager'
                : c.sender?.role === 'company'
                  ? 'Company'
                  : c.sender?.role === 'admin'
                    ? 'Admin'
                    : 'System',
          content: c.content,
          attachments: c.attachments || [],
          timestamp: c.createdAt,
          metadata: c.metadata || {},
        }));

        const submissionEvent: ReportTimelineEvent = {
          id: 'submission',
          type: 'comment',
          author: r.researcherId?.username || r.researcherId?.name || 'Researcher',
          authorAvatar: r.researcherId?.avatar,
          role: 'Researcher',
          content: `Submission: **${r.title}**`,
          timestamp: r.createdAt,
        };

        setTimeline([submissionEvent, ...comments]);
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Load failed', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !report) {
    return (
      <div className="p-10 text-center text-zinc-500 font-mono text-sm">
        {loading ? 'Loading read-only report…' : 'Report not found'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      <div className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Read-only comparison — you cannot change status, severity, or comments here.
          </p>
        </div>
        <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => navigate('/triager')}>
          <ArrowLeft className="h-3 w-3 mr-1" /> Queue
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="font-mono text-xs">
              {report.reportId || report._id}
            </Badge>
            <Badge variant="secondary">{report.status}</Badge>
            {report.triagerId && (
              <span className="text-xs text-zinc-500 font-mono">Claimed to triager queue</span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{report.title}</h1>

          {report.vulnerableEndpoint && (
            <div>
              <h2 className="text-xs font-bold uppercase text-zinc-500 mb-1">Vulnerable endpoint</h2>
              <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-all">
                {report.vulnerableEndpoint}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Description</h2>
            <div
              className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: report.description }}
            />
          </div>

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
                className="font-mono text-sm p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto text-zinc-800 dark:text-zinc-300"
                dangerouslySetInnerHTML={{ __html: report.pocSteps }}
              />
            </div>
          )}

          {report.attachments?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Attachments</h2>
              <ul className="space-y-2">
                {report.attachments.map((a: any, i: number) => (
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

          {report.assets?.filter((u: string) => u?.includes?.('cloudinary.com'))?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Media (assets)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {report.assets
                  .filter((u: string) => u.includes('cloudinary.com'))
                  .map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Activity / thread</h2>
            <div className="pl-1 space-y-0">
              {timeline.map((event, index) => (
                <ReportTimelineNode
                  key={String(event.id)}
                  event={event}
                  isConsecutive={false}
                  onPreviewMedia={() => {}}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
