import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io as socketIO } from 'socket.io-client';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, Users, Link as LinkIcon, ExternalLink, ChevronRight, MessageSquare, History, Shield, AlertTriangle, UploadCloud, Activity, FileText, Image as ImageIcon, FileVideo, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { GlassCard } from '@/components/ui/glass-card';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { API_URL } from '@/config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
const Timeline = ({ currentStep }: { currentStep: number }) => {
  const steps = ['Submitted', 'Triaging', 'Triaged', 'Paid', 'Resolved']; // Updated to match backend roughly

  return (
    <div className="flex items-center w-full mb-12 relative px-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center relative z-10 group cursor-default">
              
              {/* Dot */}
              <div 
                className={cn(
                  "w-4 h-4 rounded-full transition-all duration-300 border-2",
                  isCompleted 
                    ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white shadow-[0_0_10px_rgba(0,0,0,0.2)] dark:shadow-[0_0_10px_rgba(255,255,255,0.2)] scale-100" 
                    : isActive 
                        ? "bg-white dark:bg-black border-zinc-900 dark:border-white shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-125" 
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                )} 
              >
                  {isCompleted && (
                      <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white dark:bg-black rounded-full opacity-50" />
                      </div>
                  )}
              </div>

              {/* Label */}
              <span 
                className={cn(
                  "absolute top-8 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors",
                  isCompleted ? "text-zinc-600 dark:text-zinc-400 font-medium" :
                  isActive ? "text-zinc-900 dark:text-white font-bold scale-110 origin-top" :
                  "text-zinc-400 dark:text-zinc-600"
                )}
              >
                {step}
              </span>
            </div>
            
            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 h-[2px] rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 relative">
                  <div 
                    className={cn(
                        "absolute inset-0 bg-zinc-900 dark:bg-white transition-transform duration-700 ease-out origin-left",
                        index < currentStep ? "scale-x-100" : "scale-x-0"
                    )} 
                  />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [commentContent, setCommentContent] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReport = async () => {
    try {
        const res = await fetch(`${API_URL}/reports/${id}`);
        const data = await res.json();
        if (res.ok) {
            setReport(data.data);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  // Real-time socket — receive live updates from triager/company actions
  useEffect(() => {
    if (!id) return;
    const socketUrl = (import.meta.env.VITE_API_URL || '/').replace(/\/api\/?$/, '');
    const socket = socketIO(socketUrl, { withCredentials: true });
    socket.on('connect', () => socket.emit('join_report', id));

    socket.on('new_activity', (activity: any) => {
      setReport((prev: any) => {
        if (!prev) return prev;
        const alreadyExists = (prev.comments || []).some((c: any) => String(c._id) === String(activity.id));
        if (alreadyExists) return prev;
        return {
          ...prev,
          comments: [
            ...(prev.comments || []),
            {
              _id: activity.id,
              content: activity.content,
              type: activity.type,
              createdAt: activity.timestamp,
              attachments: activity.attachments,
              sender: { 
                 name: activity.authorName || activity.author, 
                 username: activity.authorUsername || activity.author,
                 role: activity.role?.toLowerCase() || 'triager', 
                 avatar: activity.authorAvatar 
              },
              metadata: activity.metadata,
            },
          ],
        };
      });
    });

    socket.on('report_updated', (data: any) => {
      setReport((prev: any) => {
        if (!prev) return prev;
        return { ...prev, severity: data.severity ?? prev.severity, cvssScore: data.cvssScore ?? prev.cvssScore, cvssVector: data.cvssVector ?? prev.cvssVector };
      });
    });

    socket.on('status_updated', (data: any) => {
      if (data.status) setReport((prev: any) => prev ? { ...prev, status: data.status } : prev);
    });

    return () => {
      socket.emit('leave_report', id);
      socket.disconnect();
    };
  }, [id]);

  const handlePostComment = async () => {
      const content = commentContent.trim();
      if (!content) return;

      setIsSubmitting(true);

      // Build FormData
      const formData = new FormData();
      formData.append('content', content);
      selectedFiles.forEach((file) => {
          formData.append('files', file);
      });

      try {
          const res = await fetch(`${API_URL}/reports/${id}/comments`, {
              method: 'POST',
              headers: { 
                  Authorization: `Bearer ${localStorage.getItem('token')}` 
              },
              body: formData
          });
          
          if (!res.ok) {
              const errorData = await res.json().catch(() => ({})); // Handle non-JSON response
              throw new Error(errorData.message || 'Failed to post comment check console');
          }
          
          // Clear form on success natively
          setCommentContent('');
          setSelectedFiles([]);
          
          // Re-fetch to ensure data consistency (IDs, real user details)
          fetchReport();
          toast({ title: 'Comment posted successfully' });
      } catch (err: any) {
          console.error('Post comment error:', err);
          toast({ 
              title: 'Failed to post comment', 
              description: err.message,
              variant: 'destructive' 
          });
      } finally {
          setIsSubmitting(false);
      }
  };

  if (loading || !report) {
      return <div className="p-10 text-center">Loading report...</div>;
  }

  // Calculate status step
  const statusMap: Record<string, number> = { 'Submitted': 0, 'Triaging': 1, 'Triaged': 2, 'Pending_Fix': 2, 'Resolved': 4, 'Paid': 3 };
  const currentStep = statusMap[report.status] || 0;

  // Participants logic
  const participants = [
      { name: report.researcherId?.name || 'Researcher', role: 'Author', avatarUrl: report.researcherId?.avatar, fallbackClass: 'bg-blue-500' },
      // Add unique commenters
      ...Array.from(new Set(report.comments?.map((c: any) => c.sender?._id))).map(id => {
          const c = report.comments.find((x: any) => x.sender?._id === id);
          if (c?.sender?._id === report.researcherId?._id) return null; // Skip author
          return { name: c?.sender?.name || 'User', role: c?.sender?.role || 'Participant', avatarUrl: c?.sender?.avatar, fallbackClass: 'bg-green-500' };
      }).filter(Boolean)
  ];

  return (
    <div className="min-h-screen bg-transparent text-zinc-900 dark:text-zinc-100 p-8 pt-6 font-sans selection:bg-emerald-500/20 transition-colors duration-300">
      
      {/* 1. Header & Timeline */}
      <div className="mb-12">
        <div className="flex flex-col gap-2 mb-8">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3" /> Bug Bounty Report
            </span>
            <div className="flex items-center gap-4">
                 <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{report.title}</h1>
                 <Badge variant="outline" className="font-mono">{report.status}</Badge>
            </div>
        </div>
        <Timeline currentStep={currentStep} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
        
        {/* --- LEFT COLUMN (Content) --- */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Content (Frameless) */}
          <div className="space-y-8">
            
            {/* Section 1: Target */}
            <div className="flex items-center gap-4 pb-8 border-b border-zinc-200 dark:border-zinc-800">
                <Avatar className="w-12 h-12 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-sm">
                    <AvatarImage src={report.programId?.companyId?.avatar} alt={report.target || report.assets?.[0]} className="object-cover" />
                    <AvatarFallback className="text-sm font-bold text-zinc-700 dark:text-white uppercase">
                        {((report.target || report.assets?.[0]) || 'Unknown').charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div>
                     <h3 className="text-zinc-500 dark:text-zinc-400 font-mono text-xs mb-1 uppercase tracking-wider">Target</h3>
                    <span className="text-xl font-bold text-zinc-900 dark:text-white">
                        {report.assets?.[0] && !report.assets[0].includes('cloudinary.com') ? report.assets[0] : 'Unknown Target'}
                    </span>
                </div>
            </div>

            {/* Section 2: Vulnerability Details */}
            <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Vulnerability Details</h2>
                <div className="prose prose-sm md:prose-base prose-zinc dark:prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-zinc-800 prose-pre:shadow-sm prose-pre:rounded-lg prose-code:text-zinc-800 dark:prose-code:text-emerald-400 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_pre_code]:text-zinc-300 dark:[&_pre_code]:text-zinc-300 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                        {report.description || '*No description provided.*'}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Section 3: Steps to Reproduce & PoC */}
            <div className="pt-4">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Steps to Reproduce & PoC</h2>
                <div className="prose prose-sm md:prose-base prose-zinc dark:prose-invert max-w-none bg-white dark:bg-zinc-900/40 p-6 md:p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-zinc-800 prose-pre:shadow-md prose-pre:rounded-lg prose-code:text-zinc-800 dark:prose-code:text-emerald-400 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_pre_code]:text-zinc-300 dark:[&_pre_code]:text-zinc-300 [&_pre_code]:bg-transparent [&_pre_code]:p-0 leading-relaxed">
                     <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                        {report.pocSteps || '*No steps provided.*'}
                     </ReactMarkdown>
                </div>
            </div>

            {/* Section 3.5: Impact Assessment */}
            {report.impact && (
                <div className="pt-4">
                    <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rotate-45 transform translate-x-16 -translate-y-16 pointer-events-none" />
                        <h4 className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-sm uppercase tracking-widest mb-4 font-bold relative z-10">
                            <AlertTriangle className="w-4 h-4" /> Impact Assessment
                        </h4>
                        <div className="prose prose-sm md:prose-base prose-zinc dark:prose-invert prose-p:text-zinc-800 dark:prose-p:text-rose-100/80 max-w-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-rose-900/30 prose-code:text-rose-600 dark:prose-code:text-rose-400 prose-code:bg-rose-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none [&_pre_code]:text-zinc-300 dark:[&_pre_code]:text-zinc-300 [&_pre_code]:bg-transparent [&_pre_code]:p-0 leading-relaxed relative z-10">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                                {report.impact}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {/* Section 3.5: Attachments */}
            {(() => {
                const cloudinaryUrls = report.assets?.filter((url: string) => url.includes('cloudinary.com')) || [];
                if (cloudinaryUrls.length === 0) return null;

                return (
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Attachments (PoC)</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {cloudinaryUrls.map((url: string, index: number) => {
                                const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
                                const isPdf = url.includes('/raw/') || /\.pdf$/i.test(url);

                                return (
                                    <div key={index} className="group relative aspect-video bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                                        {isVideo ? (
                                            <div 
                                                className="w-full h-full cursor-pointer relative group/video block"
                                                onClick={() => setPreviewMedia({ url, type: 'video' })}
                                            >
                                                <video src={url} className="w-full h-full object-contain bg-black pointer-events-none" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/video:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[12px] border-l-white border-b-8 border-b-transparent ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isPdf ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 w-full h-full justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <FileText className="w-8 h-8 text-rose-500" />
                                                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">View PDF</span>
                                            </a>
                                        ) : (
                                            <div 
                                                className="w-full h-full block cursor-pointer"
                                                onClick={() => setPreviewMedia({ url, type: 'image' })}
                                            >
                                                <img src={url} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
          </div>

          {/* Section 4: Activity / Comments System */}
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold font-mono mb-8 text-zinc-900 dark:text-white">Activity</h2>

            <div className="relative pl-12 space-y-12">
                {/* Global line removed, using segments per item */}
                
                 {/* Initial Submission Event */}
                 <div className="relative group">
                         {/* Line Segment */}
                         <div className="absolute -left-[25px] top-0 -bottom-12 w-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10" />

                     {/* Timeline Dot */}
                     <div className="absolute -left-[44px] top-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center border-4 border-white dark:border-zinc-950 z-10 overflow-hidden">
                         {report.researcherId?.avatar ? (
                             <img src={report.researcherId.avatar} alt="Researcher Avatar" className="w-full h-full object-cover" />
                         ) : (
                             <span className="font-bold text-xs">{(report.researcherId?.name || 'U').charAt(0).toUpperCase()}</span>
                         )}
                     </div>

                     <div className="flex flex-col gap-2">
                         <div className="flex items-baseline gap-2">
                             <div className="flex items-center gap-2">
                                 <HoverCard>
                                     <HoverCardTrigger asChild>
                                         <a href={`/h/${report.researcherId?.username || report.researcherId?.name}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                             @{report.researcherId?.username || report.researcherId?.name || 'Unknown Researcher'}
                                         </a>
                                     </HoverCardTrigger>
                                     <HoverCardContent className="w-80 font-inter">
                                         <div className="flex justify-between space-x-4">
                                             <Avatar>
                                                 <AvatarImage src={report.researcherId?.avatar} />
                                                 <AvatarFallback>{(report.researcherId?.name || 'U').charAt(0)}</AvatarFallback>
                                             </Avatar>
                                             <div className="space-y-1 flex-1">
                                                 <h4 className="text-sm font-semibold">@{report.researcherId?.username || report.researcherId?.name}</h4>
                                                 <p className="text-sm text-muted-foreground">
                                                     Security Researcher
                                                 </p>
                                             </div>
                                         </div>
                                     </HoverCardContent>
                                 </HoverCard>
                                 <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">Security Researcher</Badge>
                             </div>
                             <span className="text-xs text-zinc-500">{format(new Date(report.createdAt), 'MMM d, HH:mm')}</span>
                         </div>
                         <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full font-inter leading-relaxed">
                             Hi, I found a vulnerability in <span className="font-bold">{(report.assets?.[0] || 'the program')}</span>. Please verify.
                         </div>
                     </div>
                 </div>


                 {/* Comments */}
                 {report.comments?.map((comment: any, idx: number) => {
                     // Check if previous comment is same author
                     let isConsecutive = false;
                     if (idx === 0) {
                         // Compare first comment with the initial submission author
                         isConsecutive = comment.sender?.username === report.researcherId?.username;
                     } else {
                         isConsecutive = report.comments[idx - 1].sender?.username === comment.sender?.username && report.comments[idx - 1].sender?.name === comment.sender?.name;
                     }

                     return (
                     <div key={idx} className="relative group pl-12 -ml-12 mt-4 pt-2">
                         {/* Line Segment */}
                         <div className="absolute left-[23px] top-0 -bottom-12 w-0.5 bg-zinc-200 dark:bg-zinc-800 z-0" />

                         {!isConsecutive ? (
                             <div className={cn(
                                 "absolute left-[4px] top-2 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-950 z-10",
                                 !comment.sender?.avatar && "bg-blue-600 text-white dark:bg-blue-600 dark:text-white"
                             )}>
                                  {comment.sender?.avatar ? (
                                    <img 
                                        src={comment.sender.avatar} 
                                        alt={comment.sender.name} 
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                 ) : (
                                    <span className="font-bold text-xs">{comment.sender?.name?.charAt(0) || '?'}</span>
                                 )}
                             </div>
                         ) : (
                             <div className="absolute left-[18px] top-6 w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-background z-10" />
                         )}

                         <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 flex-wrap">
                                 {comment.sender?.role !== 'company' ? (
                                    <div className="flex items-center gap-2">
                                        <HoverCard>
                                            <HoverCardTrigger asChild>
                                                <a href={`/h/${comment.sender?.username || comment.sender?.name}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                                    @{comment.sender?.username || comment.sender?.name || 'Unknown User'}
                                                </a>
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-80 font-inter">
                                                <div className="flex justify-between space-x-4">
                                                    <Avatar>
                                                        <AvatarImage src={comment.sender?.avatar} />
                                                        <AvatarFallback>{comment.sender?.name?.charAt(0) || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="space-y-1 flex-1">
                                                        <h4 className="text-sm font-semibold">@{comment.sender?.username || comment.sender?.name}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Security Researcher
                                                        </p>
                                                    </div>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">Security Researcher</Badge>
                                    </div>
                                 ) : (
                                     <div className="flex items-center gap-2">
                                         <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            {comment.sender?.name}
                                         </span>
                                         <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">
                                             Company
                                         </Badge>
                                     </div>
                                 )}
                                 {comment.type === 'status_change' && (
                                     <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                                          changed the status to {comment.metadata?.newStatus?.toLowerCase() || comment.content.replace('Changed status to ', '').replace('System changed status to ', '').split('.')[0].toLowerCase()}
                                     </span>
                                 )}
                                 {comment.type === 'bounty_awarded' && (
                                     <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                                          awarded a PKR {comment.metadata?.bountyAwarded?.toLocaleString() || comment.content.match(/\$(\d+)/)?.[1] || 0} bounty.
                                     </span>
                                 )}
                                 <span className="text-zinc-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {new Date(comment.createdAt).toLocaleString(undefined, {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                                    })}
                                 </span>
                             </div>
                             {comment.type === 'status_change' ? (
                                <div className="mt-1 flex flex-col items-start w-full gap-2">
                                    {comment.metadata?.reason && (
                                        <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                                            <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                                <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{comment.metadata.reason}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             ) : comment.type === 'bounty_awarded' ? (
                                <div className="mt-1 flex flex-col items-start w-full gap-2">
                                    {comment.content && (
                                        <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                                            <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                                <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             ) : comment.type === 'severity_update' ? (
                                <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    <span>updated severity —</span>
                                    <span className="font-bold" dangerouslySetInnerHTML={{ __html: comment.content }} />
                                </div>
                             ) : (
                                <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full font-inter leading-relaxed">
                                     <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none focus:outline-none break-words prose-p:m-0 prose-ul:m-0 prose-ol:m-0 [&>*:not(:last-child)]:mb-2" dangerouslySetInnerHTML={{ __html: comment.content }} />
                                    {comment.attachments && comment.attachments.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {comment.attachments.map((url: string, fileIdx: number) => {
                                                const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
                                                const isPdf = url.includes('/raw/') || /\.pdf$/i.test(url);
                                                
                                                return (
                                                    <div key={fileIdx} className="group/att relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                                                         {isVideo ? (
                                                            <div 
                                                                className="w-full h-full cursor-pointer relative block"
                                                                onClick={() => setPreviewMedia({ url, type: 'video' })}
                                                            >
                                                                <video src={url} className="w-full h-full object-cover bg-black pointer-events-none" />
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : isPdf ? (
                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 p-2 w-full h-full justify-center hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                                                <FileText className="w-6 h-6 text-rose-500" />
                                                                <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">PDF</span>
                                                            </a>
                                                        ) : (
                                                            <div 
                                                                className="w-full h-full block cursor-pointer"
                                                                onClick={() => setPreviewMedia({ url, type: 'image' })}
                                                            >
                                                                <img src={url} alt="Attachment" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                             )}
                         </div>
                     </div>
                 )})}

                 {/* Editor (Fixed Activity Item) */}
                 <div className="relative">
                    {/* NO Line Segment for Editor (Last Item) */}
                    <div className="absolute -left-[44px] top-0 w-10 h-10 rounded-full bg-black text-white dark:bg-zinc-800 dark:text-white flex items-center justify-center border-4 border-white dark:border-zinc-950 z-10 overflow-hidden">
                         {report.researcherId?.avatar ? (
                             <img src={report.researcherId.avatar} alt="My Avatar" className="w-full h-full object-cover" />
                         ) : (
                             <span className="font-bold text-xs">ME</span>
                         )}
                     </div>
                                        <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-white transition-all">
                        <div className="min-h-[100px] bg-white dark:bg-black">
                             <CyberpunkEditor 
                                content={commentContent} 
                                onChange={setCommentContent} 
                                placeholder="" 
                            />
                        </div>
                        
                        {/* Selected Files Preview */}
                        {selectedFiles.length > 0 && (
                            <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex flex-wrap gap-2">
                                {selectedFiles.map((file, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-md px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 shadow-sm">
                                        <span className="truncate max-w-[120px] font-mono">{file.name}</span>
                                        <button 
                                            onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                            className="text-zinc-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-between p-2 lg:px-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 gap-2">
                             {/* Hidden File Input */}
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                accept=".png,.jpg,.jpeg,.pdf,video/mp4,video/webm"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const newFiles = Array.from(e.target.files);
                                        const validFiles = newFiles.filter(file => {
                                            if (file.size > 5 * 1024 * 1024) {
                                                toast({
                                                    title: "File too large",
                                                    description: `${file.name} exceeds the 5MB limit.`,
                                                    variant: "destructive"
                                                });
                                                return false;
                                            }
                                            return true;
                                        });
                                        // Allow max 5 files total (prevent overloading)
                                        if (selectedFiles.length + validFiles.length > 5) {
                                            toast({
                                                title: "Too many files",
                                                description: "You can only attach up to 5 files per comment.",
                                                variant: "destructive"
                                            });
                                            return;
                                        }
                                        setSelectedFiles(prev => [...prev, ...validFiles]);
                                    }
                                    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input to allow selecting same file again
                                }}
                             />
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white h-8 text-xs font-normal w-full sm:w-auto justify-start"
                                onClick={() => fileInputRef.current?.click()}
                             >
                                <UploadCloud className="w-4 h-4 mr-2" />
                                Click to upload files PNG, JPG, PDF (Max 5MB)
                             </Button>

                             <Button 
                                onClick={handlePostComment}
                                size="sm"
                                disabled={(!commentContent.trim() && selectedFiles.length === 0) || isSubmitting}
                                className="h-8 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-bold px-4 rounded-full w-full sm:w-auto min-w-[100px]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-white dark:border-zinc-300 dark:border-t-black animate-spin" />
                                        Posting...
                                    </span>
                                ) : (
                                    'Comment'
                                )}
                            </Button>
                        </div>
                    </div>
                 </div>

            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN (Sidebar) --- */}
        <div className="space-y-6">
            
            {/* Card 1: Details Table */}
            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg backdrop-blur-sm overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold">Details</h3>
                </div>
                <div className="p-4 space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Program</span>
                        {report.programId ? (
                             <Dialog>
                                 <DialogTrigger asChild>
                                     <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                         {report.programId.title}
                                     </button>
                                 </DialogTrigger>
                                 <DialogContent className="max-w-2xl w-full">
                                     <DialogHeader className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
                                         <div className="flex items-center gap-3">
                                             <div className="w-12 h-12 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                                 {report.programId.companyId?.avatar ? (
                                                     <img src={report.programId.companyId.avatar} alt="Company" className="w-full h-full object-cover" />
                                                 ) : (
                                                     <span className="font-bold text-xl text-zinc-400">{(report.programId.companyName || report.programId.title || '?')[0]}</span>
                                                 )}
                                             </div>
                                             <div>
                                                 <DialogTitle className="text-xl">{report.programId.title}</DialogTitle>
                                                 {report.programId.companyName && <p className="text-sm text-zinc-500">{report.programId.companyName}</p>}
                                             </div>
                                         </div>
                                     </DialogHeader>

                                     <div className="overflow-y-auto max-h-[65vh] pr-1 space-y-5 pt-3">
                                         <div className="flex gap-2 flex-wrap">
                                             {report.programId.type && (
                                                 <span className="text-xs font-bold uppercase px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                                                     {report.programId.type}
                                                 </span>
                                             )}
                                             {report.programId.bountyRange && (
                                                 <span className="text-xs font-bold px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                                                     {report.programId.bountyRange?.replace(/\$/g, 'PKR ')}
                                                 </span>
                                             )}
                                         </div>

                                         {report.programId.description && (
                                             <div>
                                                 <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">About This Program</h3>
                                                 <div
                                                     className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm prose-zinc dark:prose-invert max-w-none"
                                                     dangerouslySetInnerHTML={{ __html: report.programId.description }}
                                                 />
                                             </div>
                                         )}

                                         {report.programId.rewards && (
                                             <div>
                                                 <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">Bounty Rewards</h3>
                                                 <div className="grid grid-cols-4 gap-2">
                                                     {(['critical','high','medium','low'] as const).map(sev => {
                                                         const r = report.programId.rewards?.[sev];
                                                         return (
                                                             <div key={sev} className="rounded border border-zinc-200 dark:border-zinc-700 p-2.5 text-center bg-zinc-50 dark:bg-zinc-900">
                                                                 <p className="text-[10px] font-bold uppercase mb-1 text-zinc-500 dark:text-zinc-400">{sev}</p>
                                                                 {r?.min || r?.max ? (
                                                                     <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white">${(r.min||0).toLocaleString()} – ${(r.max||0).toLocaleString()}</p>
                                                                 ) : <p className="text-xs text-zinc-400">N/A</p>}
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             </div>
                                         )}

                                         {report.programId.rulesOfEngagement && (
                                             <div>
                                                 <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">Rules of Engagement</h3>
                                                 <div
                                                     className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm prose-zinc dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
                                                     dangerouslySetInnerHTML={{ __html: report.programId.rulesOfEngagement }}
                                                 />
                                             </div>
                                         )}

                                         {report.programId.safeHarbor && (
                                             <div>
                                                 <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">Safe Harbor</h3>
                                                 <div
                                                     className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm prose-zinc dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
                                                     dangerouslySetInnerHTML={{ __html: report.programId.safeHarbor }}
                                                 />
                                             </div>
                                         )}
                                     </div>
                                 </DialogContent>
                             </Dialog>
                        ) : (
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">Unknown</span>
                        )}
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Report ID</span>
                        <span className="text-sm font-mono text-zinc-900 dark:text-white">{report._id.substring(report._id.length - 6)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Created</span>
                        <span className="text-sm font-mono text-zinc-900 dark:text-white">{format(new Date(report.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Severity</span>
                        <span className="text-sm font-bold text-pink-600 dark:text-pink-500">{report.severity}</span>
                     </div>
                     <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                        <span className="text-xs text-zinc-500 block mb-1">Vulnerability Category</span>
                        <span className="text-sm text-zinc-900 dark:text-white font-medium block truncate" title={report.vulnerabilityCategory}>
                            {report.vulnerabilityCategory || 'N/A'}
                        </span>
                     </div>
                </div>
            </div>

            {/* Card 2: Participants */}
            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg backdrop-blur-sm p-4 shadow-sm">
                 <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold mb-4">
                    Participants ({participants.length})
                 </h3>
                 <div className="space-y-3">
                    {participants.map((p: any, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-zinc-200 dark:border-zinc-800 bg-white">
                                <AvatarImage src={p.avatarUrl} alt={p.name} className="object-cover" />
                                <AvatarFallback className={cn("text-[10px] text-white font-bold", p.fallbackClass)}>
                                    {p.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-sm text-zinc-900 dark:text-zinc-300 font-medium leading-none">{p.name}</span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-mono mt-0.5">{p.role}</span>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>

            {/* Card 3: Need Help */}
            <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-4 text-center">
                <p className="text-xs text-emerald-700 dark:text-emerald-200/70 mb-2">Need help with this report?</p>
                <a href="#" className="text-sm font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 hover:underline">
                    Contact Support
                </a>
            </div>

        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewMedia && createPortal(
          <div 
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 md:p-12 animate-in fade-in duration-200"
              onClick={() => setPreviewMedia(null)}
          >
              <button 
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
                  ) : previewMedia.type === 'video' ? (
                      <video 
                          src={previewMedia.url} 
                          controls
                          autoPlay
                          className="max-w-full max-h-[85vh] rounded-md ring-1 ring-white/20 shadow-2xl bg-black"
                      />
                  ) : null}
              </div>
          </div>,
          document.body
      )}
    </div>
  );
}
