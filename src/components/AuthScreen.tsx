import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useStore } from '../store/useStore';
import { Loader2 } from 'lucide-react';

const AuthScreen = () => {
    const { setGuestMode } = useStore();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleOAuthLogin = async (provider: 'google' | 'apple') => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            console.error('Error logging in:', error.message);
            alert('Failed to authenticate with ' + provider + '. Please try again.');
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!email || !password) {
            setErrorMsg('Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) setErrorMsg(error.message);
                else alert('Your account is ready now!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) setErrorMsg(error.message);
            }
        } catch {
            setErrorMsg('Authentication service unavailable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-off-white text-brutal-black p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-sm flex flex-col items-center">
                <h1 className="font-serif text-5xl font-bold tracking-tight mb-2 text-center">MacroTrack</h1>
                <p className="font-sans text-xs uppercase tracking-widest opacity-50 mb-8 text-center">
                    AI Telemetry & Cloud Sync
                </p>

                <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4 mb-6">
                    {errorMsg && (
                        <div className="p-3 bg-red-100 text-signal-red text-xs font-sans tracking-wide text-center border border-signal-red/30">
                            {errorMsg}
                        </div>
                    )}
                    <input
                        type="email"
                        placeholder="EMAIL ADDRESS"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-3 font-sans text-sm tracking-widest uppercase transition-colors"
                        required
                    />
                    <input
                        type="password"
                        placeholder="PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-3 font-sans text-sm tracking-widest uppercase transition-colors"
                        required
                        minLength={6}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brutal-black text-off-white p-4 font-sans text-sm tracking-widest uppercase font-bold hover:bg-brutal-black/90 transition-colors shadow-[0_4px_0_rgba(0,0,0,1)] hover:shadow-[0_2px_0_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="animate-spin w-4 h-4" />}
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
                        className="text-xs font-sans tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity mt-2"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                </form>

                <div className="w-full flex justify-between items-center mb-6">
                    <div className="h-[1px] bg-brutal-black/20 flex-1"></div>
                    <span className="font-sans text-[10px] uppercase mx-4 opacity-50 tracking-widest">Or continue with</span>
                    <div className="h-[1px] bg-brutal-black/20 flex-1"></div>
                </div>

                <div className="w-full flex flex-col gap-3">
                    <button
                        onClick={() => handleOAuthLogin('google')}
                        className="w-full brutal-card p-3 hover:bg-black/5 transition-colors flex items-center justify-center gap-3 font-sans font-medium active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Google
                    </button>


                    <button
                        onClick={() => setGuestMode(true)}
                        className="w-full mt-4 py-3 text-xs font-sans tracking-widest uppercase border-2 border-brutal-black/10 hover:border-brutal-black/30 hover:bg-black/5 flex items-center justify-center transition-colors"
                    >
                        Continue as Guest (Offline Mode)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
