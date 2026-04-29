import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, Calculator, Send, Pencil } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL } from '@/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { CvssInteractiveModal } from '@/components/CvssInteractiveModal';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReportTimelineNode } from '@/components/reports/ReportTimelineNode';
import type { ReportTimelineEvent } from '@/components/reports/ReportTimelineNode';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_OPTIONS = [
  'Submitted',
  'Triaging',
  'Under Review',
  'Needs Info',
  'Triaged',
  'Resolved',
  'Paid',
  'Closed',
  'Spam',
  'Duplicate',
  'Out-of-Scope',
  'NA',
] as const;

function fieldModalTitle(field: string | null): string {
  if (!field) return 'Edit';
  const map: Record<string, string> = {
    title: 'Title',
    vulnerabilityCategory: 'Vulnerability category',
    description: 'Description',
    impact: 'Impact',
    pocSteps: 'Proof of concept',
  };
  return map[field] || field;
}

export default function AdminReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const adminReturnTo = (location.state as { adminReturnTo?: string } | null)?.adminReturnTo;
  const goBack = () => navigate(adminReturnTo || '/admin/users');
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editorContent, setEditorContent] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<any>('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [mobileTab, setMobileTab] = useState<'details' | 'activity' | 'tools'>('details');
  const [cvssModalOpen, setCvssModalOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'pdf' } | null>(null);
  const [state, setState] = useState({
    status: 'Submitted',
    severity: { final: 0, vector: '', level: 'Low' },
    timeline: [] as ReportTimelineEvent[],
  });

  const composerAvatar = () => {
    const av = (user as { avatar?: string })?.avatar;
    if (av && av !== 'default.jpg') {
      return (
        <img
          src={av}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      );
    }
    const name = user?.name || user?.username || 'ME';
    const initials =
      name === 'ME'
        ? 'ME'
        : name
            .trim()
            .split(/\s+/)
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    return <span className="font-bold text-xs">{initials}</span>;
  };

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load report');
      const r = data.data.report;
      setReport(r);
      const timeline = (r.comments || []).map((c: any) => ({
        id: c._id,
        type: (c.type || 'comment') as ReportTimelineEvent['type'],
        author:
          c.sender?.role === 'admin'
            ? (c.sender?.username || c.sender?.name || 'admin')
            : (c.sender?.username || c.sender?.name || 'Unknown'),
        authorAvatar: c.sender?.avatar,
        role:
          c.sender?.role === 'admin'
            ? 'Admin'
            : c.sender?.role === 'researcher'
              ? 'Researcher'
              : c.sender?.role === 'triager'
                ? 'Triager'
                : c.sender?.role === 'company'
                  ? 'Company'
                  : 'System',
        content: c.content,
        attachments: c.attachments || [],
        timestamp: c.createdAt,
        metadata: c.metadata || {},
      })) as ReportTimelineEvent[];
      setState({
        status: r.status,
        severity: { final: r.cvssScore || 0, vector: r.cvssVector || '', level: r.severity || 'Low' },
        timeline,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const socketUrl = API_URL.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { withCredentials: true });
    socket.on('connect', () => socket.emit('join_report', id));
    socket.on('new_activity', (activity: any) => {
      setState((prev) => {
        if (prev.timeline.some((t) => t.id === activity.id)) return prev;
        return {
          ...prev,
          timeline: [
            ...prev.timeline,
            {
              id: activity.id,
              type: (activity.type || 'comment') as ReportTimelineEvent['type'],
              author: activity.author || 'Admin',
              authorAvatar: activity.authorAvatar,
              role: (activity.role || 'Admin') as ReportTimelineEvent['role'],
              content: activity.content,
              attachments: activity.attachments || [],
              timestamp: activity.timestamp,
              metadata: activity.metadata || {},
            },
          ],
        };
      });
    });
    socket.on('report_updated', (payload: any) => {
      setState((prev) => ({
        ...prev,
        severity: {
          ...prev.severity,
          final: payload.cvssScore ?? prev.severity.final,
          vector: payload.cvssVector ?? prev.severity.vector,
          level: payload.severity ?? prev.severity.level,
        },
      }));
    });
    socket.on('status_updated', (payload: any) => setState((prev) => ({ ...prev, status: payload.status || prev.status })));
    return () => {
      socket.emit('leave_report', id);
      socket.disconnect();
    };
  }, [id]);

  const postComment = async () => {
    if (!editorContent.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editorContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to post comment');
      setEditorContent('');
      toast({ title: 'Comment posted', description: 'Admin comment added to report thread.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to post comment', variant: 'destructive' });
    }
  };

  const changeStatus = async (status: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      setState((prev) => ({ ...prev, status }));
      setReport(data.data.report);
      toast({ title: 'Status updated', description: `Changed to ${status}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    }
  };

  const changeSeverity = async (vector: string, score: number) => {
    const severity = score >= 9 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports/${id}/severity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cvssVector: vector, cvssScore: score, severity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update severity');
      setReport(data.data.report);
      setState((prev) => ({ ...prev, severity: { final: score, vector, level: severity } }));
      toast({ title: 'Severity updated', description: `${severity} (${score.toFixed(1)})` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update severity', variant: 'destructive' });
    }
  };

  const startFieldEdit = (field: string, value: any) => {
    setEditingField(field);
    setFieldDraft(value ?? '');
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    setFieldDraft('');
  };

  const saveFieldEdit = async () => {
    if (!editingField) return;
    setIsSavingField(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [editingField]: fieldDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to update ${editingField}`);
      setReport(data.data.report);
      cancelFieldEdit();
      toast({ title: 'Updated', description: `${editingField} updated successfully.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save field', variant: 'destructive' });
    } finally {
      setIsSavingField(false);
    }
  };

  if (loading || !report) return <div className="p-10 text-center">Loading Report Details...</div>;

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col pt-4">
      <div className="px-6 pb-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" className="pl-0 text-zinc-500 hover:text-black dark:hover:text-white" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> BACK
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-zinc-400">REPORT ID:</span>
          <span className="font-mono font-bold text-lg text-black dark:text-white">{report._id}</span>
        </div>
      </div>

      <div className="lg:hidden flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shrink-0">
        <button
          onClick={() => setMobileTab('details')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${mobileTab === 'details' ? 'border-b-2 border-black dark:border-white' : 'text-zinc-500'}`}
        >
          Details
        </button>
        <button
          onClick={() => setMobileTab('activity')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${mobileTab === 'activity' ? 'border-b-2 border-black dark:border-white' : 'text-zinc-500'}`}
        >
          Activity
        </button>
        <button
          onClick={() => setMobileTab('tools')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${mobileTab === 'tools' ? 'border-b-2 border-black dark:border-white' : 'text-zinc-500'}`}
        >
          Tools
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
          <ScrollArea className={`lg:col-span-8 h-full border-r border-zinc-200 dark:border-zinc-800 ${mobileTab === 'tools' ? 'hidden lg:block' : ''}`}>
            <div className="p-8 max-w-4xl mx-auto space-y-10 pb-28">
              <div className={`${mobileTab === 'activity' ? 'hidden lg:block' : ''}`}>
                <h1 className="text-3xl font-bold text-black dark:text-white leading-tight">{report.title}</h1>
                <div className="flex gap-3 mt-3 flex-wrap items-center">
                  <Badge variant="secondary">{report.vulnerabilityCategory || 'Vulnerability'}</Badge>
                  <Badge variant="outline">{state.status}</Badge>
                </div>
                <div className="prose prose-zinc dark:prose-invert max-w-none mt-8">
                  <h2>Description</h2>
                  <div dangerouslySetInnerHTML={{ __html: report.description || '-' }} />
                  {report.impact && (
                    <>
                      <h2 className="mt-8">Impact</h2>
                      <div dangerouslySetInnerHTML={{ __html: report.impact }} />
                    </>
                  )}
                  {report.pocSteps && (
                    <>
                      <h2 className="mt-8">Proof of Concept</h2>
                      <div
                        className="font-mono text-sm p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
                        dangerouslySetInnerHTML={{ __html: report.pocSteps }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className={`${mobileTab === 'details' ? 'hidden lg:block' : ''}`}>
                <h3 className="text-lg font-bold text-black dark:text-white mb-6">Activity</h3>
                <div className="pl-2">
                  {state.timeline.map((event, index) => {
                    const isConsecutive =
                      index > 0 && state.timeline[index - 1].author === event.author;
                    return (
                      <ReportTimelineNode
                        key={event.id}
                        event={event}
                        isConsecutive={isConsecutive}
                        onPreviewMedia={setPreviewMedia}
                        researcherProfileLinks={false}
                      />
                    );
                  })}
                </div>

                <div className="mt-8 flex gap-4 pl-2">
                  <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 mt-2 overflow-hidden">
                    {composerAvatar()}
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="rounded-lg bg-white dark:bg-zinc-950 shadow-sm border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white transition-all overflow-hidden">
                      <CyberpunkEditor content={editorContent} onChange={setEditorContent} placeholder="Reply as admin..." />
                      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-end items-center gap-2 flex-wrap">
                        <Select value={state.status} onValueChange={changeStatus}>
                          <SelectTrigger className="h-8 w-[200px] text-xs bg-white dark:bg-black border-zinc-300 dark:border-zinc-700">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs"
                          onClick={postComment}
                        >
                          <Send className="h-4 w-4 mr-2" /> Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className={`lg:col-span-4 h-full overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/20 p-6 space-y-6 ${mobileTab !== 'tools' ? 'hidden lg:block' : ''}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-zinc-500">Current Status</span>
                <Badge variant="outline" className="bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 text-black dark:text-white px-3 py-1">
                  {state.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-zinc-500">Severity</h4>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-indigo-600" onClick={() => setCvssModalOpen(true)}>
                  <Calculator className="h-3 w-3 mr-1" /> Calculator
                </Button>
              </div>
              <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer" onClick={() => setCvssModalOpen(true)}>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold">{state.severity.final.toFixed(1)}</span>
                  <span className="text-sm font-bold">{(state.severity.level || '').toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded">{state.severity.vector || '-'}</div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-bold uppercase text-zinc-500">Report Details</h4>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs uppercase font-semibold">Title</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => startFieldEdit('title', report.title)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </div>
                <p className="text-sm">{report.title || '-'}</p>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs uppercase font-semibold">Vulnerability Category</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => startFieldEdit('vulnerabilityCategory', report.vulnerabilityCategory)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </div>
                <p className="text-sm">{report.vulnerabilityCategory || '-'}</p>
              </div>

              {['description', 'impact', 'pocSteps'].map((field) => (
                <div key={field} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs uppercase font-semibold">{field === 'pocSteps' ? 'Proof of Concept' : field}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => startFieldEdit(field, (report as any)[field])}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: (report as any)[field] || '-' }} />
                </div>
              ))}

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-2">
                <span className="text-zinc-500 text-xs uppercase font-semibold">Bounty</span>
                <p className="text-sm">{report.bounty ? `PKR ${Number(report.bounty).toLocaleString()}` : '-'}</p>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">Researcher</span>
                <span>{report.researcherId?.username || report.researcherId?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Triager</span>
                <span>{report.triagerId?.username || report.triagerId?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Submitted</span>
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current State</span>
                <span className="flex items-center gap-1">
                  {state.status === 'Resolved' || state.status === 'Paid' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : state.status === 'Closed' ? (
                    <XCircle className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-500" />
                  )}
                  {state.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={!!editingField}
        onOpenChange={(open) => {
          if (!open) cancelFieldEdit();
        }}
      >
        <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {fieldModalTitle(editingField)}</DialogTitle>
            <DialogDescription>Make changes and save to update this report.</DialogDescription>
          </DialogHeader>
          <div className="min-h-[200px] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <CyberpunkEditor
              content={typeof fieldDraft === 'string' ? fieldDraft : ''}
              onChange={setFieldDraft}
              placeholder={`Edit ${fieldModalTitle(editingField)}...`}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelFieldEdit}>
              Cancel
            </Button>
            <Button onClick={saveFieldEdit} disabled={isSavingField}>
              {isSavingField ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewMedia} onOpenChange={(open) => !open && setPreviewMedia(null)}>
        <DialogContent className="max-w-5xl w-full p-1 bg-transparent border-none shadow-none text-white h-[90vh]">
          <DialogHeader className="absolute top-4 right-4 z-50">
            <DialogTitle className="sr-only">Attachment Preview</DialogTitle>
          </DialogHeader>
          {previewMedia && (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90 rounded-lg overflow-hidden backdrop-blur-xl border border-white/10 ring-1 ring-white/5">
              {previewMedia.type === 'video' ? (
                <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-full object-contain w-full h-full rounded-md shadow-2xl" />
              ) : previewMedia.type === 'pdf' ? (
                <iframe src={`${previewMedia.url}#view=FitH`} className="w-full h-full rounded-md shadow-2xl bg-white" title="PDF Preview" />
              ) : (
                <img src={previewMedia.url} alt="Attachment Preview" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CvssInteractiveModal
        isOpen={cvssModalOpen}
        onClose={() => setCvssModalOpen(false)}
        aiVector={state.severity.vector || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N'}
        researcherVector={state.severity.vector || ''}
        researcherSeverity={state.severity.level}
        currentVector={state.severity.vector || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N'}
        onSave={changeSeverity}
      />
    </div>
  );
}
