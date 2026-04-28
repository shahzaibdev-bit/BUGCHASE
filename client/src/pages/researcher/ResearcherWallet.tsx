import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { 
    CreditCard, 
    Wallet, 
    History, 
    Plus, 
    ShieldCheck,
    Landmark,
    ArrowUpRight,
    X,
    Bitcoin,
    Loader2,
    Eye,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { toast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface Transaction {
    id: string;
    date: string;
    desc: string;
    amount: string;
    status: string;
    reportId?: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

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
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    setLoading(false);

    if (stripeError) {
      setError(stripeError.message || 'An error occurred while saving your card.');
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <PaymentElement />
      </div>
      {error && <p className="text-red-500 text-sm px-1">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!stripe || loading} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Payout Method
        </Button>
      </div>
    </form>
  );
}


export default function ResearcherWallet() {
  const { theme } = useTheme();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stripe & Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState('');
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const stripeAppearance = {
    theme: theme === 'dark' ? 'night' : 'stripe',
    variables: {
      colorPrimary: '#10b981',
      colorBackground: theme === 'dark' ? '#09090b' : '#ffffff',
      colorText: theme === 'dark' ? '#fafafa' : '#09090b',
      colorDanger: '#ef4444',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      borderRadius: '8px',
    },
  } as const;

  const fetchWalletData = async () => {
      try {
          const res = await fetch(`${API_URL}/users/wallet`, { headers: authHeaders() });
          if (res.ok) {
              const data = await res.json();
              setWalletBalance(data.data.walletBalance || 0);
              setTransactions(data.data.transactions || []);
          }
      } catch (error) {
          console.error('Failed to fetch wallet data:', error);
      } finally {
          setIsLoading(false);
      }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch(`${API_URL}/users/payout-methods`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.data.methods || []);
        if (data.data.methods?.length > 0 && !selectedMethodId) {
          setSelectedMethodId(data.data.methods[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load payment methods');
    }
  };

  useEffect(() => {
      fetchWalletData();
      fetchPaymentMethods();
  }, []);

  const handleLinkNewMethod = async () => {
    try {
      setIsAddingMethod(true);
      const res = await fetch(`${API_URL}/users/payout-setup`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setClientSecret(data.clientSecret);
      } else {
        toast({ title: 'Error', description: 'Could not initialize setup intent', variant: 'destructive' });
        setIsAddingMethod(false);
      }
    } catch (err) {
      setIsAddingMethod(false);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleRequestWithdrawal = async () => {
      const amount = Number(withdrawAmount);
      if (!amount || amount <= 0) {
          toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
          return;
      }
      if (amount > walletBalance) {
          toast({ title: 'Error', description: 'Insufficient funds', variant: 'destructive' });
          return;
      }
      if (!selectedMethodId) {
          toast({ title: 'Error', description: 'Please select a payout method', variant: 'destructive' });
          return;
      }

      setIsWithdrawing(true);
      try {
          const res = await fetch(`${API_URL}/users/withdraw`, {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({ amount, paymentMethodId: selectedMethodId })
          });
          const data = await res.json();

          if (res.ok && data.status === 'success') {
              toast({ title: 'Success', description: 'Withdrawal processed successfully. You will receive an email confirmation.' });
              setIsWithdrawModalOpen(false);
              setWithdrawAmount('');
              // Refresh wallet data to show new balance and transaction
              fetchWalletData();
          } else {
              toast({ title: 'Error', description: data.message || 'Withdrawal failed', variant: 'destructive' });
          }
      } catch (err) {
          toast({ title: 'Error', description: 'A network error occurred', variant: 'destructive' });
      } finally {
          setIsWithdrawing(false);
      }
  };

  // OTP & Card Details State
  const [cardToView, setCardToView] = useState<PaymentMethod | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Advanced OTP State
  const [code, setCode] = useState(new Array(6).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value)) || element.value === " ") {
      element.value = "";
      return;
    }

    const newCode = [...code];
    newCode[index] = element.value;
    setCode(newCode);

    if (element.value && index < 5) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = inputRefs.current[index - 1];
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;

    const newCode = new Array(6).fill("");
    for (let i = 0; i < pasteData.length; i++) {
      newCode[i] = pasteData[i];
    }
    setCode(newCode);

    const lastFullInput = Math.min(pasteData.length - 1, 5);
    if (lastFullInput >= 0) {
      const targetInput = inputRefs.current[lastFullInput];
      if (targetInput) targetInput.focus();
    }
  };

  const isCodeComplete = code.every((digit) => digit !== "");

  const handleInitiateDelete = async (method: PaymentMethod) => {
    try {
      setCardToView(method);
      setCode(new Array(6).fill(""));
      setIsOtpLoading(true);
      const res = await fetch(`${API_URL}/users/payout-methods/otp`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast({ title: 'OTP Sent', description: 'Check your email for the verification code' });
        setIsOtpModalOpen(true);
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to send OTP', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyAndDelete = async () => {
    if (!isCodeComplete || !cardToView) return;
    const finalOtp = code.join("");
    setIsOtpLoading(true);
    
    try {
      // 1. Verify OTP
      const verifyRes = await fetch(`${API_URL}/users/payout-methods/verify-otp`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ otp: finalOtp }),
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok || verifyData.status !== 'success') {
        toast({ title: 'Error', description: verifyData.message || 'Invalid OTP', variant: 'destructive' });
        setIsOtpLoading(false);
        return;
      }

      // 2. Immediate Delete
      const deleteRes = await fetch(`${API_URL}/users/payout-methods/${cardToView.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const deleteData = await deleteRes.json();
      
      if (deleteRes.ok && deleteData.status === 'success') {
        toast({ title: 'Removed', description: 'Payment method removed successfully' });
        setIsOtpModalOpen(false);
        setCode(new Array(6).fill(""));
        setCardToView(null);
        fetchPaymentMethods();
      } else {
        toast({ title: 'Error', description: deleteData.message || 'Failed to remove card', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans text-zinc-900 dark:text-zinc-100 p-6 space-y-8 transition-colors duration-300">
      
      {/* 1. Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Financial Module
          </h1>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Secure Ledger Connected</span>
             </div>
          </div>
        </div>
        <Button 
          onClick={() => setIsWithdrawModalOpen(true)}
          className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium px-6 shadow-lg shadow-zinc-900/20 dark:shadow-white/10 subpixel-antialiased [backface-visibility:hidden] transform-gpu"
        >
          Withdraw Funds
        </Button>
      </header>

      {/* 2. Top Grid Section (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Balance (Highlight) - With Tilt & Spotlight */}
        <InvertedTiltCard intensity={15} className="h-full">
            <InverseSpotlightCard 
                spotlightRadius={500}
                spotlightColor="rgba(255, 255, 255, 0.25)"
                className="relative p-8 rounded-3xl overflow-hidden shadow-sm group h-full border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/30 transition-colors bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 text-white"
            >
              <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Available Balance</span>
                  <Wallet className="w-5 h-5 text-zinc-400" />
                </div>
                
                <div className="space-y-2">
                    <div className="text-5xl font-bold tracking-tighter text-white flex items-center gap-3">
                        {isLoading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                        ) : (
                            <>
                                {walletBalance.toLocaleString()} <span className="text-2xl text-zinc-500 font-normal">PKR</span>
                            </>
                        )}
                    </div>
                </div>
              </div>
            </InverseSpotlightCard>
        </InvertedTiltCard>

        {/* Card 2: Payment Methods */}
        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200/50 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Payout Methods</h3>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">{paymentMethods.length} Linked</span>
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[200px]">
            {paymentMethods.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 space-y-2 pb-4">
                    <CreditCard className="w-8 h-8 opacity-50" />
                    <p className="text-sm text-center">No payment methods linked.</p>
                </div>
            ) : (
                paymentMethods.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold uppercase text-xs">
                                {pm.brand === 'visa' ? 'VI' : pm.brand === 'mastercard' ? 'MC' : pm.brand.substring(0,2)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white capitalize">{pm.brand} Card</span>
                                <span className="text-xs text-zinc-500 font-mono">**** {pm.last4}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400 hidden sm:inline-block">{pm.expMonth}/{pm.expYear}</span>
                            <button
                                onClick={() => handleInitiateDelete(pm)}
                                disabled={isOtpLoading}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center justify-center"
                                title="Delete Payment Method"
                            >
                                {isOtpLoading && cardToView?.id === pm.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))
            )}
          </div>
          <div className="p-4 pt-0">
             <button 
                onClick={handleLinkNewMethod}
                className="w-full py-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
             >
                <Plus size={14} /> Link New Method
             </button>
          </div>
        </div>

        {/* Card 3: Pending Actions */}
        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
           <div className="p-4 border-b border-zinc-200/50 dark:border-white/5">
            <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Security Checks</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
             <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
             </div>
             <p className="text-zinc-500 text-sm font-medium">
               Your account is verified and secure. Withdrawals are unlocked.
             </p>
          </div>
        </div>

      </div>

      {/* 3. Bottom Section: Transaction Log Table */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-200/50 dark:border-white/5 flex items-center justify-between">
             <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Recent Transactions</h2>
             <Button variant="ghost" size="sm" className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
             </Button>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 dark:bg-white/5 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
              <tr>
                <th className="px-6 py-4 font-medium">Transaction ID</th>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-white/5">
              {transactions.length === 0 && !isLoading && (
                  <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No transactions found.</td>
                  </tr>
              )}
              {transactions.map((txn) => (
                <tr key={txn.id} className="group hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                    {txn.id}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                    {txn.date}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-200">
                    {txn.desc}
                  </td>
                  <td className={cn(
                      "px-6 py-4 text-right font-mono font-medium",
                      txn.amount.startsWith('+') 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-zinc-900 dark:text-white"
                  )}>
                    {txn.amount.startsWith('+') ? '+ PKR ' + txn.amount.substring(1) : (txn.amount.startsWith('-') ? '- PKR ' + txn.amount.substring(1) : 'PKR ' + txn.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border",
                        txn.status === 'CLEARED' 
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" 
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                    )}>
                      {txn.status === 'CLEARED' ? 'Cleared' : 'Processing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WITHDRAWAL MODAL */}
      {isWithdrawModalOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 transition-all duration-300 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={() => setIsWithdrawModalOpen(false)} 
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
                      <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Withdraw Bounty Rewards</span>
                    </div>
                    <button 
                      onClick={() => setIsWithdrawModalOpen(false)}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 pt-0 space-y-6">
                    {/* Balance Display */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Available for Withdrawal</span>
                      <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">PKR {walletBalance.toLocaleString()}</span>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Withdrawal Amount (PKR)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0"
                          className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800 py-2 text-3xl font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                        />
                        <button 
                          onClick={() => setWithdrawAmount(String(walletBalance))}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-900 dark:text-white hover:underline"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Method Selector */}
                    <div className="space-y-3">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Select Payout Method</label>
                      
                      {paymentMethods.length === 0 ? (
                          <div className="text-sm text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                              No payment methods linked. Link a method to withdraw.
                          </div>
                      ) : (
                          paymentMethods.map(pm => (
                            <button 
                                key={pm.id}
                                onClick={() => setSelectedMethodId(pm.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                                    selectedMethodId === pm.id
                                        ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" 
                                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors font-bold uppercase text-xs",
                                    selectedMethodId === pm.id ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800"
                                )}>
                                    {pm.brand === 'visa' ? 'VI' : pm.brand === 'mastercard' ? 'MC' : pm.brand.substring(0,2)}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-zinc-900 dark:text-white capitalize">{pm.brand} Card</div>
                                    <div className="text-xs text-zinc-500">**** {pm.last4} • Exp {pm.expMonth}/{pm.expYear}</div>
                                </div>
                                </div>
                                {selectedMethodId === pm.id && (
                                <span className="text-[10px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-2 py-0.5 rounded uppercase shadow-sm">Selected</span>
                                )}
                            </button>
                          ))
                      )}

                    </div>
                  </div>

                  {/* Footer Summary */}
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Transaction Fee</span>
                        <span className="font-mono text-zinc-900 dark:text-white">PKR 0.00 (Free)</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">Total Receive</span>
                        <span className="font-bold font-mono text-xl text-zinc-900 dark:text-white">PKR {Number(withdrawAmount) || 0}</span>
                     </div>
                     
                     <Button 
                        onClick={handleRequestWithdrawal}
                        disabled={isWithdrawing || !selectedMethodId || !withdrawAmount || Number(withdrawAmount) <= 0}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold h-12 rounded-xl shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                     >
                        {isWithdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'REQUEST WITHDRAWAL'}
                     </Button>
                     
                     <div className="flex items-center justify-center gap-1.5 opacity-60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Secure Stripe Gateway
                        </span>
                     </div>
                  </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ADD METHOD MODAL (Stripe Elements) */}
      {isAddingMethod && clientSecret && (
        <>
          <div 
            className="fixed inset-0 z-40 transition-all duration-300 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={() => {
                setIsAddingMethod(false);
                setClientSecret('');
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5" /> Add Payout Card
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => { setIsAddingMethod(false); setClientSecret(''); }}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <div className="p-6">
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                        <SetupForm 
                            onSuccess={() => {
                                setIsAddingMethod(false);
                                setClientSecret('');
                                toast({ title: 'Success', description: 'Payout method added successfully!' });
                                fetchPaymentMethods();
                            }}
                            onCancel={() => {
                                setIsAddingMethod(false);
                                setClientSecret('');
                            }}
                        />
                    </Elements>
                </div>
            </div>
          </div>
        </>
      )}

      {/* OTP VERIFICATION MODAL */}
      {isOtpModalOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 transition-all duration-300 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={() => setIsOtpModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-sm pointer-events-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" /> Security Verification
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsOtpModalOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col items-center justify-center mb-2">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center font-mono">
                            Enter the 6-digit code sent to your email to securely unlock these details.
                        </p>
                    </div>

                    {/* Input Boxes */}
                    <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handleOtpPaste}>
                        {code.map((data, index) => (
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
                                onFocus={(e) => {
                                    e.target.select();
                                    setFocusedIndex(index);
                                }}
                                onBlur={() => setFocusedIndex(-1)}
                                className={`
                                    w-10 h-10 sm:w-12 sm:h-12 text-center text-xl sm:text-2xl font-bold font-mono
                                    bg-white dark:bg-black 
                                    text-zinc-900 dark:text-white 
                                    rounded-lg border-2 
                                    transition-all duration-200 
                                    outline-none
                                    ${focusedIndex === index
                                    ? "border-zinc-900 dark:border-white shadow-[0_0_0_4px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.1)] z-10 scale-105"
                                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                                    }
                                `}
                            />
                        ))}
                    </div>

                    <Button 
                        onClick={handleVerifyAndDelete}
                        disabled={!isCodeComplete || isOtpLoading}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold h-12 rounded-xl mt-4"
                    >
                        {isOtpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'VERIFY & DELETE'}
                    </Button>
                </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
