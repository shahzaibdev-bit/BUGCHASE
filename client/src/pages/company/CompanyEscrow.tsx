import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertTriangle, Wallet, RefreshCw, Plus, Building2, Smartphone, ShieldCheck, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

// --- Mock Data ---
const transactions = [
  { id: 'TXN-001', type: 'deposit', amount: 50000, status: 'completed', date: '2024-03-15', description: 'Escrow Top-up' },
  { id: 'TXN-002', type: 'payout', amount: 25000, status: 'completed', date: '2024-03-14', description: 'Bounty Payment - RPT-001' },
  { id: 'TXN-003', type: 'payout', amount: 15000, status: 'pending', date: '2024-03-14', description: 'Bounty Payment - RPT-002' },
  { id: 'TXN-004', type: 'deposit', amount: 100000, status: 'completed', date: '2024-03-10', description: 'Escrow Top-up' },
  { id: 'TXN-005', type: 'payout', amount: 5000, status: 'completed', date: '2024-02-28', description: 'Bounty Payment - RPT-003' },
  { id: 'TXN-006', type: 'deposit', amount: 200000, status: 'completed', date: '2024-02-20', description: 'Escrow Top-up' },
  { id: 'TXN-007', type: 'payout', amount: 12000, status: 'completed', date: '2024-02-15', description: 'Bounty Payment - RPT-004' },
  { id: 'TXN-008', type: 'payout', amount: 8000, status: 'failed', date: '2024-02-10', description: 'Bounty Payment - RPT-005' },
];

const paymentMethods = [
    { id: 'pm_1', type: 'bank', name: 'Meezan Bank', detail: '**** 9921', isPrimary: true },
    { id: 'pm_2', type: 'crypto', name: 'USDT Wallet', detail: 'TRC20 • 0x9f...', isPrimary: false },
];

const FUND_PRESETS = [10000, 50000, 100000, 500000];
const ITEMS_PER_PAGE = 5;

export default function CompanyEscrow() {
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  
  // Transaction Filters
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const currentBalance = 500000;
  
  // Fee Calculation
  const amountToFund = customAmount ? parseInt(customAmount) || 0 : selectedAmount;
  const processingFee = Math.round(amountToFund * 0.015); // 1.5%
  const totalPayable = amountToFund + processingFee;

  const handlePresetSelect = (amount: number) => {
      setSelectedAmount(amount);
      setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomAmount(e.target.value);
      setSelectedAmount(0);
  }

  // Filter Transactions Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        const yearMatch = selectedYear === 'all' || txDate.getFullYear().toString() === selectedYear;
        // Month is 0-indexed in JS, but 'Jan' etc logic needs mapping if strictly used strings, 
        // relying on simple month string matching for mock data simplicity or accurate index mapping?
        // Let's assume input 'Jan', 'Feb' map to 0, 1.
        const monthMap: Record<string, number> = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        const monthMatch = selectedMonth === 'all' || txDate.getMonth() === monthMap[selectedMonth];
        
        const dateMatch = !selectedDate || (
            txDate.getDate() === selectedDate.getDate() &&
            txDate.getMonth() === selectedDate.getMonth() &&
            txDate.getFullYear() === selectedDate.getFullYear()
        );

        return yearMatch && monthMatch && dateMatch;
    });
  }, [selectedYear, selectedMonth, selectedDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground uppercase tracking-tight">Escrow Management</h1>
          <p className="text-muted-foreground text-sm font-mono">Manage functionality and funds</p>
        </div>
        
        {/* Add Funds Trigger Button */}
        <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
            <DialogTrigger asChild>
                <Button className="font-mono gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    ADD FUNDS
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-background border-border text-foreground p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                 <div className="flex flex-col h-full overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 border-b border-border bg-background/50 backdrop-blur-md">
                        <DialogTitle className="text-lg font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                             <Wallet className="h-5 w-5 text-primary" />
                             Add Funds to Escrow
                        </DialogTitle>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Left Col: Amount Selection */}
                        <div className="p-6 space-y-6 border-r border-border bg-muted/20">
                             <div className="space-y-3">
                                <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Select Amount (PKR)</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {FUND_PRESETS.map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => handlePresetSelect(amt)}
                                            className={cn(
                                                "h-12 px-3 py-2 text-sm font-mono font-medium rounded-lg border transition-all duration-200",
                                                selectedAmount === amt 
                                                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]" 
                                                    : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                            )}
                                        >
                                            {amt.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative pt-2">
                                     <Label className="text-[10px] text-muted-foreground mb-1.5 block">OR ENTER CUSTOM AMOUNT</Label>
                                     <Input 
                                type="number" 
                                placeholder="Enter custom amount" 
                                value={customAmount}
                                onChange={handleCustomAmountChange}
                                className={cn(
                                    "h-12 bg-muted/50 border-border text-foreground font-mono placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all",
                                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                    customAmount && "border-primary/50"
                                )}
                             />
                             <span className="absolute right-3 bottom-3 text-xs text-muted-foreground font-mono pointer-events-none">PKR</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Payment Method & Summary */}
                        <div className="p-6 space-y-6 flex flex-col h-full">
                            <div className="space-y-3 flex-1">
                                <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Payment Method</Label>
                                <div className="space-y-2">
                                    {/* Bank Transfer */}
                                    <div 
                                        onClick={() => setSelectedMethod('bank')}
                                        className={cn(
                                            "p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all duration-200 group",
                                                selectedMethod === 'bank' 
                                                    ? "bg-muted/80 border-primary/50 shadow-inner" 
                                                    : "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-full transition-colors", selectedMethod === 'bank' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                                <Building2 className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className={cn("text-sm font-medium transition-colors", selectedMethod === 'bank' ? "text-foreground" : "text-muted-foreground")}>Bank Transfer</p>
                                                <p className="text-xs text-muted-foreground font-mono">IBAN: PK88...9921</p>
                                            </div>
                                        </div>
                                        {selectedMethod === 'bank' && <Badge variant="default" className="bg-primary text-primary-foreground text-[10px] animate-in fade-in zoom-in">SELECTED</Badge>}
                                    </div>

                                     {/* Credit Card */}
                                     <div 
                                        onClick={() => setSelectedMethod('card')}
                                        className={cn(
                                            "p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all duration-200 group",
                                                selectedMethod === 'card' 
                                                    ? "bg-muted/80 border-primary/50 shadow-inner" 
                                                    : "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-full transition-colors", selectedMethod === 'card' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                                <CreditCard className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className={cn("text-sm font-medium transition-colors", selectedMethod === 'card' ? "text-foreground" : "text-muted-foreground")}>Credit / Debit Card</p>
                                                <p className="text-xs text-muted-foreground font-mono">Instant Deposit</p>
                                            </div>
                                        </div>
                                        {selectedMethod === 'card' && <Badge variant="default" className="bg-primary text-primary-foreground text-[10px] animate-in fade-in zoom-in">SELECTED</Badge>}
                                    </div>

                                     {/* Crypto */}
                                     <div 
                                        onClick={() => setSelectedMethod('crypto')}
                                        className={cn(
                                            "p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all duration-200 group",
                                                selectedMethod === 'crypto' 
                                                    ? "bg-muted/80 border-primary/50 shadow-inner" 
                                                    : "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-full transition-colors", selectedMethod === 'crypto' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                                <Wallet className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className={cn("text-sm font-medium transition-colors", selectedMethod === 'crypto' ? "text-foreground" : "text-muted-foreground")}>Crypto (USDT)</p>
                                                <p className="text-xs text-muted-foreground font-mono">TRC20 Network</p>
                                            </div>
                                        </div>
                                        {selectedMethod === 'crypto' && <Badge variant="default" className="bg-primary text-primary-foreground text-[10px] animate-in fade-in zoom-in">SELECTED</Badge>}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border">
                                {/* Fee Summary */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Processing Fee (1.5%)</span>
                                        <span className="font-mono">PKR {processingFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-foreground">
                                        <span>Total Payable</span>
                                        <span className="font-mono text-primary">PKR {totalPayable.toLocaleString()}</span>
                                    </div>
                                </div>
                                <Button className="w-full font-bold tracking-wide h-12 text-md shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)] transition-all" size="lg">
                                    PROCEED TO PAYMENT
                                </Button>
                                <div className="flex justify-center items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                                    <ShieldCheck className="h-3 w-3" />
                                    Secure Encrypted Transaction
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Col: Balance Card */}
        <div className="h-full min-h-[320px]">
            {/* Balance Card - High Impact with Animations */}
            <InvertedTiltCard className="h-full rounded-2xl w-full">
                <InverseSpotlightCard 
                    className="relative overflow-hidden rounded-2xl bg-card p-8 border border-border shadow-2xl h-full flex flex-col justify-between"
                    spotlightColor="rgba(34, 197, 94, 0.15)"
                >
                    {/* Background Glow */}
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none opacity-50" />
                    
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <span className={`inline-block w-2 h-2 rounded-full ${currentBalance < 50000 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Escrow Balance (PKR)</p>
                                 </div>
                                 <h2 className="text-5xl font-bold font-mono tracking-tighter text-foreground mt-2">
                                    {currentBalance.toLocaleString()}<span className="text-xl text-muted-foreground">.00</span>
                                 </h2>
                            </div>
                            <Wallet className="h-24 w-24 text-muted/20 rotate-12 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110" strokeWidth={1.5} />
                        </div>

                        <div className="mt-8">
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 px-3 py-1 text-xs font-mono transition-colors">
                                +12.4% THIS_MONTH
                            </Badge>
                        </div>
                    </div>
                </InverseSpotlightCard>
            </InvertedTiltCard>
        </div>

        {/* Right Col: Payment Methods */}
        <div className="h-full min-h-[320px]">
            <GlassCard className="p-0 overflow-hidden flex flex-col h-full border border-border bg-card/40 backdrop-blur-xl">
            <div className="p-6 border-b border-border/50 bg-muted/20">
                 <h3 className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-widest">Payment Methods</h3>
            </div>
            
            <div className="flex-1 p-6 space-y-4 flex flex-col">
                {paymentMethods.map(method => (
                    <div key={method.id} className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/60 hover:border-border transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-background/50 border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors group-hover:bg-background/80">
                                {method.type === 'bank' ? <Building2 className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-foreground text-sm group-hover:translate-x-1 transition-transform">{method.name}</p>
                                <p className="font-mono text-xs text-muted-foreground">{method.detail}</p>
                            </div>
                        </div>
                        {method.isPrimary ? (
                             <Badge variant="outline" className="border-primary/50 text-primary uppercase text-[10px] tracking-wider bg-primary/5 shadow-[0_0_10px_-5px_rgba(34,197,94,0.3)]">Primary</Badge>
                        ) : (
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-xs transition-opacity px-2 tracking-wide font-mono text-muted-foreground hover:text-foreground">SET PRIMARY</Button>
                        )}
                    </div>
                ))}

                <div className="flex-1 flex items-end">
                    <Button variant="outline" className="w-full border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground gap-2 h-12 hover:border-border transition-all group">
                        <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                        LINK_NEW_METHOD
                    </Button>
                </div>
            </div>
            </GlassCard>
        </div>
      </div>

      {/* Low Escrow Warning (Only show if needed) */}
      {currentBalance < 50000 && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                  <h4 className="text-sm font-bold text-red-500 uppercase tracking-wide">Low Escrow Balance</h4>
                  <p className="text-sm text-red-500/80 mt-1">Your balance is below recommended levels. Top up now to avoid bounty delays.</p>
              </div>
          </div>
      )}

       {/* Transaction History with Filters & Pagination */}
       <GlassCard className="p-6 border border-border">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-widest">Recent Transactions</h3>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Year Selector */}
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px] h-9 bg-background/50 border-border text-xs">
                        <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Month Selector */}
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[110px] h-9 bg-background/50 border-border text-xs">
                        <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="Jan">January</SelectItem>
                        <SelectItem value="Feb">February</SelectItem>
                        <SelectItem value="Mar">March</SelectItem>
                        <SelectItem value="Apr">April</SelectItem>
                        <SelectItem value="May">May</SelectItem>
                        <SelectItem value="Jun">June</SelectItem>
                        <SelectItem value="Jul">July</SelectItem>
                        <SelectItem value="Aug">August</SelectItem>
                        <SelectItem value="Sep">September</SelectItem>
                        <SelectItem value="Oct">October</SelectItem>
                        <SelectItem value="Nov">November</SelectItem>
                        <SelectItem value="Dec">December</SelectItem>
                        </SelectContent>
                    </Select>

                     {/* Date Picker */}
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-auto min-w-[140px] h-9 justify-start text-left font-normal bg-background/50 border-border rounded-md px-3 text-xs",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {selectedDate && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full"
                                onClick={() => setSelectedDate(undefined)}
                                title="Clear date"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
           </div>
           
           <div className="space-y-2 min-h-[300px]">
            {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => (
                    <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/10 last:border-0 group"
                    >
                        <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full transition-transform group-hover:scale-110 ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {tx.type === 'deposit' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                            <p className="font-medium text-foreground text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground font-mono">{tx.date} • {tx.id}</p>
                        </div>
                        </div>
                        <div className="text-right">
                        <p className={`font-mono font-bold ${tx.type === 'deposit' ? 'text-green-500' : 'text-foreground'}`}>
                            {tx.type === 'deposit' ? '+' : '-'} PKR {tx.amount.toLocaleString()}
                        </p>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider bg-muted/80">{tx.status}</Badge>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/50">
                    <Clock className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm font-mono uppercase tracking-wider">No transactions found</p>
                </div>
            )}
           </div>

           {/* Pagination */}
           {totalPages > 1 && (
               <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/50">
                   <p className="text-xs text-muted-foreground font-mono mr-2">Page {currentPage} of {totalPages}</p>
                   <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                   >
                       <ChevronLeft className="h-4 w-4" />
                   </Button>
                   <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                   >
                       <ChevronRight className="h-4 w-4" />
                   </Button>
               </div>
           )}
       </GlassCard>
    </div>
  );
}
