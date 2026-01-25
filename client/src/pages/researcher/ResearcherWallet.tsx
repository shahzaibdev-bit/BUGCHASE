import React, { useState } from 'react';
import { 
    CreditCard, 
    Wallet, 
    History, 
    Plus, 
    ShieldCheck,
    Landmark,
    ArrowUpRight,
    X,
    Bitcoin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

export default function ResearcherWallet() {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');

  const transactions = [
    { id: 'TXN-9982', date: '2023-10-24 14:20', desc: 'Security Reward: Bank Alfalah (SQLi)', amount: '+150,000', status: 'CLEARED' },
    { id: 'TXN-9941', date: '2023-10-20 09:15', desc: 'Withdrawal to IBAN PK88 ...', amount: '-50,000', status: 'CLEARED' },
    { id: 'TXN-9822', date: '2023-10-15 18:30', desc: 'Security Reward: Daraz (XSS)', amount: '+25,000', status: 'CLEARED' },
    { id: 'TXN-9100', date: '2023-10-10 11:00', desc: 'Platform Fee Deduction', amount: '-2,500', status: 'PROCESSING' },
  ];

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
                    <div className="text-5xl font-bold tracking-tighter text-white">
                    15,000.00 <span className="text-2xl text-zinc-500 font-normal">PKR</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                        +12.4%
                        </span>
                        <span className="text-xs text-zinc-500">since last month</span>
                    </div>
                </div>
              </div>
            </InverseSpotlightCard>
        </InvertedTiltCard>

        {/* Card 2: Payment Methods */}
        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200/50 dark:border-white/5">
            <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Payment Methods</h3>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {/* Bank Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-colors group cursor-pointer hover:border-zinc-300 dark:hover:border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">Meezan Bank</span>
                  <span className="text-xs text-zinc-500 font-mono">**** 9921</span>
                </div>
              </div>
              <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium">Primary</span>
            </div>

            {/* Crypto Card */}
             <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-colors group cursor-pointer hover:border-zinc-300 dark:hover:border-white/20">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                 </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">USDT Wallet</span>
                  <span className="text-xs text-zinc-500 font-mono truncate max-w-[120px]">TRC20 • 0x9f....</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 pt-0">
             <button className="w-full py-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> Link New Method
             </button>
          </div>
        </div>

        {/* Card 3: Pending Actions */}
        <div className="flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
           <div className="p-4 border-b border-zinc-200/50 dark:border-white/5">
            <h3 className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Pending Actions</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
             <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
             </div>
             <p className="text-zinc-500 text-sm font-medium">
               All clear. You have no pending actions.
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
                    {txn.amount}
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
      {/* CONDITIONAL RENDER: Only show if isWithdrawModalOpen is true */}
      {isWithdrawModalOpen && (
        <>
          {/* 1. THE BACKDROP OVERLAY */}
          <div 
            className="fixed inset-0 z-40 transition-all duration-300
                       bg-white/60 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={() => setIsWithdrawModalOpen(false)} // Close on background click
          />

          {/* 2. THE MODAL CONTAINER */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* pointer-events-none on wrapper lets clicks pass through if needed, 
               but pointer-events-auto on the modal card restores interaction.
            */}
            <div className="w-full max-w-md pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
              
              {/* MODAL CARD CONTENT */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                   {/* Header */}
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
                      <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">PKR 15,000</span>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Withdrawal Amount</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800 py-2 text-3xl font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                        />
                        <button 
                          onClick={() => setWithdrawAmount('15000')}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-900 dark:text-white hover:underline"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Method Selector */}
                    <div className="space-y-3">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Select Method</label>
                      
                      {/* Bank Transfer */}
                      <button 
                          onClick={() => setSelectedMethod('bank')}
                          className={cn(
                              "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                              selectedMethod === 'bank' 
                                  ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" 
                                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/20"
                          )}
                      >
                          <div className="flex items-center gap-3">
                          <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                              selectedMethod === 'bank' ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800"
                          )}>
                              <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                              <div className="font-bold text-sm text-zinc-900 dark:text-white">Bank Transfer</div>
                              <div className="text-xs text-zinc-500">Standard (1-3 Days)</div>
                          </div>
                          </div>
                          {selectedMethod === 'bank' && (
                          <span className="text-[10px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-2 py-0.5 rounded uppercase shadow-sm">Selected</span>
                          )}
                      </button>

                      {/* Crypto (USDT) */}
                      <button 
                          onClick={() => setSelectedMethod('crypto')}
                          className={cn(
                              "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                              selectedMethod === 'crypto' 
                                  ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" 
                                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/20"
                          )}
                      >
                          <div className="flex items-center gap-3">
                          <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                              selectedMethod === 'crypto' ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800"
                          )}>
                              <Bitcoin className="w-5 h-5" />
                          </div>
                          <div>
                              <div className="font-bold text-sm text-zinc-900 dark:text-white">Crypto (USDT)</div>
                              <div className="text-xs text-zinc-500">Instant (TRC20)</div>
                          </div>
                          </div>
                          {selectedMethod === 'crypto' && (
                          <span className="text-[10px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-2 py-0.5 rounded uppercase shadow-sm">Selected</span>
                          )}
                      </button>

                      {/* PayPal / Payoneer */}
                      <button 
                          onClick={() => setSelectedMethod('paypal')}
                          className={cn(
                              "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                              selectedMethod === 'paypal' 
                                  ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" 
                                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/20"
                          )}
                      >
                          <div className="flex items-center gap-3">
                          <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                              selectedMethod === 'paypal' ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800"
                          )}>
                              <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                              <div className="font-bold text-sm text-zinc-900 dark:text-white">Global Transfer</div>
                              <div className="text-xs text-zinc-500">PayPal / Payoneer</div>
                          </div>
                          </div>
                          {selectedMethod === 'paypal' && (
                          <span className="text-[10px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-2 py-0.5 rounded uppercase shadow-sm">Selected</span>
                          )}
                      </button>

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
                     
                     <Button className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold h-12 rounded-xl shadow-lg shadow-zinc-900/20 dark:shadow-white/10">
                        REQUEST WITHDRAWAL
                     </Button>
                     
                     <div className="flex items-center justify-center gap-1.5 opacity-60">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Secure Payout Gateway</span>
                     </div>
                  </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
