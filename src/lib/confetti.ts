import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.7 },
    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
  });
}
