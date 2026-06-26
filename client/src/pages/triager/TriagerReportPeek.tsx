import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ReportTimelineNode } from '@/components/reports/ReportTimelineNode';
import type { ReportTimelineEvent } from '@/components/reports/ReportTimelineNode';
import { ReportReadOnlyContent, ReportReadOnlySidebar } from '@/components/reports/ReportReadOnlyBody';
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
        const data = await apiFetchJson<{ data: { report: any }; message?: string }>(`/triager/reports/${id}`);
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
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      <div className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
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

      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(100vh-3.5rem)] grid grid-cols-1 lg:grid-cols-12 gap-0">
          <ScrollArea className="lg:col-span-8 h-full border-r border-zinc-200 dark:border-zinc-800">
            <div className="p-8 max-w-4xl mx-auto space-y-12 pb-32">
              <ReportReadOnlyContent report={report} />

              <Separator />

              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Activity / thread</h2>
                <div className="pl-1 space-y-0">
                  {timeline.map((event) => (
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

          <div className="lg:col-span-4 h-full overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/20 p-6">
            <ReportReadOnlySidebar report={report} />
          </div>
        </div>
      </div>
    </div>
  );
}
