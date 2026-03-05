import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';

interface UnicornCelebrationProps {
    onDismiss: () => void;
}

interface Unicorn {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hue: number;
    alive: boolean;
    rotation: number;
}

interface TrailPoint {
    x: number;
    y: number;
    age: number;
}

const UNICORN_COUNT = 10;
const TIME_LIMIT = 10;
const HIT_RADIUS = 50;
const TRAIL_LIFETIME = 12; // frames

const UnicornCelebration = ({ onDismiss }: UnicornCelebrationProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const unicornsRef = useRef<Unicorn[]>([]);
    const trailRef = useRef<TrailPoint[]>([]);
    const burstCountRef = useRef(0);
    const timeLeftRef = useRef(TIME_LIMIT);
    const dismissedRef = useRef(false);
    const animFrameRef = useRef(0);
    const lastTimeRef = useRef(0);
    const isSwipingRef = useRef(false);
    const starsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; emoji: string; size: number }[]>([]);
    const victoryRef = useRef(false);
    const victoryTimeRef = useRef(0);
    const rainbowRingsRef = useRef<{ radius: number; alpha: number; hue: number }[]>([]);

    const STAR_EMOJIS = ['⭐', '✨', '🌟', '💫', '⚡', '🌈'];

    const handleDismiss = useCallback(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;
        cancelAnimationFrame(animFrameRef.current);
        if (overlayRef.current) {
            gsap.to(overlayRef.current, {
                opacity: 0, duration: 0.4, ease: 'power2.in',
                onComplete: onDismiss
            });
        } else {
            onDismiss();
        }
    }, [onDismiss]);

    // Initialize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        canvas.width = vw * dpr;
        canvas.height = vh * dpr;
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);

        // Create unicorns
        unicornsRef.current = Array.from({ length: UNICORN_COUNT }, (_, i) => ({
            id: i,
            x: 60 + Math.random() * (vw - 120),
            y: 160 + Math.random() * (vh - 280),
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: 42 + Math.random() * 18,
            hue: Math.random() * 360,
            alive: true,
            rotation: Math.random() * 360,
        }));

        lastTimeRef.current = performance.now();

        // Entrance
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });

        // Main game loop
        const loop = (now: number) => {
            const dt = Math.min((now - lastTimeRef.current) / 16.67, 3);
            lastTimeRef.current = now;

            // Victory phase
            if (victoryRef.current) {
                victoryTimeRef.current += dt;
                ctx.clearRect(0, 0, vw, vh);

                // Expanding rainbow rings from center
                const cx = vw / 2;
                const cy = vh / 2;
                rainbowRingsRef.current.forEach(ring => {
                    ring.radius += 4 * dt;
                    ring.alpha = Math.max(0, ring.alpha - 0.008 * dt);
                });
                // Spawn new rings
                if (victoryTimeRef.current % 3 < dt) {
                    rainbowRingsRef.current.push(
                        { radius: 0, alpha: 0.7, hue: Math.random() * 360 }
                    );
                }
                rainbowRingsRef.current = rainbowRingsRef.current.filter(r => r.alpha > 0.01);

                // Draw rings
                rainbowRingsRef.current.forEach(ring => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `hsla(${ring.hue}, 100%, 65%, ${ring.alpha})`;
                    ctx.lineWidth = 6 + ring.radius * 0.02;
                    ctx.shadowColor = `hsla(${ring.hue}, 100%, 65%, ${ring.alpha})`;
                    ctx.shadowBlur = 30;
                    ctx.stroke();
                    ctx.restore();
                });

                // Full-screen rainbow gradient pulse
                const pulseAlpha = Math.sin(victoryTimeRef.current * 0.5) * 0.15 + 0.1;
                const rainbowGrad = ctx.createConicGradient(victoryTimeRef.current * 0.1, cx, cy);
                rainbowGrad.addColorStop(0, `rgba(255,0,0,${pulseAlpha})`);
                rainbowGrad.addColorStop(0.16, `rgba(255,165,0,${pulseAlpha})`);
                rainbowGrad.addColorStop(0.33, `rgba(255,255,0,${pulseAlpha})`);
                rainbowGrad.addColorStop(0.5, `rgba(0,255,0,${pulseAlpha})`);
                rainbowGrad.addColorStop(0.66, `rgba(0,100,255,${pulseAlpha})`);
                rainbowGrad.addColorStop(0.83, `rgba(150,0,255,${pulseAlpha})`);
                rainbowGrad.addColorStop(1, `rgba(255,0,0,${pulseAlpha})`);
                ctx.fillStyle = rainbowGrad;
                ctx.fillRect(0, 0, vw, vh);

                // Draw victory particles
                starsRef.current = starsRef.current.filter(s => {
                    s.x += s.vx * dt;
                    s.y += s.vy * dt;
                    s.vy += 0.08 * dt;
                    s.life -= dt * 0.7;
                    if (s.life <= 0) return false;
                    const alpha = Math.max(0, s.life / 40);
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.font = `${s.size}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(s.emoji, s.x, s.y);
                    ctx.restore();
                    return true;
                });

                // PERFECT! text
                const textScale = Math.min(1, victoryTimeRef.current / 8);
                const bounce = 1 + Math.sin(victoryTimeRef.current * 0.8) * 0.05;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${56 * textScale * bounce}px system-ui, sans-serif`;
                // Rainbow text
                const txtGrad = ctx.createLinearGradient(cx - 120, cy, cx + 120, cy);
                txtGrad.addColorStop(0, '#ff0000');
                txtGrad.addColorStop(0.2, '#ff8800');
                txtGrad.addColorStop(0.4, '#ffff00');
                txtGrad.addColorStop(0.6, '#00ff00');
                txtGrad.addColorStop(0.8, '#0088ff');
                txtGrad.addColorStop(1, '#aa00ff');
                ctx.fillStyle = txtGrad;
                ctx.shadowColor = 'rgba(255,255,255,0.8)';
                ctx.shadowBlur = 25;
                ctx.fillText('🌈 PERFECT! 🌈', cx, cy - 20);
                ctx.font = 'bold 18px system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.shadowBlur = 0;
                ctx.fillText(`All ${UNICORN_COUNT} sliced!`, cx, cy + 30);
                ctx.restore();

                // Auto-dismiss after 2.5 seconds of victory
                if (victoryTimeRef.current > 2.5 * 60 / 16.67) {
                    // ~2.5 seconds worth of frames
                    if (!dismissedRef.current) handleDismiss();
                    return;
                }

                animFrameRef.current = requestAnimationFrame(loop);
                return;
            }

            // Timer
            timeLeftRef.current -= dt / 60;
            if (timeLeftRef.current <= 0 && !dismissedRef.current) {
                handleDismiss();
                return;
            }

            ctx.clearRect(0, 0, vw, vh);

            // Draw timer bar
            const timerPct = Math.max(0, timeLeftRef.current / TIME_LIMIT);
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(0, 0, vw, 5);
            const grad = ctx.createLinearGradient(0, 0, vw * timerPct, 0);
            if (timerPct > 0.3) {
                grad.addColorStop(0, '#a855f7');
                grad.addColorStop(1, '#ec4899');
            } else {
                grad.addColorStop(0, '#ef4444');
                grad.addColorStop(1, '#f97316');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(0, 0, vw * timerPct, 5, [0, 4, 4, 0]);
            ctx.fill();
            ctx.restore();

            // Draw heading
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillText('', 0, 0); // force font load
            ctx.font = '52px serif';
            ctx.fillText('🏆', vw / 2, 70);
            ctx.font = 'bold 26px system-ui, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.letterSpacing = '3px';
            ctx.fillText('GOALS CRUSHED!', vw / 2, 110);
            ctx.font = '12px system-ui, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillText(`SLICE THE UNICORNS!  ${Math.ceil(Math.max(0, timeLeftRef.current))}s`, vw / 2, 132);
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(`${burstCountRef.current} / ${UNICORN_COUNT}`, vw / 2, 156);
            ctx.restore();

            // Update & draw unicorns
            unicornsRef.current.forEach(u => {
                if (!u.alive) return;

                u.x += u.vx * dt;
                u.y += u.vy * dt;
                u.rotation += dt * 2;

                // Bounce
                if (u.x < 30 || u.x > vw - 30) { u.vx *= -1; u.x = Math.max(30, Math.min(vw - 30, u.x)); }
                if (u.y < 120 || u.y > vh - 60) { u.vy *= -1; u.y = Math.max(120, Math.min(vh - 60, u.y)); }

                // Random wobble
                u.vx += (Math.random() - 0.5) * 0.15;
                u.vy += (Math.random() - 0.5) * 0.15;
                const speed = Math.sqrt(u.vx ** 2 + u.vy ** 2);
                if (speed > 3) { u.vx *= 3 / speed; u.vy *= 3 / speed; }

                // Draw glow
                ctx.save();
                ctx.shadowColor = `hsl(${u.hue}, 100%, 70%)`;
                ctx.shadowBlur = 20;
                ctx.font = `${u.size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.translate(u.x, u.y);
                ctx.rotate((u.rotation * Math.PI) / 180);
                ctx.fillText('🦄', 0, 0);
                ctx.restore();
            });

            // Update & draw swipe trail
            trailRef.current = trailRef.current
                .map(p => ({ ...p, age: p.age + 1 }))
                .filter(p => p.age < TRAIL_LIFETIME);

            if (trailRef.current.length > 1) {
                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let i = 1; i < trailRef.current.length; i++) {
                    const p0 = trailRef.current[i - 1];
                    const p1 = trailRef.current[i];
                    const alpha = Math.max(0, 1 - p1.age / TRAIL_LIFETIME);
                    const width = Math.max(1, (1 - p1.age / TRAIL_LIFETIME) * 8);

                    ctx.beginPath();
                    ctx.moveTo(p0.x, p0.y);
                    ctx.lineTo(p1.x, p1.y);

                    // Glowing blade effect
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
                    ctx.lineWidth = width;
                    ctx.stroke();

                    ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.6})`;
                    ctx.lineWidth = width + 4;
                    ctx.stroke();

                    ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.3})`;
                    ctx.lineWidth = width + 10;
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Update & draw star particles
            starsRef.current = starsRef.current.filter(s => {
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vy += 0.15 * dt; // gravity
                s.life -= dt;

                if (s.life <= 0) return false;

                const alpha = Math.max(0, s.life / 30);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `${s.size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(s.emoji, s.x, s.y);
                ctx.restore();
                return true;
            });

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [handleDismiss]);

    // AGGRESSIVE scroll/touch prevention — native listeners
    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;

        const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };

        // Capture phase to intercept before anything else
        document.addEventListener('touchstart', stop, { passive: false, capture: true });
        document.addEventListener('touchmove', stop, { passive: false, capture: true });
        document.addEventListener('touchend', stop, { passive: false, capture: true });
        document.addEventListener('wheel', stop, { passive: false, capture: true });

        const html = document.documentElement;
        const body = document.body;
        const prevOverflowH = html.style.overflow;
        const prevOverflowB = body.style.overflow;
        const prevTouchH = html.style.touchAction;
        const prevTouchB = body.style.touchAction;
        const prevHeight = body.style.height;
        const prevPosition = body.style.position;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        html.style.touchAction = 'none';
        body.style.touchAction = 'none';
        body.style.height = '100vh';
        body.style.position = 'fixed';

        return () => {
            document.removeEventListener('touchstart', stop, { capture: true } as any);
            document.removeEventListener('touchmove', stop, { capture: true } as any);
            document.removeEventListener('touchend', stop, { capture: true } as any);
            document.removeEventListener('wheel', stop, { capture: true } as any);
            html.style.overflow = prevOverflowH;
            body.style.overflow = prevOverflowB;
            html.style.touchAction = prevTouchH;
            body.style.touchAction = prevTouchB;
            body.style.height = prevHeight;
            body.style.position = prevPosition;
        };
    }, []);

    // Swipe input — native pointer events on the canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const trySlice = (px: number, py: number) => {
            unicornsRef.current.forEach(u => {
                if (!u.alive) return;
                const dx = px - u.x;
                const dy = py - u.y;
                if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS + u.size / 2) {
                    u.alive = false;
                    burstCountRef.current++;

                    // Spawn star particles
                    const count = 10 + Math.floor(Math.random() * 6);
                    for (let i = 0; i < count; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 2 + Math.random() * 5;
                        starsRef.current.push({
                            x: u.x,
                            y: u.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed - 2,
                            life: 20 + Math.random() * 15,
                            emoji: STAR_EMOJIS[Math.floor(Math.random() * STAR_EMOJIS.length)],
                            size: 16 + Math.random() * 16,
                        });
                    }

                    // Check win
                    if (burstCountRef.current >= UNICORN_COUNT && !victoryRef.current) {
                        victoryRef.current = true;
                        victoryTimeRef.current = 0;
                        // Spawn massive rainbow particle explosion
                        const cx = window.innerWidth / 2;
                        const cy = window.innerHeight / 2;
                        for (let i = 0; i < 60; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 3 + Math.random() * 8;
                            starsRef.current.push({
                                x: cx + (Math.random() - 0.5) * 100,
                                y: cy + (Math.random() - 0.5) * 100,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed - 3,
                                life: 30 + Math.random() * 25,
                                emoji: ['🌈', '⭐', '✨', '🦄', '💫', '🌟', '🎉', '🏆'][Math.floor(Math.random() * 8)],
                                size: 20 + Math.random() * 28,
                            });
                        }
                        // Spawn initial rainbow rings
                        for (let i = 0; i < 6; i++) {
                            rainbowRingsRef.current.push(
                                { radius: i * 15, alpha: 0.8, hue: i * 60 }
                            );
                        }
                    }
                }
            });
        };

        const onDown = (e: PointerEvent) => {
            e.preventDefault();
            isSwipingRef.current = true;
            trailRef.current = [{ x: e.clientX, y: e.clientY, age: 0 }];
            trySlice(e.clientX, e.clientY);
        };

        const onMove = (e: PointerEvent) => {
            e.preventDefault();
            if (!isSwipingRef.current) return;
            trailRef.current.push({ x: e.clientX, y: e.clientY, age: 0 });
            trySlice(e.clientX, e.clientY);
        };

        const onUp = (e: PointerEvent) => {
            e.preventDefault();
            isSwipingRef.current = false;
        };

        canvas.addEventListener('pointerdown', onDown, { passive: false });
        canvas.addEventListener('pointermove', onMove, { passive: false });
        canvas.addEventListener('pointerup', onUp, { passive: false });
        canvas.addEventListener('pointercancel', onUp, { passive: false });

        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
        };
    }, [handleDismiss]);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[100]"
            style={{
                touchAction: 'none',
                overscrollBehavior: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at center, rgba(88,28,135,0.96) 0%, rgba(15,23,42,0.98) 100%)' }}
            />

            {/* Game canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-[101]"
                style={{ touchAction: 'none' }}
            />

            {/* Skip button — above canvas */}
            <button
                onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                className="absolute top-4 right-4 z-[110] bg-white/10 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/20 rounded-full p-2.5 transition-all active:scale-90"
                style={{ touchAction: 'manipulation' }}
            >
                <X size={20} />
            </button>
        </div>
    );
};

export default UnicornCelebration;
