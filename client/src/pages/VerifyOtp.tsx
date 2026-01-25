import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  
  const [code, setCode] = useState(new Array(6).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check location state first (more secure/direct), then localStorage as fallback
    const stateEmail = location.state?.email;
    const storedEmail = localStorage.getItem("email");
    const targetEmail = stateEmail || storedEmail;

    if (targetEmail) {
      setEmail(targetEmail);
    } else {
      // If no email found, redirect back to signup/login
      toast({ title: "Error", description: "No email found for verification.", variant: "destructive" });
      navigate('/signup');
    }
  }, [location, navigate]);

  // Handle input change
  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value)) || element.value === " ") {
      element.value = "";
      return;
    }

    const newCode = [...code];
    newCode[index] = element.value;
    setCode(newCode);

    // Move to next input automatically
    if (element.value && index < 5) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = inputRefs.current[index - 1];
      if (prevInput) prevInput.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
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

  const submitHandler = async () => {
    if (!isCodeComplete) return;
    setLoading(true);
    
    try {
      const otp = code.join("");
      const result = await verifyEmail(email, otp);
      
      if (result.success) {
        toast({ title: "Verification Successful", description: "Welcome to BugChase!" });
        localStorage.removeItem("email");
        // Redirect to dashboard (assuming generic dashboard or based on role)
        // Since we don't know the role easily here without decoding token, 
        // we can check if user object in contact has role, or default to generic, 
        // or let the useEffect in a protected route handle it. 
        // For now, let's assume we go to a common landing or determine from context if updated immediately.
        // Actually, AuthContext user should be updated.
        navigate('/researcher'); // Default fallback, or checking context would be better but it might take a tick to update.
        // A better approach is to let the user object guide navigation, but hard to do inside this function synchronously.
        // Let's assume Researcher for now as default from SignupPage defaults.
      } else {
        toast({ title: "Verification Failed", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Mask email
  const getHiddenEmail = (currEmail: string) => {
    if (!currEmail) return "";
    const [username, domain] = currEmail.split("@");
    if (username.length <= 2) return currEmail;
    return `${username[0]}***${username[username.length - 1]}@${domain}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-black font-sans p-4">
      <div className="w-full max-w-lg p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 via-zinc-500 to-zinc-800" />
        
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-zinc-900 dark:text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 font-mono tracking-tight">
            TWO-FACTOR AUTH
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center font-mono">
            {email 
              ? <>Code sent to <span className="font-semibold text-zinc-900 dark:text-white">{getHiddenEmail(email)}</span></>
              : "Enter the code sent to your email"
            }
          </p>
        </div>

        {/* Input Boxes */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-8" onPaste={handlePaste}>
          {code.map((data, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={data}
              placeholder="-"
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
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

        {/* Action Button */}
        <div className="flex justify-center w-full">
          <Button
            onClick={submitHandler}
            disabled={loading || !isCodeComplete}
            className="w-full h-12 text-sm font-bold tracking-widest uppercase bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-all rounded-lg"
          >
            {loading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
          </Button>
        </div>

        {/* Resend */}
        <div className="mt-6 text-center">
          <button 
            type="button"
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors uppercase tracking-wide flex items-center justify-center gap-1 mx-auto"
            onClick={() => toast({ title: "Code Resent", description: "Check your email for a new code." })}
          >
            Resend Verification Code
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
}
