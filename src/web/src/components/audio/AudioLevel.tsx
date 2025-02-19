/**
 * AudioLevel Component
 * Provides sophisticated real-time visualization of audio input levels with
 * dynamic color indicators, threshold markers, and accessibility features.
 * @packageDocumentation
 * @version 1.0.0
 */

// External imports - React v18.2.0
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
// External imports - @emotion/styled v11.11.0
import styled from '@emotion/styled';

// Internal imports
import { AudioLevel } from '../../types/audio.types';
import { VOICE_ACTIVITY_CONSTANTS } from '../../constants/audio.constants';

// Styled components with enhanced animations
const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
  border-radius: 4px;
  overflow: hidden;
`;

const LevelIndicator = styled.div<{ level: number; isClipping: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: ${props => Math.max(0, Math.min(100, (props.level + 90) / 90 * 100))}%;
  background: ${props => getColorForLevel(props.level, props.isClipping)};
  transition: height 0.05s ease-out, background-color 0.2s ease;
  will-change: height, background-color;
`;

const ThresholdMarker = styled.div<{ position: number }>`
  position: absolute;
  bottom: ${props => Math.max(0, Math.min(100, (props.position + 90) / 90 * 100))}%;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.3);
  &::after {
    content: '${props => props.position}dB';
    position: absolute;
    right: 4px;
    top: -8px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const PeakIndicator = styled.div<{ level: number }>`
  position: absolute;
  bottom: ${props => Math.max(0, Math.min(100, (props.level + 90) / 90 * 100))}%;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: rgba(255, 255, 255, 0.5);
  transition: bottom 0.1s ease-out;
`;

interface AudioLevelProps {
  audioLevel: AudioLevel;
  isActive?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Gets appropriate color for current audio level with smooth transitions
 */
const getColorForLevel = (level: number, isClipping: boolean): string => {
  if (isClipping) {
    return 'rgba(255, 0, 0, 0.8)';
  }
  
  if (level > -6) {
    return 'rgba(255, 215, 0, 0.8)'; // Yellow for high levels
  }
  
  if (level > VOICE_ACTIVITY_CONSTANTS.VAD_THRESHOLD_DB) {
    return 'rgba(0, 255, 0, 0.8)'; // Green for normal levels
  }
  
  return 'rgba(128, 128, 128, 0.8)'; // Gray for low levels
};

/**
 * AudioLevel Component
 * Provides real-time visualization of audio input levels
 */
export const AudioLevel: React.FC<AudioLevelProps> = ({
  audioLevel,
  isActive = true,
  width = 20,
  height = 100,
  className
}) => {
  const peakRef = useRef<number>(-Infinity);
  const peakDecayTimer = useRef<number>();

  // Memoize threshold markers
  const thresholdMarkers = useMemo(() => [
    { level: 0, label: '0dB' },
    { level: -6, label: '-6dB' },
    { level: VOICE_ACTIVITY_CONSTANTS.VAD_THRESHOLD_DB, label: 'VAD' },
    { level: VOICE_ACTIVITY_CONSTANTS.NOISE_FLOOR_DB, label: 'Noise' }
  ], []);

  // Handle peak level decay
  const updatePeakLevel = useCallback(() => {
    if (peakRef.current > -Infinity) {
      peakRef.current = Math.max(peakRef.current - 0.5, -90);
      peakDecayTimer.current = requestAnimationFrame(updatePeakLevel);
    }
  }, []);

  // Update peak level
  useEffect(() => {
    if (audioLevel.peak > peakRef.current) {
      peakRef.current = audioLevel.peak;
    }
    
    if (!peakDecayTimer.current) {
      peakDecayTimer.current = requestAnimationFrame(updatePeakLevel);
    }

    return () => {
      if (peakDecayTimer.current) {
        cancelAnimationFrame(peakDecayTimer.current);
      }
    };
  }, [audioLevel.peak, updatePeakLevel]);

  return (
    <Container
      style={{ width, height }}
      className={className}
      role="meter"
      aria-label="Audio level"
      aria-valuemin={-90}
      aria-valuemax={0}
      aria-valuenow={Math.round(audioLevel.rms)}
    >
      {isActive && (
        <>
          {thresholdMarkers.map(marker => (
            <ThresholdMarker
              key={marker.level}
              position={marker.level}
              aria-label={`${marker.label} threshold`}
            />
          ))}
          <LevelIndicator
            level={audioLevel.rms}
            isClipping={audioLevel.clipping}
            aria-hidden="true"
          />
          <PeakIndicator
            level={peakRef.current}
            aria-label={`Peak level ${Math.round(peakRef.current)}dB`}
          />
        </>
      )}
    </Container>
  );
};

export default AudioLevel;