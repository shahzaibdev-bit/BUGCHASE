import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number;
              text?: 'signin_with' | 'continue_with';
            }
          ) => void;
        };
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onSuccess: () => void;
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';

export function GoogleLoginButton({ onSuccess }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { googleLogin } = useAuth();
  const [isConfigured] = useState(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));

  useEffect(() => {
    if (!isConfigured || !buttonRef.current) return;

    const render = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            toast.error('Google did not return a credential.');
            return;
          }
          const result = await googleLogin(response.credential);
          if (result.success) {
            toast.success('Google sign-in successful.');
            onSuccess();
          } else {
            toast.error(result.error || 'Google login failed.');
          }
        },
      });
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
      });
    };

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      render();
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [googleLogin, isConfigured, onSuccess]);

  if (!isConfigured) {
    return (
      <button
        type="button"
        disabled
        className="w-full h-11 rounded-lg border border-gray-300 dark:border-white/20 text-sm font-mono text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
        title="Set VITE_GOOGLE_CLIENT_ID in support-client and GOOGLE_CLIENT_ID in the main server to enable Google login."
      >
        CONTINUE WITH GOOGLE
      </button>
    );
  }

  return (
    <div className="flex justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-white">
      <div ref={buttonRef} />
    </div>
  );
}
