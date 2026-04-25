import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, ShieldCheck, XCircle, Award, Calendar, Building2, UserCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/config';

export default function VerifyCert() {
  const { id } = useParams<{ id: string }>();
  const [certId, setCertId] = useState(id || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [certData, setCertData] = useState<any>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Auto verify if ID in URL and check theme
  useEffect(() => {
     // Check theme from standard keys
     const t = localStorage.getItem('theme') || localStorage.getItem('vite-ui-theme') || 'dark';
     if (t === 'light') setTheme('light');
     else setTheme('dark');

     if (id) {
       performVerification(id);
     }
  }, [id]);

  const performVerification = async (targetId: string) => {
    if (!targetId.trim()) return;

    // Basic frontend XSS prevention - strip out obvious HTML chars
    const sanitizedId = targetId.trim().replace(/[<>]/g, '');
    
    setStatus('loading');
    setMessage('');
    setCertData(null);

    try {
      const res = await fetch(`${API_URL}/public/verify-cert/${encodeURIComponent(sanitizedId)}`);
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setStatus('success');
        setMessage(data.message);
        setCertData(data.data);
      } else {
        setStatus('error');
        setMessage(data.message || 'No certificate found');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Failed to verify certificate. Please try again later.');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(certId);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300`}>
      <div className="z-10 w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className={`text-4xl font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-950'} mb-4 tracking-tight`}>VERIFY CERTIFICATE</h1>
          <p className={`${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'} font-mono text-sm max-w-md mx-auto`}>
            Input the BugChase Certificate ID to authenticate its validity and view the official disclosure record.
          </p>
        </div>

        <div className={`${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'} backdrop-blur-xl border rounded-2xl p-6 shadow-2xl mb-8`}>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="certId" className="block text-xs font-mono text-zinc-500 mb-2 uppercase">Certificate ID</label>
              <div className="relative">
                <Input 
                  id="certId"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  placeholder="e.g. BC-2026-X7Y9Z"
                  className={`w-full ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-700' : 'bg-transparent border-zinc-300 text-black placeholder:text-zinc-400'} font-mono pl-10`}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={status === 'loading' || !certId.trim()}
              className={`w-full ${theme === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-950 text-white hover:bg-zinc-800'} font-bold font-mono`}
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                'AUTHENTICATE'
              )}
            </Button>
          </form>
        </div>

        {status === 'success' && certData && (
          <div className={`${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="bg-green-600 p-6 text-white text-center flex flex-col items-center justify-center">
               <ShieldCheck className="w-12 h-12 mb-3" />
               <h2 className="text-xl font-bold uppercase tracking-widest font-mono">BugChase Authenticated</h2>
               <p className="text-green-100/90 text-sm mt-1">This Digital Certificate Record is Valid & Official.</p>
            </div>
             
            <div className="p-8 space-y-6">
               
               <div className={`text-center font-bold font-mono ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'} tracking-wider`}>
                   CERTIFICATE ID: {certData.certificateId}
               </div>

               <div className={`h-px w-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`} />

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'} font-bold uppercase tracking-wider mb-2 flex items-center gap-1`}><UserCircle className="w-4 h-4" /> Awarded To</p>
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>{certData.researcher?.username || certData.researcher?.name || 'Authorized Researcher'}</p>
                 </div>
                 <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'} font-bold uppercase tracking-wider mb-2 flex items-center gap-1`}><Building2 className="w-4 h-4" /> Issuing Organization</p>
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>{certData.targetCompany}</p>
                 </div>
                 <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'} font-bold uppercase tracking-wider mb-2 flex items-center gap-1`}><AlertTriangle className="w-4 h-4" /> Vulnerability Disclosed</p>
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>{certData.reportTitle}</p>
                 </div>
                 <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'} font-bold uppercase tracking-wider mb-2 flex items-center gap-1`}><Calendar className="w-4 h-4" /> Resolution Date</p>
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>{new Date(certData.issueDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
               </div>

            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-4">
            <XCircle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-500 font-bold text-lg mb-1">VERIFICATION FAILED</h3>
              <p className="text-red-300 text-sm leading-relaxed">
                The provided ID could not be identified as a valid BugChase certificate. If you recently received this certificate and believe this is an error, please contact the issuing organization.
              </p>
            </div>
          </div>
        )}
        
        <p className="col-span-full text-center text-xs text-zinc-600 mt-12 font-mono tracking-widest uppercase">
          BugChase Secure Verification Portal
        </p>
      </div>
    </div>
  );
}
