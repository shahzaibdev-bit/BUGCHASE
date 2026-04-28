import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  DollarSign, ArrowUpRight, ArrowDownRight, Clock,
  Wallet, Plus, ShieldCheck, Loader2, AlertTriangle,
  CheckCircle2, RefreshCw, CreditCard, Trash2, Building2,
  X
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

// ─── Stripe init ──────────────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

const FUND_PRESETS = [5000, 10000, 50000, 100000];
const ITEMS_PER_PAGE = 8;

// ─── Types ────────────────────────────────────────────────────
interface Transaction {
  _id: string;
  type: 'topup' | 'bounty_payment' | 'bounty_earned' | 'platform_fee';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  relatedReport?: { _id: string; title: string } | null;
}

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────
function txLabel(type: Transaction['type']) {
  const labels: Record<string, string> = {
    topup: 'Wallet Top-up',
    bounty_payment: 'Bounty Payment',
    bounty_earned: 'Bounty Earned',
    platform_fee: 'Platform Fee (5%)',
  };
  return labels[type] ?? type;
}
const isCredit = (type: Transaction['type']) =>
  type === 'topup' || type === 'bounty_earned';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Stripe Card Form for SetupIntent ────────────────────────
function SetupForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
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
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Failed to link account');
    } else {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 hover:bg-muted" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" disabled={!stripe || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link Account'}
        </Button>
      </div>
    </form>
  );
}

// ─── Stripe Card Form for PaymentIntent ───────────────────────
function CheckoutForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: (newBalance: number) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        const res = await fetch(`${API_URL}/company/wallet/topup/confirm`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Confirmation failed');
        onSuccess(data.data.newBalance);
      } catch (err: any) {
        setError(err.message);
      }
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 hover:bg-muted" onClick={onCancel} disabled={loading}>
          Back
        </Button>
        <Button type="submit" className="flex-1 shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] bg-primary text-primary-foreground hover:bg-primary/90" disabled={!stripe || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay PKR ${amount.toLocaleString()}`}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CompanyEscrow() {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();

  const [balance, setBalance] = useState<number>(user?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTx, setTotalTx] = useState(0);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pmLoading, setPmLoading] = useState(true);

  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [linkAccountOpen, setLinkAccountOpen] = useState(false);

  const [step, setStep] = useState<'amount' | 'pay' | 'done'>('amount');
  const [selectedAmount, setSelectedAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [intentLoading, setIntentLoading] = useState(false);
  const [selectedPmId, setSelectedPmId] = useState<string | null>(null);

  const amountToFund = customAmount ? (parseInt(customAmount) || 0) : selectedAmount;

  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const res = await fetch(`${API_URL}/company/wallet/transactions?page=${page}&limit=${ITEMS_PER_PAGE}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.data.transactions);
        setTotalTx(data.data.total);
        setCurrentPage(page);
      }
    } finally {
      setTxLoading(false);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    setPmLoading(true);
    try {
      const res = await fetch(`${API_URL}/company/wallet/payment-methods`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setPaymentMethods(data.data.paymentMethods);
    } finally {
      setPmLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchTransactions(1); 
    fetchPaymentMethods();
  }, [fetchTransactions, fetchPaymentMethods]);

  useEffect(() => { setBalance(user?.walletBalance ?? 0); }, [user?.walletBalance]);

  const handleOpenLinkAccount = async () => {
    setIntentLoading(true);
    try {
      const res = await fetch(`${API_URL}/company/wallet/setup-intent`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to initiate setup');
      setClientSecret(data.clientSecret);
      setLinkAccountOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIntentLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (amountToFund < 100) { toast.error('Minimum top-up is PKR 100'); return; }
    setIntentLoading(true);
    try {
      const res = await fetch(`${API_URL}/company/wallet/topup/intent`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amount: amountToFund, paymentMethodId: selectedPmId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create payment');
      
      if (selectedPmId && !data.requiresAction) {
        handlePaymentSuccess(data.data?.newBalance ?? (balance + amountToFund));
      } else {

        setClientSecret(data.clientSecret);
        setStep('pay');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIntentLoading(false);
    }
  };

  const handlePaymentSuccess = async (newBalance: number) => {
    setBalance(newBalance);
    setStep('done');
    toast.success(`PKR ${amountToFund.toLocaleString()} added to wallet!`);
    await refreshUser();
    fetchTransactions(1);
  };

  const handleLinkSuccess = async () => {
    toast.success('Account linked successfully!');
    setLinkAccountOpen(false);
    setClientSecret('');
    fetchPaymentMethods();
  };

  // OTP-gated deletion state
  const [pmToDelete, setPmToDelete] = useState<PaymentMethod | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState<string | null>(null); // stores pm.id while loading
  const [otpCode, setOtpCode] = useState(new Array(6).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isOtpComplete = otpCode.every((d) => d !== '');

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value)) || element.value === ' ') { element.value = ''; return; }
    const newCode = [...otpCode]; newCode[index] = element.value; setOtpCode(newCode);
    if (element.value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;
    const newCode = new Array(6).fill('');
    for (let i = 0; i < pasteData.length; i++) newCode[i] = pasteData[i];
    setOtpCode(newCode);
    const last = Math.min(pasteData.length - 1, 5);
    if (last >= 0) inputRefs.current[last]?.focus();
  };

  const handleInitiateDeletePm = async (pm: PaymentMethod) => {
    setPmToDelete(pm);
    setOtpCode(new Array(6).fill(''));
    setIsButtonLoading(pm.id);
    try {
      const res = await fetch(`${API_URL}/company/wallet/payment-methods/otp`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.success('Verification code sent to your email');
        setIsOtpModalOpen(true);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch { toast.error('Network error'); }
    finally { setIsButtonLoading(null); }
  };

  const handleVerifyAndDeletePm = async () => {
    if (!isOtpComplete || !pmToDelete) return;
    const finalOtp = otpCode.join('');
    setIsOtpLoading(true);
    try {
      // 1. Verify OTP
      const verifyRes = await fetch(`${API_URL}/company/wallet/payment-methods/verify-otp`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ otp: finalOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData.status !== 'success') {
        toast.error(verifyData.message || 'Invalid OTP');
        setIsOtpLoading(false);
        return;
      }
      // 2. Delete
      const deleteRes = await fetch(`${API_URL}/company/wallet/payment-methods/${pmToDelete.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const deleteData = await deleteRes.json();
      if (deleteRes.ok && deleteData.status === 'success') {
        toast.success('Payment method removed successfully');
        setIsOtpModalOpen(false);
        setOtpCode(new Array(6).fill(''));
        setPmToDelete(null);
        fetchPaymentMethods();
        if (selectedPmId === pmToDelete.id) setSelectedPmId(null);
      } else {
        toast.error(deleteData.message || 'Failed to remove card');
      }
    } catch { toast.error('Network error'); }
    finally { setIsOtpLoading(false); }
  };

  const handleAddFundsClose = (open: boolean) => {
    setAddFundsOpen(open);
    if (!open) {
      setTimeout(() => {
        setStep('amount');
        setClientSecret('');
        setCustomAmount('');
        setSelectedAmount(10000);
        setSelectedPmId(null);
      }, 300);
    }
  };

  const totalPages = Math.ceil(totalTx / ITEMS_PER_PAGE);

  const isDark = theme === 'dark';

  const stripeAppearance = {
    theme: (isDark ? 'night' : 'stripe') as 'night' | 'stripe',
    variables: {
      colorPrimary: '#22c55e',
      colorBackground: isDark ? '#0d0d0d' : '#ffffff',
      colorText: isDark ? '#fafafa' : '#171717',
      colorDanger: '#ef4444',
      borderRadius: '8px',
    },
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground uppercase tracking-tight">Escrow Management</h1>
          <p className="text-muted-foreground text-sm font-mono tracking-wide uppercase">Financial Overview & Wallet Control</p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
            onClick={() => setAddFundsOpen(true)}
            className="font-mono gap-2 bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition-all font-bold tracking-widest uppercase text-xs px-6"
           >
            <Plus className="h-4 w-4" /> Add Funds
           </Button>
        </div>
      </div>

      {/* ── TOP CARDS (Reverting to original 2-column layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Balance Card */}
        <div className="h-full min-h-[280px]">
          <InvertedTiltCard className="h-full rounded-2xl w-full">
            <InverseSpotlightCard
              className="relative overflow-hidden rounded-2xl bg-card p-8 border border-border shadow-2xl h-full flex flex-col justify-between"
              spotlightColor="rgba(34, 197, 94, 0.15)"
            >
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none opacity-50" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${balance < 5000 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Escrow Balance (PKR)</p>
                    </div>
                    <h2 className="text-5xl font-bold font-mono tracking-tighter text-foreground mt-2">
                      {balance.toLocaleString()}<span className="text-xl text-muted-foreground">.00</span>
                    </h2>
                  </div>
                  <Wallet className="h-20 w-20 text-muted/20 rotate-12" strokeWidth={1.5} />
                </div>
                <div className="mt-8 flex items-center gap-3">
                   <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1 text-[10px] font-mono tracking-widest uppercase">
                    Live Status: Connected
                  </Badge>
                  {balance < 5000 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-mono tracking-widest uppercase animate-pulse">Low Funds</Badge>
                  )}
                </div>
              </div>
            </InverseSpotlightCard>
          </InvertedTiltCard>
        </div>

        {/* Payment Methods Card (Matching User Screenshot Layout) */}
        <GlassCard className="p-0 border border-border bg-card/40 backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-widest">Payment Methods</h3>
            <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-tighter">Secure</Badge>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-3">
             {pmLoading ? (
               <div className="flex-1 flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary/30" /></div>
             ) : paymentMethods.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                 <CreditCard className="h-8 w-8 text-muted/30 mb-2" />
                 <p className="text-xs text-muted-foreground font-mono uppercase italic">No linked cards found</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {paymentMethods.map(pm => (
                   <div key={pm.id} className="group relative flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg"><Building2 className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="text-sm font-bold capitalize font-mono tracking-tight">{pm.card.brand} •••• {pm.card.last4}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">EXPIRES {pm.card.exp_month}/{pm.card.exp_year}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-4 uppercase font-mono group-hover:bg-primary/10 group-hover:text-primary transition-colors">Primary</Badge>
                      <button 
                        onClick={() => handleInitiateDeletePm(pm)}
                        disabled={isButtonLoading === pm.id}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {isButtonLoading === pm.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                 ))}
               </div>
             )}
             <Button 
                variant="outline" 
                className="w-full border-dashed border-2 h-14 font-mono text-xs uppercase tracking-widest hover:bg-primary/5 hover:border-primary/50 mt-auto group transition-all"
                onClick={handleOpenLinkAccount}
                disabled={intentLoading}
              >
                {intentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2 group-hover:scale-125 transition-transform" /> Link New Method</>}
              </Button>
          </div>
        </GlassCard>
      </div>

      {/* ── TRANSACTION HISTORY (Full Width) ── */}
      <GlassCard className="p-6 border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-widest">Transaction History</h3>
          <Button variant="ghost" size="sm" className="gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors" onClick={() => fetchTransactions(1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Log
          </Button>
        </div>

        <div className="space-y-1 min-h-[300px]">
          {txLoading ? (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/50">
              <Clock className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-xs font-mono uppercase tracking-widest">No activity found</p>
            </div>
          ) : (
            transactions.map(tx => {
              const credit = isCredit(tx.type);
              return (
                <div key={tx._id} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className={`p-2.5 rounded-xl transition-all group-hover:rotate-[360deg] duration-500 ${credit ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {credit ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm tracking-tight">{txLabel(tx.type)}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {tx.relatedReport && (
                        <p className="text-[10px] text-primary/60 font-mono truncate max-w-[250px] mt-1">Ref: {tx.relatedReport.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-bold text-base ${credit ? 'text-green-500' : 'text-foreground'}`}>
                      {credit ? '+' : '-'} {Math.abs(tx.amount).toLocaleString()} <span className="text-[10px] text-muted-foreground ml-1">PKR</span>
                    </p>
                    <Badge variant="outline" className={cn('text-[9px] uppercase tracking-widest font-mono h-4 border-border', tx.status === 'completed' && 'text-green-500/80', tx.status === 'failed' && 'text-red-500/80')}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-8 pt-6 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-mono mr-2 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
            <Button variant="outline" size="sm" className="h-8 font-mono text-[10px]" onClick={() => fetchTransactions(currentPage - 1)} disabled={currentPage === 1}>PREV</Button>
            <Button variant="outline" size="sm" className="h-8 font-mono text-[10px]" onClick={() => fetchTransactions(currentPage + 1)} disabled={currentPage === totalPages}>NEXT</Button>
          </div>
        )}
      </GlassCard>

      {/* ── MODALS ── */}

      {/* Add Funds Modal */}
      <Dialog open={addFundsOpen} onOpenChange={handleAddFundsClose}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full bg-card border-border text-foreground shadow-2xl p-0 overflow-y-auto max-h-[85vh]">
          <div className="p-6 border-b border-border bg-muted/20">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Wallet Refill
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6">
            {step === 'amount' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Select Quick Amount</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FUND_PRESETS.map(amt => (
                      <button
                        key={amt}
                        onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                        className={cn(
                          'h-11 rounded border text-[11px] font-mono transition-all',
                          selectedAmount === amt && !customAmount 
                          ? 'border-primary bg-primary text-primary-foreground font-bold' 
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        )}
                      >
                        PKR {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="relative mt-4">
                    <Input
                      type="number"
                      placeholder="OR ENTER CUSTOM AMOUNT"
                      value={customAmount}
                      onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                      className="h-12 bg-muted/30 border-border text-foreground font-mono placeholder:text-muted-foreground/50 focus:ring-0 focus:border-primary transition-all text-xs tracking-wider"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Select Source</Label>
                  <div className="space-y-2">
                    {paymentMethods.map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => setSelectedPmId(pm.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded border transition-all',
                          selectedPmId === pm.id ? 'border-primary bg-primary/10' : 'border-border bg-transparent hover:border-primary/30'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-mono uppercase tracking-tight">{pm.card.brand} •••• {pm.card.last4}</span>
                        </div>
                        {selectedPmId === pm.id && <CheckCircle2 className="h-3 w-3 text-primary" />}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedPmId(null)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded border transition-all',
                        !selectedPmId ? 'border-primary bg-primary/10' : 'border-border bg-transparent hover:border-primary/30'
                      )}
                    >
                      <Plus className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-mono uppercase tracking-tight">Use Different Card</span>
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold font-mono text-xs tracking-[0.2em] uppercase mt-4"
                  onClick={handleProceedToPayment}
                  disabled={intentLoading || amountToFund < 100}
                >
                  {intentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refill Now'}
                </Button>
              </div>
            )}

            {step === 'pay' && clientSecret && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                  <CheckoutForm amount={amountToFund} onSuccess={handlePaymentSuccess} onCancel={() => setStep('amount')} />
                </Elements>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-6 py-10 text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="font-mono text-lg font-bold tracking-widest text-foreground uppercase">SUCCESS</p>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter mt-2">PKR {amountToFund.toLocaleString()} added to vault</p>
                </div>
                <Button className="w-full bg-primary text-primary-foreground font-bold font-mono text-xs tracking-widest h-11" onClick={() => handleAddFundsClose(false)}>DISMISS</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Account Modal */}
      <Dialog open={linkAccountOpen} onOpenChange={setLinkAccountOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full bg-card border-border text-foreground p-0 overflow-y-auto max-h-[85vh]">
          <div className="p-6 border-b border-border bg-muted/20">
             <div className="flex justify-between items-center">
                <DialogTitle className="font-mono text-sm font-bold tracking-widest uppercase">Secure Enrollment</DialogTitle>
             </div>
          </div>
          <div className="p-6">
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <SetupForm onSuccess={handleLinkSuccess} onCancel={() => setLinkAccountOpen(false)} />
            </Elements>
          </div>
        </DialogContent>
      </Dialog>
      {/* OTP VERIFICATION MODAL - DELETE CARD */}
      {isOtpModalOpen && pmToDelete && (
        <>
          <div
            className="fixed inset-0 z-40 transition-all duration-300 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={() => setIsOtpModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-sm pointer-events-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-base font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> Security Verification
                </h2>
                <button onClick={() => setIsOtpModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono text-center">
                  Enter the 6-digit code sent to your email to delete the <span className="font-bold capitalize text-zinc-900 dark:text-white">{pmToDelete.card.brand} •••• {pmToDelete.card.last4}</span> card.
                </p>
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpCode.map((data, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={data}
                      placeholder="-"
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onFocus={(e) => { e.target.select(); setFocusedIndex(index); }}
                      onBlur={() => setFocusedIndex(-1)}
                      className={`
                        w-10 h-10 sm:w-12 sm:h-12 text-center text-xl sm:text-2xl font-bold font-mono
                        bg-white dark:bg-black text-zinc-900 dark:text-white
                        rounded-lg border-2 transition-all duration-200 outline-none
                        ${focusedIndex === index
                          ? 'border-zinc-900 dark:border-white shadow-[0_0_0_4px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.1)] scale-105'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }
                      `}
                    />
                  ))}
                </div>
                <Button
                  onClick={handleVerifyAndDeletePm}
                  disabled={!isOtpComplete || isOtpLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold font-mono h-12 rounded-xl uppercase tracking-widest text-xs"
                >
                  {isOtpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> VERIFY & DELETE</>}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


