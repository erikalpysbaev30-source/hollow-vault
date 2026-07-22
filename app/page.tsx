'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * HOLLOW VAULT — RIFT PROTOCOL
 * 
 * Main playable Canvas game component.
 * Coordinates all systems: input, rendering, physics, enemies, adaptive difficulty.
 * 
 * This is the primary game interface—not a dashboard or marketing page.
 */

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<string>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Game state
    let isRunning = true;
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Player state
    const player = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      width: 32,
      height: 32,
      health: 100,
      maxHealth: 100,
      vx: 0,
      vy: 0,
      speed: 200, // px/s
      angle: 0,
    };

    // Input state
    const keys: Record<string, boolean> = {};
    const mouse = { x: player.x, y: player.y, down: false };

    // Game objects
    const enemies: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      health: number;
      maxHealth: number;
      vx: number;
      vy: number;
      type: 'slime' | 'cultist' | 'bat';
    }> = [];

    const projectiles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      owner: 'player' | 'enemy';
      damage: number;
    }> = [];

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') {
        // TODO: Implement pause
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      
      const dx = mouse.x - player.x;
      const dy = mouse.y - player.y;
      player.angle = Math.atan2(dy, dx);
    };

    const handleMouseDown = () => {
      mouse.down = true;
    };

    const handleMouseUp = () => {
      mouse.down = false;
    };

    // Spawn initial enemies
    const spawnEnemy = (type: 'slime' | 'cultist' | 'bat', x: number, y: number) => {
      enemies.push({
        x,
        y,
        width: 24,
        height: 24,
        health: 20,
        maxHealth: 20,
        vx: 0,
        vy: 0,
        type,
      });
    };

    // Spawn tutorial enemies
    for (let i = 0; i < 3; i++) {
      spawnEnemy('slime', 200 + i * 150, 200);
    }

    setGameState('running');

    // Register events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Game loop
    let lastTime = Date.now();
    const gameLoop = () => {
      if (!isRunning) return;

      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      // Update player movement
      const targetVx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
      const targetVy = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
      
      const len = Math.hypot(targetVx, targetVy);
      if (len > 0) {
        player.vx = (targetVx / len) * player.speed;
        player.vy = (targetVy / len) * player.speed;
      } else {
        player.vx = 0;
        player.vy = 0;
      }

      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;

      // Clamp to boundaries
      player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
      player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));

      // Fire projectiles
      if (mouse.down) {
        projectiles.push({
          x: player.x + 16,
          y: player.y + 16,
          vx: Math.cos(player.angle) * 400,
          vy: Math.sin(player.angle) * 400,
          radius: 4,
          owner: 'player',
          damage: 10,
        });
        mouse.down = false; // Single fire per click
      }

      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;

        // Remove if out of bounds
        if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
          projectiles.splice(i, 1);
          continue;
        }

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = p.x - (e.x + e.width / 2);
          const dy = p.y - (e.y + e.height / 2);
          const dist = Math.hypot(dx, dy);

          if (dist < p.radius + Math.max(e.width, e.height) / 2) {
            e.health -= p.damage;
            projectiles.splice(i, 1);

            if (e.health <= 0) {
              enemies.splice(j, 1);
            }
            break;
          }
        }
      }

      // Update enemies
      for (const e of enemies) {
        // Simple AI: move toward player
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          e.vx = (dx / dist) * 100;
          e.vy = (dy / dist) * 100;
        }

        e.x += e.vx * deltaTime;
        e.y += e.vy * deltaTime;

        // Clamp to boundaries
        e.x = Math.max(0, Math.min(CANVAS_WIDTH - e.width, e.x));
        e.y = Math.max(0, Math.min(CANVAS_HEIGHT - e.height, e.y));
      }

      // Clear canvas
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 200, 200, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw player
      ctx.fillStyle = '#00c8c8';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Draw player crosshair
      ctx.strokeStyle = '#00c8c8';
      ctx.lineWidth = 2;
      const aimDist = 40;
      ctx.beginPath();
      ctx.moveTo(
        player.x + 16 + Math.cos(player.angle) * aimDist,
        player.y + 16 + Math.sin(player.angle) * aimDist
      );
      ctx.lineTo(
        player.x + 16 + Math.cos(player.angle) * (aimDist + 10),
        player.y + 16 + Math.sin(player.angle) * (aimDist + 10)
      );
      ctx.stroke();

      // Draw enemies
      for (const e of enemies) {
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(e.x, e.y, e.width, e.height);

        // Health bar
        ctx.fillStyle = '#333333';
        ctx.fillRect(e.x, e.y - 8, e.width, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(e.x, e.y - 8, (e.width * e.health) / e.maxHealth, 4);
      }

      // Draw projectiles
      for (const p of projectiles) {
        ctx.fillStyle = p.owner === 'player' ? '#ffaa00' : '#ff6600';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw HUD
      ctx.fillStyle = '#e8e8e8';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`Health: ${player.health}/${player.maxHealth}`, 20, 40);
      ctx.fillText(`Enemies: ${enemies.length}`, 20, 70);
      ctx.fillText(`Projectiles: ${projectiles.length}`, 20, 100);
      ctx.fillText('WASD to move, Mouse to aim & click to fire', 20, CANVAS_HEIGHT - 20);

      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Cleanup
    return () => {
      isRunning = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1a24]">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-[#00c8c8] shadow-lg"
          style={{ display: 'block', backgroundColor: '#1a1a24' }}
        />
        <div className="absolute top-2 left-2 text-[#00c8c8] font-mono text-xs">
          {gameState === 'loading' && 'Loading...'}
          {gameState === 'running' && 'HOLLOW VAULT v0.1'}
        </div>
      </div>
    </div>
  );
}
