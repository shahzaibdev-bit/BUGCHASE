import React, { useCallback, useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useTheme } from 'next-themes';
import { apiFetch } from '@/lib/api';
import { ensureStripeReady, getStripePromise, STRIPE_PAYMENT_ELEMENT_OPTIONS } from '@/lib/stripe';
import { cn } from '@/lib/utils';
import {
  Wallet,
  CreditCard,
  Plus,
  Trash2,
  ShieldCheck,
  Loader2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  Save,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { toast } from 'sonner';

type PlatformSettings = {
  accountLabel: string;
  provider: string;
  accountLast4: string;
  platformFeePercent: number;
  treasuryBalance: number;
  isLinked: boolean;
  notes: string;
};

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
};

type TreasuryTransaction = {
  id: string;
  date: string;
  type: string;
  direction: 'in' | 'out';
  amount: number;
  description: string;
  company: string;
  reportId: string | null;
  bountyAmount: number | null;
  researcherId: string | null;
  status: string;
};

type BountyRevenueRow = {
  id: string;
  date: string;
  company: string;
  reportId: string | null;
  bountyAmount: number;
  platformRevenue: number;
  researcherId: string | null;
  status: string;
};

type TxFilter = 'all' | 'in' | 'out' | 'revenue';

function SetupForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    setLoading(false);

    if (stripeError) {
      setError(stripeError.message || 'Failed to save card.');
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <PaymentElement options={STRIPE_PAYMENT_ELEMENT_OPTIONS} />
      </div>
      {error && <p className="text-red-500 text-sm px-1">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!stripe || loading} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Account
        </Button>
      </div>
    </form>
  );
}

export default function AdminFinancePlatform() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [revenueRows, setRevenueRows] = useState<BountyRevenueRow[]>([]);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [feeInput, setFeeInput] = useState('5');
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pmLoading, setPmLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof getStripePromise> | null>(null);

  const stripeAppearance = {
    theme: theme === 'dark' ? 'night' : 'stripe',
    variables: {
      colorPrimary: '#10b981',
      colorBackground: theme === 'dark' ? '#09090b' : '#ffffff',
      colorText: theme === 'dark' ? '#fafafa' : '#09090b',
      colorDanger: '#ef4444',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      borderRadius: '8px',
    },
  } as const;

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/admin/finance/platform-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load settings');
      const next = payload.data.settings as PlatformSettings;
      setSettings(next);
      setFeeInput(String(next.platformFeePercent ?? 5));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load platform settings');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setPmLoading(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/admin/finance/platform/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load payment methods');
      setPaymentMethods(payload.data.paymentMethods || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load payment methods');
    } finally {
      setPmLoading(false);
    }
  };

  const fetchTransactions = useCallback(async (direction: TxFilter = txFilter) => {
    try {
      setTxLoading(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/admin/finance/platform/transactions?direction=${direction}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load transactions');

      if (direction === 'revenue') {
        setRevenueRows(payload.data.revenue || []);
        setTransactions([]);
      } else {
        setTransactions(payload.data.transactions || []);
        setRevenueRows([]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, [txFilter]);

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchSettings(), fetchPaymentMethods(), fetchTransactions(txFilter)]);
    setIsLoading(false);
  };

  useEffect(() => {
    setStripePromise(getStripePromise());
    refreshAll();
  }, []);

  useEffect(() => {
    fetchTransactions(txFilter);
  }, [txFilter, fetchTransactions]);

  const handleLinkAccount = async () => {
    try {
      const stripe = await ensureStripeReady();
      if (!stripe) {
        toast.error('Stripe is not configured. Add VITE_STRIPE_PUBLIC_KEY to client/.env.');
        return;
      }
      setStripePromise(getStripePromise());
      setIsLinking(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/admin/finance/platform/setup-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to start account linking');
      setClientSecret(payload.clientSecret);
    } catch (error: any) {
      setIsLinking(false);
      toast.error(error.message || 'Failed to link account');
    }
  };

  const handleLinkSuccess = async () => {
    toast.success('Platform account linked successfully');
    setIsLinking(false);
    setClientSecret('');
    await Promise.all([fetchSettings(), fetchPaymentMethods()]);
  };

  const handleRemoveMethod = async (methodId: string) => {
    try {
      setIsRemoving(methodId);
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/admin/finance/platform/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to remove account');
      toast.success('Account unlinked');
      await Promise.all([fetchSettings(), fetchPaymentMethods()]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove account');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleSaveFee = async () => {
    const feePercent = Number(feeInput);
    if (Number.isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
      toast.error('Platform fee must be between 0 and 100');
      return;
    }
    try {
      setIsSavingFee(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/admin/finance/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platformFeePercent: feePercent }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to save platform fee');
      const next = payload.data.settings as PlatformSettings;
      setSettings((prev) => (prev ? { ...prev, platformFeePercent: next.platformFeePercent } : next));
      setFeeInput(String(next.platformFeePercent));
      setIsEditingFee(false);
      toast.success(`Platform fee updated to ${next.platformFeePercent}%`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save platform fee');
    } finally {
      setIsSavingFee(false);
    }
  };

  const brandLabel = (brand: string) => {
    if (brand === 'visa') return 'VI';
    if (brand === 'mastercard') return 'MC';
    return brand.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Platform Treasury</h1>
        <p className="text-sm text-muted-foreground">
          Link the settlement account and monitor platform fee revenue
        </p>
      </header>

      {/* Top 3-card grid — matches researcher wallet layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <InvertedTiltCard intensity={15} className="h-full">
          <InverseSpotlightCard
            spotlightRadius={500}
            spotlightColor="rgba(255, 255, 255, 0.25)"
            className="relative p-8 rounded-3xl overflow-hidden shadow-sm h-full border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/30 transition-colors bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 text-white"
          >
            <div className="relative z-10 flex flex-col justify-between h-full space-y-8 min-h-[200px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Treasury Balance</span>
                <Wallet className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="text-5xl font-bold tracking-tighter text-white flex items-baseline gap-3">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                ) : (
                  <>
                    {(settings?.treasuryBalance ?? 0).toLocaleString()}
                    <span className="text-2xl text-zinc-500 font-normal">PKR</span>
                  </>
                )}
              </div>
            </div>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden min-h-[280px]">
          <div className="p-4 border-b border-zinc-200/50 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Linked Accounts</h3>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
              {paymentMethods.length} Linked
            </span>
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[200px]">
            {pmLoading ? (
              <div className="h-full flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 space-y-2 py-6">
                <CreditCard className="w-8 h-8 opacity-50" />
                <p className="text-sm text-center">No settlement account linked yet.</p>
              </div>
            ) : (
              paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xs">
                      {brandLabel(pm.brand)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white capitalize">
                        {pm.brand} Card
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">**** {pm.last4}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pm.expMonth && pm.expYear && (
                      <span className="text-[10px] text-zinc-400 hidden sm:inline-block">
                        {pm.expMonth}/{pm.expYear}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMethod(pm.id)}
                      disabled={isRemoving === pm.id}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Unlink account"
                    >
                      {isRemoving === pm.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={handleLinkAccount}
              disabled={isLinking}
              className="w-full py-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              {isLinking && !clientSecret ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus size={14} /> Link New Method
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden min-h-[280px]">
          <div className="p-4 border-b border-zinc-200/50 dark:border-white/5">
            <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Platform Fee</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center p-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <Percent className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Fee on each bounty release
              </p>
              {isEditingFee ? (
                <div className="flex gap-2 justify-center items-center">
                  <Input
                    id="platform-fee"
                    type="text"
                    inputMode="decimal"
                    placeholder="%"
                    value={feeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.]/g, '');
                      setFeeInput(val);
                    }}
                    className="font-mono text-lg w-24 text-center"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveFee();
                      if (e.key === 'Escape') {
                        setFeeInput(String(settings?.platformFeePercent ?? 5));
                        setIsEditingFee(false);
                      }
                    }}
                  />
                  <Button onClick={handleSaveFee} disabled={isSavingFee} size="icon" className="shrink-0">
                    {isSavingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <p className="text-4xl font-bold font-mono text-foreground">
                    {settings?.platformFeePercent ?? 5}%
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFeeInput(String(settings?.platformFeePercent ?? 5));
                      setIsEditingFee(true);
                    }}
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                    title="Edit platform fee"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-zinc-500">
                Researchers receive the full bounty. Companies are charged bounty + this fee.
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {settings?.isLinked ? 'Settlement account connected' : 'Link an account above'}
            </div>
          </div>
        </div>
      </div>

      {/* Treasury ledger */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-200/50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Treasury Ledger</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Incoming = company fund additions · Outgoing = bounty deductions from company wallets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'in', label: 'Incoming' },
              { key: 'out', label: 'Outgoing' },
              { key: 'revenue', label: 'Bounty Revenue' },
            ] as { key: TxFilter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTxFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors',
                  txFilter === key
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          {txFilter === 'revenue' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-white/5 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Report ID</th>
                  <th className="px-6 py-4 font-medium">Company Name</th>
                  <th className="px-6 py-4 font-medium text-right">Bounty Amount</th>
                  <th className="px-6 py-4 font-medium">Researcher ID</th>
                  <th className="px-6 py-4 font-medium text-right">Platform Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50 dark:divide-white/5">
                {txLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                    </td>
                  </tr>
                ) : revenueRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      No bounty revenue recorded yet.
                    </td>
                  </tr>
                ) : (
                  revenueRows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {new Date(row.date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                        {row.reportId || '—'}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{row.company}</td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-600 dark:text-zinc-300">
                        PKR {row.bountyAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                        {row.researcherId || '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        + PKR {row.platformRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : txFilter === 'out' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 dark:bg-white/5 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Report ID</th>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium">Researcher ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50 dark:divide-white/5">
                {txLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      No outgoing bounty transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {new Date(txn.date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                        {txn.reportId || '—'}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{txn.company}</td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-red-500 dark:text-red-400">
                        - PKR {txn.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                        {txn.researcherId || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 dark:bg-white/5 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Company</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-white/5">
              {txLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No {txFilter === 'out' ? 'outgoing bounty' : txFilter === 'in' ? 'incoming funding' : ''} transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {new Date(txn.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-200 max-w-xs truncate">
                      {txn.description}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{txn.company}</td>
                    <td
                      className={cn(
                        'px-6 py-4 text-right font-mono font-medium',
                        txn.direction === 'in'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400',
                      )}
                    >
                      {txn.direction === 'in' ? '+' : '-'} PKR {txn.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border',
                          txn.direction === 'in'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
                        )}
                      >
                        {txn.direction === 'in' ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {txn.direction === 'in' ? 'Incoming' : 'Outgoing'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {isLinking && clientSecret && stripePromise && (
        <>
          <div
            className="fixed inset-0 z-40 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={() => {
              setIsLinking(false);
              setClientSecret('');
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Link Settlement Account
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsLinking(false);
                    setClientSecret('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6">
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                  <SetupForm
                    onSuccess={handleLinkSuccess}
                    onCancel={() => {
                      setIsLinking(false);
                      setClientSecret('');
                    }}
                  />
                </Elements>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
