import { supabase } from '../utils/supabase';

const AuthScreen = () => {
    const handleLogin = async (provider: 'google' | 'apple') => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            console.error('Error logging in:', error.message);
            alert('Failed to authenticate. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-off-white text-brutal-black p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-sm flex flex-col items-center">
                <h1 className="font-serif text-5xl font-bold tracking-tight mb-2 text-center">MacroTrack</h1>
                <p className="font-sans text-xs uppercase tracking-widest opacity-50 mb-12 text-center">
                    AI Telemetry & Cloud Sync
                </p>

                <div className="w-full flex justify-between items-center mb-8">
                    <div className="h-[1px] bg-brutal-black/20 flex-1"></div>
                    <span className="font-sans text-[10px] uppercase mx-4 opacity-50 tracking-widest">Identify to continue</span>
                    <div className="h-[1px] bg-brutal-black/20 flex-1"></div>
                </div>

                <div className="w-full flex flex-col gap-4">
                    <button
                        onClick={() => handleLogin('google')}
                        className="w-full brutal-card p-4 hover:bg-black/5 transition-colors flex items-center justify-center gap-3 font-sans font-medium active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Continue with Google
                    </button>

                    <button
                        onClick={() => handleLogin('apple')}
                        className="w-full bg-brutal-black text-off-white p-4 rounded-xl hover:bg-brutal-black/90 transition-colors shadow-[0_4px_0_rgba(0,0,0,1)] hover:shadow-[0_2px_0_rgba(0,0,0,1)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] flex items-center justify-center gap-3 font-sans font-medium"
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.92 3.78 2.12-3.18 1.96-2.66 6.33.62 7.63-.78 1.1-1.63 2.16-2.6 3.26h-.45Zm-2.73-15.01c.42-1.7-1.1-3.6-2.93-3.9-1.01 2.23.95 3.94 2.93 3.9h-.01Z" />
                        </svg>
                        Continue with Apple
                    </button>
                </div>

                <p className="text-center font-sans text-xs opacity-50 mt-12 max-w-[250px] leading-relaxed">
                    By identifying, you agree to biometric and telemetry retention on external cloud servers.
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;
