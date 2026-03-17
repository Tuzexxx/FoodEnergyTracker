import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

interface GlitterCelebrationProps {
    onDismiss: () => void;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    vRotation: number;
    hue: number;
    opacity: number;
    life: number;
}

const GlitterCelebration = ({ onDismiss }: GlitterCelebrationProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animFrameRef = useRef(0);
    const startTimeRef = useRef(0);
    const DURATION = 4000; // 4 seconds

    const createParticle = useCallback((side: 'left' | 'right', width: number, height: number) => {
        const x = side === 'left' ? -20 : width + 20;
        const y = height * 0.4 + Math.random() * (height * 0.4);
        
        // Aim towards the center and slightly up
        const angle = side === 'left' 
            ? (Math.random() * -60 - 10) * (Math.PI / 180) 
            : (Math.random() * 60 + 190) * (Math.PI / 180);
            
        const force = 15 + Math.random() * 25;

        return {
            x,
            y,
            vx: Math.cos(angle) * force,
            vy: Math.sin(angle) * force,
            size: 4 + Math.random() * 8,
            rotation: Math.random() * 360,
            vRotation: (Math.random() - 0.5) * 15,
            hue: Math.random() * 60 + 20, // Golds and yellows
            opacity: 1,
            life: 1
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        
        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };

        window.addEventListener('resize', resize);
        resize();

        startTimeRef.current = performance.now();

        // Initial burst
        for (let i = 0; i < 80; i++) {
            particlesRef.current.push(createParticle('left', window.innerWidth, window.innerHeight));
            particlesRef.current.push(createParticle('right', window.innerWidth, window.innerHeight));
        }

        const loop = (time: number) => {
            const elapsed = time - startTimeRef.current;
            
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // Spawn fewer over time
            if (elapsed < 1500 && Math.random() > 0.4) {
                 particlesRef.current.push(createParticle('left', window.innerWidth, window.innerHeight));
                 particlesRef.current.push(createParticle('right', window.innerWidth, window.innerHeight));
            }

            particlesRef.current = particlesRef.current.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.4; // gravity
                p.vx *= 0.98; // air resistance
                p.rotation += p.vRotation;
                p.life -= 0.01;
                
                if (p.life <= 0 || p.y > window.innerHeight + 20) return false;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.globalAlpha = p.life * p.opacity;
                
                // Draw a small diamond/glitter shape
                ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
                
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.lineTo(p.size / 2, 0);
                ctx.lineTo(0, p.size);
                ctx.lineTo(-p.size / 2, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                return true;
            });

            if (elapsed < DURATION || particlesRef.current.length > 0) {
                animFrameRef.current = requestAnimationFrame(loop);
            } else {
                gsap.to(containerRef.current, {
                    opacity: 0,
                    duration: 0.5,
                    onComplete: onDismiss
                });
            }
        };

        animFrameRef.current = requestAnimationFrame(loop);

        gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [onDismiss, createParticle]);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ touchAction: 'none' }}
        >
            <canvas ref={canvasRef} className="absolute inset-0" />
            
            {/* Visual feedback text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="font-drama text-5xl text-brutal-black mb-2 animate-in zoom-in duration-700">
                    LEGENDARY!
                </div>
                <div className="font-sans text-xs uppercase tracking-[0.3em] text-brutal-black/40">
                    Goals smashed yesterday
                </div>
            </div>
        </div>
    );
};

export default GlitterCelebration;
