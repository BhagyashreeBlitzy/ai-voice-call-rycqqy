import React, { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce'; // v4.17.21
import { AudioSettings as AudioSettingsType } from '../../types/settings.types';
import { useSettings } from '../../hooks/useSettings';
import { useAudio } from '../../hooks/useAudio';
import { Button } from '../shared/Button';
import { Tooltip } from '../shared/Tooltip';
import { AUDIO_PROCESSING_CONSTANTS } from '../../constants/audio.constants';

// Styled components for the audio settings panel
const SettingsContainer = styled.div`
  padding: var(--spacing-md);
  background: var(--background-paper);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-sm);
`;

const Label = styled.label`
  flex: 1;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
`;

const Slider = styled.input`
  flex: 2;
  width: 100%;
  height: 4px;
  background: var(--color-primary-light);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-primary-main);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }
  }
`;

const VolumeIndicator = styled.div<{ level: number }>`
  width: 60px;
  height: 8px;
  background: ${({ level }) => `
    linear-gradient(
      to right,
      var(--color-primary-main) ${level}%,
      var(--background-paper) ${level}%
    )
  `};
  border-radius: 4px;
  margin-left: var(--spacing-sm);
`;

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: var(--color-primary-main);
  }

  &:checked + span:before {
    transform: translateX(20px);
  }
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-secondary-light);
  transition: 0.2s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
  }
`;

interface AudioSettingsProps {
  className?: string;
  onError?: (error: Error) => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  className,
  onError
}) => {
  const { settings, updateAudioSettings } = useSettings();
  const { audioLevel, error: audioError } = useAudio();
  const [localSettings, setLocalSettings] = useState<AudioSettingsType>(settings.audio);

  // Handle volume changes with debouncing
  const handleVolumeChange = useCallback(
    debounce((type: 'inputVolume' | 'outputVolume', value: number) => {
      try {
        const newSettings = {
          ...localSettings,
          [type]: Math.max(0, Math.min(100, value))
        };
        setLocalSettings(newSettings);
        updateAudioSettings(newSettings);
      } catch (error) {
        onError?.(error as Error);
      }
    }, 100),
    [localSettings, updateAudioSettings]
  );

  // Handle noise reduction toggle
  const handleNoiseReductionToggle = useCallback(() => {
    try {
      const newSettings = {
        ...localSettings,
        noiseReduction: !localSettings.noiseReduction
      };
      setLocalSettings(newSettings);
      updateAudioSettings(newSettings);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [localSettings, updateAudioSettings]);

  // Handle audio processing errors
  useEffect(() => {
    if (audioError) {
      onError?.(audioError);
    }
  }, [audioError, onError]);

  return (
    <SettingsContainer className={className}>
      <SettingRow>
        <Label htmlFor="input-volume">
          Input Volume
          <Tooltip content="Adjust microphone input level">
            <span aria-hidden="true"> ⓘ</span>
          </Tooltip>
        </Label>
        <Slider
          id="input-volume"
          type="range"
          min="0"
          max="100"
          value={localSettings.inputVolume}
          onChange={(e) => handleVolumeChange('inputVolume', Number(e.target.value))}
          aria-label="Input Volume"
        />
        <VolumeIndicator level={audioLevel.rms} />
      </SettingRow>

      <SettingRow>
        <Label htmlFor="output-volume">
          Output Volume
          <Tooltip content="Adjust speaker output level">
            <span aria-hidden="true"> ⓘ</span>
          </Tooltip>
        </Label>
        <Slider
          id="output-volume"
          type="range"
          min="0"
          max="100"
          value={localSettings.outputVolume}
          onChange={(e) => handleVolumeChange('outputVolume', Number(e.target.value))}
          aria-label="Output Volume"
        />
        <VolumeIndicator level={localSettings.outputVolume} />
      </SettingRow>

      <SettingRow>
        <Label htmlFor="noise-reduction">
          Noise Reduction
          <Tooltip content="Reduce background noise during voice capture">
            <span aria-hidden="true"> ⓘ</span>
          </Tooltip>
        </Label>
        <Switch>
          <SwitchInput
            id="noise-reduction"
            type="checkbox"
            checked={localSettings.noiseReduction}
            onChange={handleNoiseReductionToggle}
            aria-label="Toggle Noise Reduction"
          />
          <SwitchSlider />
        </Switch>
      </SettingRow>

      <SettingRow>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setLocalSettings({
              ...localSettings,
              config: {
                ...AUDIO_PROCESSING_CONSTANTS,
                sampleRate: 16000,
                frameSize: 20,
                bitDepth: 16,
                channels: 1
              }
            });
          }}
          aria-label="Reset Audio Settings"
        >
          Reset to Defaults
        </Button>
      </SettingRow>
    </SettingsContainer>
  );
};

export default AudioSettings;