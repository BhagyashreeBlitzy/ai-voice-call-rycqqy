import React, { useRef, useEffect } from 'react';
import { useAudio } from '../../hooks/useAudio';
import type { AudioVisualizerConfig } from '../../types/audio.types';

// Constants for visualization
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 150;
const DEFAULT_COLOR = '#2196F3';
const ANIMATION_FPS = 60;
const MIN_DECIBELS = -90;
const MAX_DECIBELS = -10;
const SMOOTHING_TIME_CONSTANT = 0.8;
const DEVICE_PIXEL_RATIO = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

interface WaveformVisualizerProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
  theme?: 'light' | 'dark';
}

/**
 * Component that provides real-time visualization of audio waveform data
 * using HTML5 Canvas with optimized performance and accessibility support.
 */
const WaveformVisualizer: React.FC<WaveformVisualizerProps> = React.memo(({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className = '',
  color = DEFAULT_COLOR,
  theme = 'light'
}) => {
  // Refs for canvas and animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  // Get audio state from hook
  const { audioLevel, isRecording, error } = useAudio();

  /**
   * Initialize canvas context with proper scaling for high DPI displays
   */
  const initializeCanvas = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    // Scale canvas for high DPI displays
    ctx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO);
    canvas.width = width * DEVICE_PIXEL_RATIO;
    canvas.height = height * DEVICE_PIXEL_RATIO;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Configure canvas for optimal rendering
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';

    return ctx;
  };

  /**
   * Draw waveform on canvas using double buffering for smooth animation
   */
  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    level: { rms: number; peak: number; clipping: boolean },
    isError: boolean
  ): void => {
    const { rms, peak, clipping } = level;
    
    // Clear canvas with proper scaling
    ctx.clearRect(0, 0, width * DEVICE_PIXEL_RATIO, height * DEVICE_PIXEL_RATIO);

    // Calculate visualization parameters
    const centerY = height / 2;
    const scaledRMS = Math.max(0, (rms - MIN_DECIBELS) / (MAX_DECIBELS - MIN_DECIBELS));
    const amplitude = centerY * scaledRMS;

    // Start drawing path
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    // Generate smooth waveform points
    const points = 100;
    for (let i = 0; i < points; i++) {
      const x = (width * i) / points;
      const normalized = i / points * Math.PI * 2;
      const y = centerY + Math.sin(normalized) * amplitude;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Configure stroke style based on state
    ctx.lineWidth = 2 * DEVICE_PIXEL_RATIO;
    if (isError) {
      ctx.strokeStyle = '#f44336'; // Error state
    } else if (clipping) {
      ctx.strokeStyle = '#ff9800'; // Clipping warning
    } else {
      ctx.strokeStyle = color;
    }

    // Apply smoothing and draw
    ctx.stroke();

    // Draw peak indicator
    if (peak > MIN_DECIBELS) {
      const peakY = centerY * (1 - (peak - MIN_DECIBELS) / (MAX_DECIBELS - MIN_DECIBELS));
      ctx.beginPath();
      ctx.moveTo(0, peakY);
      ctx.lineTo(width, peakY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.stroke();
    }
  };

  /**
   * Manage animation frame updates with performance optimization
   */
  const animateWaveform = (timestamp: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Maintain consistent frame rate
    const elapsed = timestamp - lastFrameTimeRef.current;
    if (elapsed < (1000 / ANIMATION_FPS)) {
      animationFrameRef.current = requestAnimationFrame(animateWaveform);
      return;
    }

    lastFrameTimeRef.current = timestamp;

    // Draw frame
    drawWaveform(ctx, audioLevel, !!error);

    // Schedule next frame if recording
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(animateWaveform);
    }
  };

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = initializeCanvas(canvas);
    if (!ctx) return;

    // Start animation if recording
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(animateWaveform);
    }

    // Cleanup animation on unmount or recording state change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`waveform-visualizer ${className}`}
      role="img"
      aria-label="Audio waveform visualization"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
      }}
    />
  );
});

WaveformVisualizer.displayName = 'WaveformVisualizer';

export default WaveformVisualizer;