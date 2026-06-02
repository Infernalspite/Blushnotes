/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

export interface SakuraConfig {
  enabled: boolean;
  count: 'low' | 'medium' | 'high' | 'storm';
  speed: 'gentle' | 'breeze' | 'gust';
  wind: 'calm' | 'left' | 'right';
  style: 'classic' | 'glow' | 'outline' | 'flower';
}

interface SakuraCanvasProps {
  themeId: string;
  config: SakuraConfig;
}

interface Petal {
  x: number;
  y: number;
  r: number; // size/radius
  d: number; // density/weight (falling speed offset)
  angle: number; // current rotation angle
  angleSpeed: number; // speed of rotation
  swaySpeed: number; // speed of sway oscillation
  swayOffset: number; // phase offset for sway sin wave
  swayAmplitude: number; // max sway distance
  color: string;
}

export default function SakuraCanvas({ themeId, config }: SakuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map settings to numerical values
  const getPetalCount = (val: string) => {
    switch (val) {
      case 'low': return 25;
      case 'medium': return 50;
      case 'high': return 90;
      case 'storm': return 160;
      default: return 50;
    }
  };

  const getSpeedMultiplier = (val: string) => {
    switch (val) {
      case 'gentle': return 0.8;
      case 'breeze': return 1.5;
      case 'gust': return 2.6;
      default: return 1.5;
    }
  };

  const getWindValue = (val: string) => {
    switch (val) {
      case 'left': return -0.6;
      case 'right': return 0.6;
      default: return 0.0;
    }
  };

  // Get color palette for petals matching the selected theme style
  const getPetalColors = (id: string): string[] => {
    switch (id) {
      case 'strawberry-gelato':
        return [
          'rgba(255, 77, 109, 0.75)',  // bright strawberry
          'rgba(255, 117, 143, 0.7)',  // soft gelato rose
          'rgba(255, 133, 161, 0.65)', // strawberry cream
          'rgba(255, 178, 191, 0.8)'   // milky pink
        ];
      case 'rose-quartz':
        return [
          'rgba(176, 125, 98, 0.7)',   // terracotta rose
          'rgba(212, 163, 115, 0.65)',  // earthy sand / gold quartz
          'rgba(230, 204, 190, 0.75)', // warm peach clay
          'rgba(240, 222, 212, 0.8)'   // linen rose
        ];
      case 'magenta-twilight':
        return [
          'rgba(244, 63, 94, 0.85)',   // neon rose magenta
          'rgba(217, 70, 239, 0.8)',   // electric amethyst
          'rgba(244, 114, 182, 0.75)',  // glowing neon pink
          'rgba(253, 242, 248, 0.9)'   // pearlescent white-pink
        ];
      case 'bubblegum-pop':
        return [
          'rgba(217, 70, 239, 0.8)',   // hot orchid
          'rgba(192, 38, 211, 0.75)',  // retro bubblegum grape
          'rgba(232, 121, 249, 0.8)',  // poppy cool pink
          'rgba(250, 204, 21, 0.5)'    // a tiny glittery yellow spark
        ];
      case 'sakura-breeze':
      default:
        return [
          'rgba(244, 114, 182, 0.7)',  // classic sakura pink
          'rgba(251, 207, 232, 0.75)', // soft cherry blossom
          'rgba(252, 231, 243, 0.8)',  // delicate blossom petal
          'rgba(254, 243, 247, 0.85)'  // pure blossom cream
        ];
    }
  };

  useEffect(() => {
    if (!config.enabled) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Handle Resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = getPetalColors(themeId);
    const count = getPetalCount(config.count);
    const speedMult = getSpeedMultiplier(config.speed);
    const windVal = getWindValue(config.wind);
    const style = config.style;

    const petals: Petal[] = [];

    // Initialize petals array
    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height - height, // start offscreen or scattered initially
        r: Math.random() * 8 + 6, // radius between 6 and 14
        d: Math.random() * 0.8 + 0.4, // speed density offset
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() * 0.02 - 0.01) * speedMult,
        swaySpeed: Math.random() * 0.015 + 0.005,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: Math.random() * 20 + 10,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Drawing a single classical cherry blossom petal
    const drawPetalPath = (c: CanvasRenderingContext2D, r: number) => {
      c.beginPath();
      c.moveTo(0, 0);
      // Beautiful heart indented cherry blossom petal
      c.bezierCurveTo(-r, -r / 2, -r, r, 0, r * 1.5);
      c.bezierCurveTo(r, r, r, -r / 2, 0, 0);

      // Create a small line of texture down the middle
      c.moveTo(0, r * 0.2);
      c.lineTo(0, r * 0.9);
      c.fillStyle = 'rgba(255, 255, 255, 0.15)';
    };

    // Draw full 5-petal sakura flower
    const drawFlowerPath = (c: CanvasRenderingContext2D, r: number) => {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const branchAngle = (i * 2 * Math.PI) / 5;
        c.save();
        c.rotate(branchAngle);
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(-r / 2, -r / 2, -r / 2, r, 0, r * 1.2);
        c.bezierCurveTo(r / 2, r, r / 2, -r / 2, 0, 0);
        c.fill();
        c.restore();
      }

      // Draw center stamen dots
      c.beginPath();
      c.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      c.fillStyle = '#FFFFFF';
      c.fill();

      for (let i = 0; i < 5; i++) {
        const dotAngle = (i * 2 * Math.PI) / 5;
        const x = Math.cos(dotAngle) * r * 0.35;
        const y = Math.sin(dotAngle) * r * 0.35;
        c.beginPath();
        c.arc(x, y, 1, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, 0.7)';
        c.fill();
      }
    };

    // Main animation loop
    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // Update physics
        p.y += (1.2 + p.d) * speedMult;
        p.x += windVal * speedMult + Math.sin(p.swayOffset) * 0.45;
        p.swayOffset += p.swaySpeed;
        p.angle += p.angleSpeed;

        // Reset if goes off screen
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
          p.d = Math.random() * 0.8 + 0.4;
          p.angle = Math.random() * Math.PI * 2;
        }

        if (p.x > width + 20) {
          p.x = -20;
        } else if (p.x < -20) {
          p.x = width + 20;
        }

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Apply visual style
        if (style === 'glow') {
          ctx.shadowBlur = p.r * 0.8;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = p.color;
        } else if (style === 'outline') {
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = p.color;
        }

        // Output correct shape
        if (style === 'flower') {
          drawFlowerPath(ctx, p.r * 0.75);
        } else {
          drawPetalPath(ctx, p.r);
        }

        // Action the filling/stroking
        if (style === 'outline') {
          ctx.stroke();
        } else {
          ctx.fill();
        }

        ctx.restore();
      }

      animationId = requestAnimationFrame(tick);
    };

    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeId, config]);

  if (!config.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}
