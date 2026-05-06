import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Twitter,
  Linkedin,
  Trophy,
  Target,
  Bug,
  Lock,
  AlertCircle,
  BadgeCheck,
  Github,
  Ban,
  TrendingUp,
  Activity,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { SeverityRadar } from '@/components/public-profile/SeverityRadar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { API_URL } from '@/config';

/** Same minimum as researcher report submission gate (`ResearcherSubmitReport.tsx`). */
const MIN_REPUTATION_TO_SUBMIT = 150;

const SEVERITY_CHART_COLORS: Record<string, string> = {
  Critical: '#e11d48',
  High: '#ea580c',
  Medium: '#ca8a04',
  Low: '#059669',
  None: '#64748b',
};

/** Match server: strip accidental "Title:" prefix in stored titles (public display). */
function displayPublicReportTitle(raw: string): string {
  const t = String(raw || '').trim();
  if (!t) return 'Untitled';
  const stripped = t.replace(/^\s*title\s*:\s*/i, '').trim();
  return stripped || 'Untitled';
}

type SeverityRow = { severity: string; count: number };

interface PublicAchievement {
  title?: string;
  sub?: string;
  date?: string;
  desc?: string;
  icon?: string;
}

interface SeverityPercentileRow {
  band: string;
  severity: string;
  count: number;
  percentile: number | null;
}

interface TargetTypeRow {
  name: string;
  count: number;
}

interface HallOfFameRow {
  label: string;
  reportCount: number;
  reputationPoints?: number;
  companyAvatar?: string;
}

interface PublicAcceptedReportRow {
  title: string;
  severity: string;
  submittedTo: string;
  submittedAt?: string;
}

interface ReportStats {
  submitted: number;
  /** Sum of bounty on reports with status Paid (actual payouts). */
  totalPayouts?: number;
  bountyEarned?: number;
  resolvedOrPaid: number;
  paid: number;
  duplicate: number;
  spam: number;
  na: number;
  active: number;
  resolutionRatePercent: number | null;
  bySeverity: SeverityRow[];
  severityPercentiles?: SeverityPercentileRow[];
  byTargetType?: TargetTypeRow[];
  hallOfFamePrograms?: HallOfFameRow[];
  /** Triaged+ pipeline only; read-only list for public profile. */
  acceptedReports?: PublicAcceptedReportRow[];
}

type PublicProfileMainTab = 'overview' | 'achievements' | 'reports';

interface PublicProfileData {
  isPrivate: boolean;
  nickname: string;
  name?: string;
  avatar?: string;
  coverPhoto?: string;
  hireable?: boolean;
  showPayouts?: boolean;
  country?: string;
  city?: string;
  bio?: string;
  isVerified?: boolean;
  reputationScore?: number;
  profileCompletionScore?: number;
  reportsSubmitted?: number;
  reportStats?: ReportStats;
  linkedAccounts?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt?: string;
  skills?: string[];
  achievements?: PublicAchievement[];
  status?: string;
}

export default function PublicProfile() {
  const params = useParams<{ username: string }>();
  const username = params.username ? decodeURIComponent(params.username) : '';
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<PublicProfileMainTab>('overview');

  useEffect(() => {
    setMainTab('overview');
  }, [username]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setLoading(false);
        setError('Profile not found');
        return;
      }
      try {
        const enc = encodeURIComponent(username);
        const res = await fetch(`${API_URL}/users/p/${enc}`);
        const data = await res.json();

        if (res.ok) {
          setProfile(data.data);
          setError(null);
        } else {
          setError(data.message || 'Profile not found');
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!profile?.nickname) return;
    const title = profile.name
      ? `${profile.name} (@${profile.nickname}) · BugChase`
      : `@${profile.nickname} · BugChase`;
    document.title = title;
    return () => {
      document.title = 'BugChase';
    };
  }, [profile]);

  const getSocialUrl = (url?: string) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const rep = profile?.reputationScore ?? 0;
  const profileCompletion = profile?.profileCompletionScore ?? 0;
  const effectiveForSubmit = Math.max(rep, profileCompletion);
  const submitReadinessPct = Math.min(
    100,
    Math.round((effectiveForSubmit / MIN_REPUTATION_TO_SUBMIT) * 100),
  );

  const stats = profile?.reportStats;
  const publicPayoutTotal = stats?.totalPayouts ?? stats?.bountyEarned ?? 0;
  const showPublicPayouts = profile?.showPayouts === true;

  const achievements = profile?.achievements?.filter((a) => a?.title || a?.desc || a?.sub) ?? [];

  const targetPieData = useMemo(() => {
    const rows = stats?.byTargetType ?? [];
    const palette = ['#10b981', '#0ea5e9', '#a855f7', '#f59e0b', '#64748b', '#e11d48'];
    return rows.map((r, i) => ({
      name: r.name,
      value: r.count,
      color: palette[i % palette.length],
    }));
  }, [stats?.byTargetType]);

  const severityBarData = stats?.bySeverity?.length ? stats.bySeverity : [];
  const hallOfFame = stats?.hallOfFamePrograms ?? [];
  const severityPercentiles = stats?.severityPercentiles ?? [];
  const acceptedReports = stats?.acceptedReports ?? [];

  const locationLine = [profile?.city, profile?.country].filter(Boolean).join(', ');

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full p-4 mb-4">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Profile Not Found</h1>
        <p className="text-zinc-500 text-center max-w-md mb-8">
          The researcher profile you are looking for does not exist or refers to a username that has not been claimed
          yet.
        </p>
        <Button onClick={() => (window.location.href = '/')} className="bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black">
          Back to Home
        </Button>
      </div>
    );
  }

  if (profile.status?.toLowerCase() === 'banned') {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xl">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Ban className="w-10 h-10 text-red-600 dark:text-red-500" />
          </div>

          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">Account Suspended</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
            The user <span className="font-semibold text-zinc-900 dark:text-white">@{profile.nickname}</span> has been
            banned for violating our terms of service.
          </p>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Return to BugChase
          </Button>
        </div>
      </div>
    );
  }

  if (profile.isPrivate) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-100 dark:bg-zinc-900/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-100 dark:bg-zinc-900/20 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xl">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 transform transition-transform hover:rotate-0">
            <Lock className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
          </div>

          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">Private Profile</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
            <span className="font-semibold text-zinc-900 dark:text-white">@{profile.nickname}</span> has decided to keep
            their profile hidden. Only the researcher themself can view these details.
          </p>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Return to BugChase
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans selection:bg-emerald-500/30">
      {/* Cover / Header */}
      <div className="relative h-72 md:h-[26rem] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {profile.coverPhoto ? (
          <img
            src={profile.coverPhoto}
            alt={`${profile.nickname} cover`}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-grid-zinc dark:bg-grid-zinc-dark opacity-[0.05]" />
        )}
        <div className="absolute inset-0 bg-black/15 dark:bg-black/35" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-black to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 md:-mt-24 relative z-10 pb-12 md:pb-16">
        {/* Profile Header Card */}
        <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl p-4 sm:p-5 md:p-6 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden bg-zinc-100">
                  <img
                    src={profile.avatar && profile.avatar !== 'default.jpg' ? profile.avatar : '/default.jpg'}
                    alt={profile.nickname}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="hidden md:flex gap-2">
                {profile.linkedAccounts?.github && (
                  <a href={getSocialUrl(profile.linkedAccounts.github)} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <Github className="w-5 h-5" />
                    </Button>
                  </a>
                )}
                {profile.linkedAccounts?.twitter && (
                  <a href={getSocialUrl(profile.linkedAccounts.twitter)} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-blue-400 transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </Button>
                  </a>
                )}
                {profile.linkedAccounts?.linkedin && (
                  <a href={getSocialUrl(profile.linkedAccounts.linkedin)} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-blue-600 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
                  <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    {profile.name || profile.nickname}
                    {profile.isVerified && (
                      <BadgeCheck className="w-8 h-8 fill-blue-500 text-white drop-shadow-sm shrink-0" />
                    )}
                  </h1>
                </div>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium mb-1.5 flex items-center justify-center md:justify-start gap-2 flex-wrap md:text-xl">
                  @{profile.nickname}
                  {effectiveForSubmit >= MIN_REPUTATION_TO_SUBMIT && (
                    <Badge
                      variant="default"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-xs py-0.5"
                    >
                      CAN SUBMIT
                    </Badge>
                  )}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm uppercase tracking-wider">
                  Bug Bounty Researcher
                </p>
              </div>

              <div className="py-0.5">
                {profile.bio && profile.bio.trim().length > 0 ? (
                  <p className="text-zinc-600 dark:text-zinc-300 max-w-3xl text-base leading-relaxed font-light md:text-lg">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-zinc-600 dark:text-zinc-300 max-w-3xl text-base leading-relaxed font-light md:text-lg">
                    ❤️❤️الحمدلله
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-500 dark:text-zinc-400 md:gap-6">
                {locationLine ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    {locationLine}
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  Joined{' '}
                  {new Date(profile.createdAt || Date.now()).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>

                <div className="flex md:hidden gap-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 items-center">
                  {profile.linkedAccounts?.github && (
                    <a
                      href={getSocialUrl(profile.linkedAccounts.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {profile.linkedAccounts?.twitter && (
                    <a
                      href={getSocialUrl(profile.linkedAccounts.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {profile.linkedAccounts?.linkedin && (
                    <a
                      href={getSocialUrl(profile.linkedAccounts.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 shrink-0" aria-hidden />
                Statistics
              </h3>

              <div className="space-y-6">
                {showPublicPayouts ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/10 p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      <Wallet className="w-4 h-4 shrink-0" />
                      Total payouts
                    </div>
                    <p className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white font-mono tracking-tight">
                      ${publicPayoutTotal.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      Sum of bounties on reports marked paid. The researcher chose to make this public.
                    </p>
                  </div>
                ) : null}

                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm text-zinc-500">Reputation</span>
                  <span className="text-xl font-bold text-zinc-900 dark:text-white font-mono tabular-nums">{rep}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="block text-2xl font-bold text-zinc-900 dark:text-white mb-1">{submitReadinessPct}%</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Submit readiness (max)</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="block text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                      {profile.reportsSubmitted ?? stats?.submitted ?? 0}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Reports</span>
                  </div>
                </div>

                {/* intentionally minimal: severity breakdown shown in Overview charts */}
              </div>
            </div>

            {/* Performance Stats Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Performance stats
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center text-center">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                      {stats?.submitted ?? 0}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Reports submitted</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center text-center">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                      {stats?.resolutionRatePercent != null ? `${stats.resolutionRatePercent}%` : '—'}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Resolution rate</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Priority percentiles</h4>
                  <SeverityRadar rows={severityPercentiles} />
                </div>
              </div>
            </div>

            {profile.skills && profile.skills.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Achievements & activity Tabs */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm h-full">
              <Tabs
                value={mainTab}
                onValueChange={(v) => setMainTab(v as PublicProfileMainTab)}
                className="w-full h-full flex flex-col"
              >
                <div className="mb-6 flex justify-start">
                  <TabsList className="relative grid h-11 w-full max-w-md grid-cols-3 items-center gap-0 rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 rounded-full bg-white shadow-sm ring-1 ring-black/[0.04] transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none dark:bg-zinc-900 dark:ring-white/[0.06]"
                      style={{
                        width: 'calc((100% - 0.5rem) / 3)',
                        transform: `translateX(calc(${mainTab === 'overview' ? 0 : mainTab === 'achievements' ? 1 : 2} * 100%))`,
                      }}
                    />
                    <TabsTrigger
                      value="overview"
                      className="relative z-10 h-9 rounded-full border-0 bg-transparent text-sm font-semibold text-zinc-500 shadow-none transition-colors duration-300 ease-out hover:text-zinc-700 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none dark:text-zinc-400 dark:hover:text-zinc-300 dark:data-[state=active]:text-white"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="achievements"
                      className="relative z-10 h-9 rounded-full border-0 bg-transparent text-sm font-semibold text-zinc-500 shadow-none transition-colors duration-300 ease-out hover:text-zinc-700 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none dark:text-zinc-400 dark:hover:text-zinc-300 dark:data-[state=active]:text-white"
                    >
                      Achievements
                    </TabsTrigger>
                    <TabsTrigger
                      value="reports"
                      className="relative z-10 h-9 rounded-full border-0 bg-transparent text-sm font-semibold text-zinc-500 shadow-none transition-colors duration-300 ease-out hover:text-zinc-700 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none dark:text-zinc-400 dark:hover:text-zinc-300 dark:data-[state=active]:text-white"
                    >
                      Reports
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-8 mt-0 flex-1">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Target Types Chart */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                      <h4 className="font-semibold text-zinc-900 dark:text-white text-sm mb-1">Target focus</h4>
                      <p className="text-xs text-zinc-500 mb-4">
                        Inferred from asset type, endpoint, and scope URL (saved submissions include explicit asset type).
                      </p>
                      {targetPieData.length > 0 ? (
                        <>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={targetPieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={52}
                                  outerRadius={82}
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="transparent"
                                >
                                  {targetPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid rgb(39 39 42)',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
                                    backgroundColor: 'rgb(24 24 27)',
                                    color: '#fafafa',
                                  }}
                                  itemStyle={{ color: '#fafafa' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
                            {targetPieData.map((t) => (
                              <div key={t.name} className="flex items-center gap-2 text-xs">
                                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                                <span className="font-medium text-zinc-600 dark:text-zinc-400">{t.name}</span>
                                <span className="font-mono font-semibold text-zinc-900 dark:text-white">{t.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white/60 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                          No submissions to chart yet
                        </div>
                      )}
                    </div>

                    {/* Severity Chart */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                      <h4 className="font-semibold text-zinc-900 dark:text-white text-sm mb-1">Submissions by severity</h4>
                      <p className="text-xs text-zinc-500 mb-4">Raw counts from this researcher&apos;s BugChase reports.</p>
                      {severityBarData.length > 0 ? (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={severityBarData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                className="stroke-zinc-200 dark:stroke-zinc-800"
                                opacity={0.6}
                              />
                              <XAxis
                                dataKey="severity"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                className="text-zinc-500"
                                dy={8}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                className="text-zinc-500"
                                allowDecimals={false}
                              />
                              <RechartsTooltip
                                cursor={{ fill: 'rgb(24 24 27 / 0.06)' }}
                                contentStyle={{
                                  borderRadius: '12px',
                                  border: '1px solid rgb(39 39 42)',
                                  backgroundColor: 'rgb(24 24 27)',
                                  color: '#fafafa',
                                }}
                                itemStyle={{ color: '#fafafa' }}
                              />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={44}>
                                {severityBarData.map((entry, index) => (
                                  <Cell
                                    key={`sev-${entry.severity}-${index}`}
                                    fill={SEVERITY_CHART_COLORS[entry.severity] ?? '#71717a'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white/60 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                          No severity data yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hall of Fame */}
                  <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-bold text-zinc-900 dark:text-white text-lg mb-1 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-500" /> Hall of Fame
                    </h4>
                    <p className="text-sm text-zinc-500 mb-6">
                      Programs with triage or resolution progress from{' '}
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {(profile.name || profile.nickname).toUpperCase()}
                      </span>
                      , ordered by report count.
                    </p>
                    {hallOfFame.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3">
                        {hallOfFame.map((row, idx) => (
                          <HoverCard key={`${row.label}-${idx}`} openDelay={120} closeDelay={80}>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                className="group aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                aria-label={row.label}
                              >
                                <img
                                  src={row.companyAvatar && row.companyAvatar !== 'default.jpg' ? row.companyAvatar : '/default.jpg'}
                                  alt={row.label}
                                  className="h-full w-full rounded-xl object-cover"
                                />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 border-zinc-200 bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.label}</p>
                              <div className="mt-2 space-y-1 text-xs">
                                <p className="text-zinc-600 dark:text-zinc-300">
                                  Reports submitted: <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{row.reportCount}</span>
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-300">
                                  Reputation from company: <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{row.reputationPoints ?? 0} pts</span>
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No program hall-of-fame entries yet (needs reports in triage, fix, resolved, paid, or review).
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="achievements" className="mt-0">
                  {achievements.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {achievements.map((a, i) => (
                        <div
                          key={`${a.title}-${i}`}
                          className="flex items-start gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50"
                        >
                          <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700 shrink-0">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{a.title || 'Achievement'}</h4>
                            {a.sub ? <p className="text-xs text-zinc-500 mt-0.5">{a.sub}</p> : null}
                            {a.desc ? (
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">{a.desc}</p>
                            ) : null}
                            {a.date ? (
                              <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-wider">
                                {new Date(a.date).toLocaleDateString()}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700 shrink-0">
                          <Bug className="w-6 h-6 text-zinc-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Report activity</h4>
                          <p className="text-xs text-zinc-500 mt-1">
                            {stats?.submitted
                              ? `${stats.submitted} report(s) on BugChase — see Statistics for breakdown.`
                              : 'No reports submitted on BugChase yet.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700 shrink-0">
                          <Target className="w-6 h-6 text-zinc-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Reputation</h4>
                          <p className="text-xs text-zinc-500 mt-1">
                            Current stored score: {rep}. Earn more through valid submissions and program outcomes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
                    <Bug className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      Profile highlights update as you ship impact on programs.
                      <br />
                      <span className="text-black dark:text-white font-medium">More badges coming soon.</span>
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="reports" className="mt-0">
                  {acceptedReports.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm font-sans text-zinc-800 dark:text-zinc-200">
                      {/* Same fixed-width grid for header + every row so Severity / Submitted cells line up vertically */}
                      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/80">
                        <div className="min-w-0 flex-1 text-left font-semibold text-zinc-700 dark:text-zinc-200">
                          Title
                        </div>
                        <div className="grid shrink-0 grid-cols-[8.5rem_15rem] items-center gap-3 sm:grid-cols-[8.5rem_16rem] sm:gap-4">
                          <div className="flex items-center justify-center text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                            Severity
                          </div>
                          <div className="flex min-w-0 items-center justify-center text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                            Submitted to
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {acceptedReports.map((row, idx) => {
                          const titleShown = displayPublicReportTitle(row.title);
                          return (
                            <div
                              key={`${row.title}-${idx}`}
                              className="flex items-center justify-between gap-4 bg-white px-4 py-3 dark:bg-zinc-900/40"
                            >
                              <div className="min-w-0 flex-1 overflow-hidden pr-2 text-left">
                                <span
                                  className="block truncate font-medium text-zinc-900 dark:text-zinc-100"
                                  title={titleShown}
                                >
                                  {titleShown}
                                </span>
                              </div>
                              <div className="grid shrink-0 grid-cols-[8.5rem_15rem] items-center gap-3 sm:grid-cols-[8.5rem_16rem] sm:gap-4">
                                <div className="flex items-center justify-center">
                                  <span
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                      borderColor: `${SEVERITY_CHART_COLORS[row.severity] ?? '#71717a'}55`,
                                      color: SEVERITY_CHART_COLORS[row.severity] ?? '#71717a',
                                      backgroundColor: `${SEVERITY_CHART_COLORS[row.severity] ?? '#71717a'}14`,
                                    }}
                                  >
                                    {row.severity}
                                  </span>
                                </div>
                                <div className="flex min-w-0 items-center justify-center text-zinc-600 dark:text-zinc-300">
                                  <span
                                    className="block w-full truncate text-center"
                                    title={row.submittedTo}
                                  >
                                    {row.submittedTo}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
                      <Bug className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                        No accepted reports to show yet. Submissions appear here after they move past initial triage
                        (e.g. Triaged, Pending fix, Resolved, or Paid).
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
