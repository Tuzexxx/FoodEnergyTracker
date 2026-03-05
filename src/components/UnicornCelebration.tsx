import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { playSound } from '../utils/audio';

interface Unicorn {
    id: number;
    x: number;
    y: number;
    size: number;
    speed: number;
    angle: number;
    hue: number;
    alive: boolean;
}

interface Star {
    id: number;
    x: number;
    y: number;
    angle: number;
    emoji: string;
}

interface UnicornCelebrationProps {
    onDismiss: () => void;
}

const UNICORN_COUNT = 10;
const TIME_LIMIT = 10; // seconds
const STAR_EMOJIS = ['⭐', '✨', '🌟', '💫', '⚡'];

const UnicornCelebration = ({ onDismiss }: UnicornCelebrationProps) => {
    const [unicorns, setUnicorns] = useState<Unicorn[]>([]);
    const [stars, setStars] = useState<Star[]>([]);
    const [burstCount, setBurstCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const overlayRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLDivElement>(null);
    const unicornRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const animationFrameRef = useRef<number>(0);
    const unicornsRef = useRef<Unicorn[]>([]);
    const starIdCounter = useRef(0);
    const dismissedRef = useRef(false);
    const burstCountRef = useRef(0);

    // Initialize unicorns
    useEffect(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const initial: Unicorn[] = Array.from({ length: UNICORN_COUNT }, (_, i) => ({
            id: i,
            x: Math.random() * (vw - 80) + 40,
            y: Math.random() * (vh - 280) + 160,
            size: 40 + Math.random() * 20,
            speed: 0.8 + Math.random() * 1.2,
            angle: Math.random() * Math.PI * 2,
            hue: Math.random() * 360,
            alive: true,
        }));
        setUnicorns(initial);
        unicornsRef.current = initial;

        // Entrance animation
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        gsap.fromTo(headingRef.current,
            { y: -80, opacity: 0, scale: 0.5 },
            { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.2 }
        );
    }, []);

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    if (!dismissedRef.current) {
                        dismissedRef.current = true;
                        handleDismiss();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Prevent ALL scroll/touch default behavior on the overlay
    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;

        const prevent = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        };

        el.addEventListener('touchstart', prevent, { passive: false });
        el.addEventListener('touchmove', prevent, { passive: false });
        el.addEventListener('touchend', prevent, { passive: false });
        el.addEventListener('wheel', prevent, { passive: false });

        // Also lock body scroll
        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';

        return () => {
            el.removeEventListener('touchstart', prevent);
            el.removeEventListener('touchmove', prevent);
            el.removeEventListener('touchend', prevent);
            el.removeEventListener('wheel', prevent);
            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
        };
    }, []);

    // Animation loop — float unicorns around
    useEffect(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const animate = () => {
            unicornsRef.current = unicornsRef.current.map(u => {
                if (!u.alive) return u;

                let nx = u.x + Math.cos(u.angle) * u.speed;
                let ny = u.y + Math.sin(u.angle) * u.speed;
                let newAngle = u.angle + (Math.random() - 0.5) * 0.1;

                // Bounce off edges
                if (nx < 30 || nx > vw - 30) {
                    newAngle = Math.PI - newAngle;
                    nx = Math.max(30, Math.min(vw - 30, nx));
                }
                if (ny < 120 || ny > vh - 80) {
                    newAngle = -newAngle;
                    ny = Math.max(120, Math.min(vh - 80, ny));
                }

                return { ...u, x: nx, y: ny, angle: newAngle };
            });

            // Update DOM directly for performance
            unicornsRef.current.forEach(u => {
                const el = unicornRefs.current.get(u.id);
                if (el && u.alive) {
                    el.style.transform = `translate(${u.x - u.size / 2}px, ${u.y - u.size / 2}px) rotate(${u.angle * 30}deg)`;
                }
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, []);

    // Burst a unicorn
    const burstUnicorn = useCallback((id: number) => {
        const target = unicornsRef.current.find(u => u.id === id);
        if (!target || !target.alive) return;

        // Mark as dead
        unicornsRef.current = unicornsRef.current.map(u => u.id === id ? { ...u, alive: false } : u);
        setUnicorns(prev => prev.map(u => u.id === id ? { ...u, alive: false } : u));

        // Animate the unicorn element shrinking
        const el = unicornRefs.current.get(id);
        if (el) {
            gsap.to(el, {
                scale: 2.5, opacity: 0, duration: 0.35, ease: 'power2.out',
                onComplete: () => { el.style.display = 'none'; }
            });
        }

        // Spawn star particles
        const numStars = 8 + Math.floor(Math.random() * 5);
        const newStars: Star[] = Array.from({ length: numStars }, () => ({
            id: starIdCounter.current++,
            x: target.x,
            y: target.y,
            angle: Math.random() * Math.PI * 2,
            emoji: STAR_EMOJIS[Math.floor(Math.random() * STAR_EMOJIS.length)],
        }));
        setStars(prev => [...prev, ...newStars]);

        // Animate stars flying out
        requestAnimationFrame(() => {
            newStars.forEach(star => {
                const starEl = document.getElementById(`star-${star.id}`);
                if (starEl) {
                    const distance = 150 + Math.random() * 250;
                    const dx = Math.cos(star.angle) * distance;
                    const dy = Math.sin(star.angle) * distance;
                    gsap.to(starEl, {
                        x: dx, y: dy,
                        opacity: 0,
                        scale: 0.3 + Math.random() * 1.5,
                        rotation: Math.random() * 720 - 360,
                        duration: 0.6 + Math.random() * 0.4,
                        ease: 'power2.out',
                        onComplete: () => {
                            setStars(prev => prev.filter(s => s.id !== star.id));
                        }
                    });
                }
            });
        });

        try { playSound('targetHit'); } catch { }

        burstCountRef.current += 1;
        setBurstCount(burstCountRef.current);

        // Check if all unicorns are burst
        if (burstCountRef.current >= UNICORN_COUNT && !dismissedRef.current) {
            dismissedRef.current = true;
            setTimeout(() => handleDismiss(), 600);
        }
    }, []);

    const handleDismiss = useCallback(() => {
        if (overlayRef.current) {
            gsap.to(overlayRef.current, {
                opacity: 0, duration: 0.4, ease: 'power2.in',
                onComplete: onDismiss
            });
        } else {
            onDismiss();
        }
    }, [onDismiss]);

    // Hit-test at a point — check all alive unicorns
    const hitTestAt = useCallback((px: number, py: number) => {
        for (const u of unicornsRef.current) {
            if (!u.alive) continue;
            const dx = px - u.x;
            const dy = py - u.y;
            if (Math.sqrt(dx * dx + dy * dy) < 45 + u.size / 2) {
                burstUnicorn(u.id);
                return;
            }
        }
    }, [burstUnicorn]);

    // Pointer handlers — both down AND move for swipe support
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        hitTestAt(e.clientX, e.clientY);
    }, [hitTestAt]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Only burst on move if a button is pressed (finger/mouse down)
        if (e.buttons > 0 || e.pointerType === 'touch') {
            e.preventDefault();
            hitTestAt(e.clientX, e.clientY);
        }
    }, [hitTestAt]);

    const timerPercent = (timeLeft / TIME_LIMIT) * 100;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-start select-none"
            style={{
                background: 'radial-gradient(ellipse at center, rgba(88,28,135,0.95) 0%, rgba(15,23,42,0.97) 100%)',
                touchAction: 'none',
                overscrollBehavior: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
        >
            {/* Skip button */}
            <button
                onClick={(e) => { e.stopPropagation(); if (!dismissedRef.current) { dismissedRef.current = true; handleDismiss(); } }}
                className="absolute top-5 right-5 z-[110] bg-white/10 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/20 rounded-full p-2.5 transition-all active:scale-90"
            >
                <X size={20} />
            </button>

            {/* Timer bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 z-[110]">
                <div
                    className="h-full transition-all duration-1000 ease-linear rounded-r-full"
                    style={{
                        width: `${timerPercent}%`,
                        background: timerPercent > 30 ? 'linear-gradient(90deg, #a855f7, #ec4899)' : '#ef4444',
                    }}
                />
            </div>

            {/* Heading */}
            <div ref={headingRef} className="mt-16 text-center pointer-events-none select-none">
                <div className="text-6xl mb-3">🏆</div>
                <h2 className="text-3xl font-drama tracking-wider text-white drop-shadow-lg">
                    GOALS CRUSHED!
                </h2>
                <p className="text-white/50 font-sans text-xs mt-2 tracking-wide uppercase">
                    Swipe to pop the unicorns! {timeLeft}s left
                </p>
                <div className="mt-3 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 inline-block">
                    <span className="text-white/80 font-data text-sm font-bold">
                        {burstCount} / {UNICORN_COUNT}
                    </span>
                </div>
            </div>

            {/* Unicorns */}
            {unicorns.map(u => u.alive && (
                <div
                    key={u.id}
                    ref={el => { if (el) unicornRefs.current.set(u.id, el); }}
                    className="absolute pointer-events-none select-none"
                    style={{
                        fontSize: `${u.size}px`,
                        filter: `hue-rotate(${u.hue}deg) drop-shadow(0 0 12px rgba(255,255,255,0.4))`,
                        willChange: 'transform',
                    }}
                >
                    🦄
                </div>
            ))}

            {/* Star particles */}
            {stars.map(star => (
                <div
                    key={star.id}
                    id={`star-${star.id}`}
                    className="absolute pointer-events-none select-none"
                    style={{
                        left: star.x,
                        top: star.y,
                        fontSize: '20px',
                        willChange: 'transform, opacity',
                    }}
                >
                    {star.emoji}
                </div>
            ))}
        </div>
    );
};

export default UnicornCelebration;
