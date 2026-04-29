import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Building2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_URL } from '@/config';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';

type FinanceData = {
  stats: {
    totalLiquidity: number;
    monthlyGrowth: number;
    pendingPayouts: number;
    totalRevenueYtd: number;
  };
  charts: {
    monthlyRevenue: Array<{ month: string; revenue: number; payouts: number }>;
    revenueBreakdown: Array<{ name: string; value: number }>;
  };
  lowBalanceCompanies: Array<{
    id: string;
    name: string;
    email: string;
    status: 'Active' | 'Suspended' | 'Banned';
    balance: number;
    activePrograms: number;
    pendingPayouts: number;
  }>;
};

const BREAKDOWN_COLORS = ['hsl(var(--primary))', '#22c55e', '#ef4444', '#f97316'];
const COMPANY_ACTIONS = ['Suspend', 'Ban', 'Activate'] as const;
const SUSPEND_REASONS = [
  'Repeated payout delays affecting researchers.',
  'Insufficient wallet funding for active payout obligations.',
  'Program policy violations under compliance review.',
  'Suspicious account activity requires temporary restriction.',
  'Other',
] as const;
const BAN_REASONS = [
  'Severe policy violations and non-compliance.',
  'Confirmed fraudulent payment or account activity.',
  'Repeated abusive conduct after prior warnings.',
  'Security threat to platform integrity.',
  'Other',
] as const;
const EMAIL_TEMPLATES = {
  low_balance_warning: {
    label: 'Low Balance Warning',
    subject: 'Action Required: Wallet Balance Below Operating Threshold',
    body:
      'Your BugChase company wallet balance has dropped below the recommended operating threshold.\n\nTo avoid delays in researcher payouts and report resolution flow, please top up your wallet at the earliest.\n\nOur finance monitoring flagged this account to help you prevent disruption to active programs.',
  },
  payout_pending: {
    label: 'Pending Payout Compliance',
    subject: 'Pending Payouts Require Immediate Review',
    body:
      'Our records indicate one or more pending payout obligations linked to your account.\n\nPlease review your wallet status and ensure sufficient liquidity is available to process payouts without delay.\n\nTimely processing helps maintain trust with participating researchers.',
  },
  policy_notice: {
    label: 'Program Compliance Notice',
    subject: 'Notice: Program Compliance and Funding Review',
    body:
      'This is a formal notice from the BugChase admin team regarding compliance and operational readiness.\n\nPlease verify your program policy settings and wallet coverage for pending security payouts.\n\nIf corrective action is not completed in time, temporary account restrictions may apply.',
  },
  custom: {
    label: 'Custom',
    subject: '',
    body: '',
  },
} as const;

export default function AdminFinance() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<FinanceData['lowBalanceCompanies'][number] | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageAction, setManageAction] = useState<(typeof COMPANY_ACTIONS)[number]>('Suspend');
  const [manageReasonChoice, setManageReasonChoice] = useState<string>(SUSPEND_REASONS[0]);
  const [manageReason, setManageReason] = useState('');
  const [isApplyingAction, setIsApplyingAction] = useState(false);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<keyof typeof EMAIL_TEMPLATES>('low_balance_warning');
  const [emailSubject, setEmailSubject] = useState(EMAIL_TEMPLATES.low_balance_warning.subject);
  const [emailBody, setEmailBody] = useState(EMAIL_TEMPLATES.low_balance_warning.body);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchFinanceData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/finance/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load finance analytics');
      setData(payload.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load finance analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const stats = data?.stats;
  const monthlyRevenue = data?.charts.monthlyRevenue || [];
  const revenueBreakdown = useMemo(
    () => (data?.charts.revenueBreakdown || []).filter((row) => row.value > 0),
    [data?.charts.revenueBreakdown]
  );
  const lowBalanceCompanies = data?.lowBalanceCompanies || [];
  const editorHtmlToText = (html: string) => {
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;
    return (container.textContent || container.innerText || '').replace(/\u00a0/g, ' ').trim();
  };

  const openManageModal = (company: FinanceData['lowBalanceCompanies'][number]) => {
    setSelectedCompany(company);
    if (company.status === 'Suspended' || company.status === 'Banned') {
      setManageAction('Activate');
      setManageReasonChoice('Reactivation approved after compliance review.');
      setManageReason('');
    } else {
      setManageAction('Suspend');
      setManageReasonChoice(SUSPEND_REASONS[0]);
      setManageReason('');
    }
    setManageOpen(true);
  };

  const openEmailModal = (company: FinanceData['lowBalanceCompanies'][number]) => {
    setSelectedCompany(company);
    setEmailTemplate('low_balance_warning');
    setEmailSubject(EMAIL_TEMPLATES.low_balance_warning.subject);
    setEmailBody(EMAIL_TEMPLATES.low_balance_warning.body);
    setEmailOpen(true);
  };

  const applyCompanyAction = async () => {
    if (!selectedCompany) return;
    const reasonToSend =
      manageAction === 'Activate'
        ? (editorHtmlToText(manageReason) || manageReasonChoice || 'Account reactivated by admin review.')
        : manageReasonChoice === 'Other'
          ? editorHtmlToText(manageReason)
          : manageReasonChoice;
    if ((manageAction === 'Suspend' || manageAction === 'Ban') && !reasonToSend.trim()) {
      toast.error('Reason is required for suspend or ban.');
      return;
    }
    const status =
      manageAction === 'Suspend' ? 'Suspended' : manageAction === 'Ban' ? 'Banned' : 'Active';
    try {
      setIsApplyingAction(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${selectedCompany.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason: reasonToSend || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to update company status');
      toast.success(`Company ${status.toLowerCase()} successfully.`);
      setManageOpen(false);
      await fetchFinanceData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company status');
    } finally {
      setIsApplyingAction(false);
    }
  };

  const sendCompanyEmail = async () => {
    if (!selectedCompany) return;
    const emailBodyText = editorHtmlToText(emailBody);
    if (!emailSubject.trim() || !emailBodyText) {
      toast.error('Subject and message are required.');
      return;
    }
    try {
      setIsSendingEmail(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${selectedCompany.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: emailSubject.trim(), message: emailBodyText }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to send email');
      toast.success('Email sent to company.');
      setEmailOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Financial Health</h1>
          <p className="text-muted-foreground text-sm">Platform financial overview and escrow management</p>
        </div>
        <Button variant="outline" onClick={fetchFinanceData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 text-sm font-mono">
                <TrendingUp className="h-4 w-4" />
                {isLoading ? '...' : `${stats?.monthlyGrowth ?? 0}%`}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Total Liquidity</p>
              <p className="text-2xl font-bold font-mono text-foreground">
                PKR {isLoading ? '...' : Number(stats?.totalLiquidity || 0).toLocaleString()}
              </p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <ArrowUpRight className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue (YTD)</p>
              <p className="text-2xl font-bold font-mono text-foreground">
                PKR {isLoading ? '...' : Number(stats?.totalRevenueYtd || 0).toLocaleString()}
              </p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <ArrowDownRight className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold font-mono text-foreground">
                PKR {isLoading ? '...' : Number(stats?.pendingPayouts || 0).toLocaleString()}
              </p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 rounded-xl transition-colors h-full flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <Badge variant="destructive">{lowBalanceCompanies.length}</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Low Balance Alerts</p>
              <p className="text-2xl font-bold font-mono text-foreground">{lowBalanceCompanies.length} Companies</p>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Payouts */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue vs Payouts</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `PKR ${v/1000}k`} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  formatter={(value: number) => [`PKR ${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="payouts" fill="#ef4444" radius={[4, 4, 0, 0]} name="Payouts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Revenue Breakdown */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Financial Breakdown</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {revenueBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`PKR ${value.toLocaleString()}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {revenueBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: BREAKDOWN_COLORS[revenueBreakdown.findIndex((r) => r.name === item.name) % BREAKDOWN_COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono text-sm">PKR {item.value.toLocaleString()}</span>
                </div>
              ))}
              {revenueBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground">No completed transactions yet.</p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Low Balance Companies */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Low Balance Companies (Below $1,000)
          </h3>
        </div>

        <div className="space-y-3">
          {lowBalanceCompanies.map((company, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Building2 className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.activePrograms} active programs • PKR {company.pendingPayouts.toLocaleString()} pending
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono font-semibold text-yellow-500">PKR {company.balance.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
                <Badge variant={company.status === 'Active' ? 'secondary' : 'destructive'}>{company.status}</Badge>
                <Button variant="outline" size="sm" onClick={() => openManageModal(company)}>
                  Manage
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEmailModal(company)}>
                  Email
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && lowBalanceCompanies.length === 0 && (
            <p className="text-sm text-muted-foreground">No low-balance companies found.</p>
          )}
        </div>
      </GlassCard>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Company Status</DialogTitle>
            <DialogDescription>
              Update status for <span className="font-medium text-foreground">{selectedCompany?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Action</p>
              <Select value={manageAction} onValueChange={(v) => setManageAction(v as (typeof COMPANY_ACTIONS)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(manageAction === 'Suspend' || manageAction === 'Ban') && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Predefined reason</p>
                <Select
                  value={manageReasonChoice}
                  onValueChange={(v) => {
                    setManageReasonChoice(v);
                    if (v !== 'Other') setManageReason('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(manageAction === 'Ban' ? BAN_REASONS : SUSPEND_REASONS).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(manageAction === 'Suspend' || manageAction === 'Ban') && manageReasonChoice === 'Other' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Custom reason</p>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <CyberpunkEditor
                    content={manageReason}
                    onChange={setManageReason}
                    placeholder="Write your own reason shown to company admin..."
                  />
                </div>
              </div>
            )}
            {manageAction === 'Activate' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Activation note (optional)</p>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <CyberpunkEditor
                    content={manageReason}
                    onChange={setManageReason}
                    placeholder="Optional note to include in reactivation email..."
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyCompanyAction} disabled={isApplyingAction}>
              {isApplyingAction ? 'Applying...' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Company</DialogTitle>
            <DialogDescription>
              Send an email to <span className="font-medium text-foreground">{selectedCompany?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Template</p>
              <Select
                value={emailTemplate}
                onValueChange={(v) => {
                  const key = v as keyof typeof EMAIL_TEMPLATES;
                  setEmailTemplate(key);
                  setEmailSubject(EMAIL_TEMPLATES[key].subject);
                  setEmailBody(EMAIL_TEMPLATES[key].body);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMAIL_TEMPLATES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {emailTemplate === 'custom' ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Message</p>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <CyberpunkEditor
                      content={emailBody}
                      onChange={setEmailBody}
                      placeholder="Write your custom message..."
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Template preview</p>
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                  <p className="text-sm font-semibold">{emailSubject}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{emailBody}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendCompanyEmail} disabled={isSendingEmail}>
              {isSendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
