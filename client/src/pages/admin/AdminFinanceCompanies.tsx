import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Building2, Plus, Search, Wallet, TrendingUp, Award, Receipt } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CompanyAccount = {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Suspended' | 'Banned';
  balance: number;
  totalFunded: number;
  activePrograms: number;
};

type CompanyDetail = {
  id: string;
  name: string;
  email: string;
  status: string;
  balance: number;
  totalFunded: number;
  platformRevenue: number;
  totalBountiesPaid: number;
  activePrograms: number;
  memberSince: string;
};

type BountyPayment = {
  id: string;
  reportId: string;
  title: string;
  bounty: number;
  platformFee: number;
  totalCharged: number;
  status: string;
  severity: string;
  program: string;
  researcher: string;
  paidAt: string;
};

export default function AdminFinanceCompanies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<CompanyAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('company') || null);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [bountyPayments, setBountyPayments] = useState<BountyPayment[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [isCrediting, setIsCrediting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setIsLoadingList(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/admin/finance/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load companies');
      const list: CompanyAccount[] = payload.data?.companyAccounts || [];
      setCompanies(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load companies');
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchCompanyDetail = async (companyId: string) => {
    try {
      setIsLoadingDetail(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/admin/finance/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load company finance detail');
      setDetail(payload.data.company);
      setBountyPayments(payload.data.bountyPayments || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load company finance detail');
      setDetail(null);
      setBountyPayments([]);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedId) {
      setSearchParams({ company: selectedId }, { replace: true });
      fetchCompanyDetail(selectedId);
    }
  }, [selectedId]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [companies, search]);

  const creditCompanyWallet = async () => {
    if (!selectedId || !detail) return;
    const amount = Number(creditAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    try {
      setIsCrediting(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/admin/finance/companies/${selectedId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, note: creditNote.trim() || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to credit company wallet');
      toast.success(`PKR ${amount.toLocaleString()} added to ${detail.name}`);
      setCreditOpen(false);
      setCreditAmount('');
      setCreditNote('');
      await Promise.all([fetchCompanies(), fetchCompanyDetail(selectedId)]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to credit company wallet');
    } finally {
      setIsCrediting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Company Funds</h1>
        <p className="text-muted-foreground text-sm">
          Wallet balances, platform revenue per company, and paid bounty history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlassCard className="p-4 lg:col-span-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Companies</h3>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {filteredCompanies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedId(company.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === company.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.email}</p>
                  </div>
                  <Badge variant={company.status === 'Active' ? 'secondary' : 'destructive'} className="text-[10px]">
                    {company.status}
                  </Badge>
                </div>
                <p className="text-xs font-mono mt-2 text-muted-foreground">
                  Balance: PKR {company.balance.toLocaleString()}
                </p>
              </button>
            ))}
            {!isLoadingList && filteredCompanies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No companies found.</p>
            )}
          </div>
        </GlassCard>

        <div className="lg:col-span-8 space-y-6">
          {!detail && isLoadingDetail && (
            <GlassCard className="p-8 text-center text-muted-foreground">Loading company details...</GlassCard>
          )}

          {detail && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold font-mono">{detail.name}</h2>
                  <p className="text-sm text-muted-foreground">{detail.email}</p>
                </div>
                <Button onClick={() => setCreditOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Funds
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <InvertedTiltCard>
                  <InverseSpotlightCard className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl h-full">
                    <Wallet className="h-5 w-5 text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold font-mono">PKR {detail.balance.toLocaleString()}</p>
                  </InverseSpotlightCard>
                </InvertedTiltCard>
                <InvertedTiltCard>
                  <InverseSpotlightCard className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl h-full">
                    <TrendingUp className="h-5 w-5 text-emerald-500 mb-3" />
                    <p className="text-sm text-muted-foreground">Total Funded</p>
                    <p className="text-2xl font-bold font-mono">PKR {detail.totalFunded.toLocaleString()}</p>
                  </InverseSpotlightCard>
                </InvertedTiltCard>
                <InvertedTiltCard>
                  <InverseSpotlightCard className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl h-full">
                    <Receipt className="h-5 w-5 text-yellow-500 mb-3" />
                    <p className="text-sm text-muted-foreground">Platform Revenue</p>
                    <p className="text-2xl font-bold font-mono">PKR {detail.platformRevenue.toLocaleString()}</p>
                  </InverseSpotlightCard>
                </InvertedTiltCard>
                <InvertedTiltCard>
                  <InverseSpotlightCard className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl h-full">
                    <Award className="h-5 w-5 text-orange-500 mb-3" />
                    <p className="text-sm text-muted-foreground">Bounties Paid</p>
                    <p className="text-2xl font-bold font-mono">PKR {detail.totalBountiesPaid.toLocaleString()}</p>
                  </InverseSpotlightCard>
                </InvertedTiltCard>
              </div>

              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">Paid Bounties</h3>
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30">
                        <th className="text-left p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Report</th>
                        <th className="text-left p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Program</th>
                        <th className="text-left p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Researcher</th>
                        <th className="text-right p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Bounty</th>
                        <th className="text-right p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Fee</th>
                        <th className="text-right p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                        <th className="text-left p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bountyPayments.map((payment) => (
                        <tr key={payment.id} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="p-3">
                            <p className="font-medium">{payment.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{payment.reportId}</p>
                          </td>
                          <td className="p-3 text-muted-foreground">{payment.program}</td>
                          <td className="p-3">{payment.researcher}</td>
                          <td className="p-3 text-right font-mono">PKR {payment.bounty.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">PKR {payment.platformFee.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-semibold">PKR {payment.totalCharged.toLocaleString()}</td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                      {!isLoadingDetail && bountyPayments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No bounty payments recorded for this company yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Company Funds</DialogTitle>
            <DialogDescription>
              Credit the wallet for <span className="font-medium text-foreground">{detail?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-sm space-y-1">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Current balance</span>
                <span className="font-mono font-semibold">PKR {Number(detail?.balance || 0).toLocaleString()}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Lifetime funded</span>
                <span className="font-mono">PKR {Number(detail?.totalFunded || 0).toLocaleString()}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount (PKR)</Label>
              <Input
                id="credit-amount"
                type="number"
                min={1}
                placeholder="10000"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-note">Note (optional)</Label>
              <Textarea
                id="credit-note"
                placeholder="Wire transfer reference, invoice ID, etc."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditOpen(false)}>Cancel</Button>
            <Button onClick={creditCompanyWallet} disabled={isCrediting}>
              {isCrediting ? 'Adding...' : 'Add Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
