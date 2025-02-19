/**
 * VoiceSettings Component
 * Provides a comprehensive interface for managing voice synthesis settings
 * with real-time preview capabilities and enhanced accessibility
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Select, 
  MenuItem, 
  Slider, 
  FormControl,
  InputLabel,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import debounce from 'lodash/debounce'; // v4.17.21

import { VoiceId, VoiceMetadata, VoiceSynthesisOptions } from '../../types/voice.types';
import { useSettings } from '../../hooks/useSettings';
import { voiceService } from '../../services/voice.service';
import { VOICE_SYNTHESIS_CONFIG } from '../../constants/voice.constants';

const VoiceSettings: React.FC = () => {
  // State management
  const [availableVoices, setAvailableVoices] = useState<VoiceMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const { settings, updateVoiceSettings } = useSettings();

  // Local state for voice parameters
  const [voiceParams, setVoiceParams] = useState<VoiceSynthesisOptions>({
    voiceId: settings.voice.config.currentVoiceId || VoiceId.FEMALE_1,
    speakingRate: VOICE_SYNTHESIS_CONFIG.DEFAULT_RATE,
    pitch: VOICE_SYNTHESIS_CONFIG.DEFAULT_PITCH,
    volume: VOICE_SYNTHESIS_CONFIG.DEFAULT_VOLUME
  });

  // Load available voices on component mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        const voices = await voiceService.getAvailableVoices();
        setAvailableVoices(voices);
        setError(null);
      } catch (err) {
        setError('Failed to load available voices');
        console.error('Voice loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();
  }, []);

  // Handle voice selection change
  const handleVoiceChange = async (event: React.ChangeEvent<{ value: unknown }>) => {
    const newVoiceId = event.target.value as VoiceId;
    try {
      setIsLoading(true);
      await voiceService.setVoice(newVoiceId);
      
      setVoiceParams(prev => ({
        ...prev,
        voiceId: newVoiceId
      }));

      await updateVoiceSettings({
        ...settings.voice,
        config: {
          ...settings.voice.config,
          currentVoiceId: newVoiceId
        }
      });

      setError(null);
    } catch (err) {
      setError('Failed to change voice');
      console.error('Voice change error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced handlers for voice parameters
  const debouncedUpdateSettings = useCallback(
    debounce((newParams: VoiceSynthesisOptions) => {
      updateVoiceSettings({
        ...settings.voice,
        config: {
          ...settings.voice.config,
          synthesisOptions: newParams
        }
      });
    }, 300),
    [settings.voice, updateVoiceSettings]
  );

  // Handle speaking rate change
  const handleRateChange = (event: Event, newValue: number | number[]) => {
    const rate = newValue as number;
    if (rate >= VOICE_SYNTHESIS_CONFIG.MIN_RATE && rate <= VOICE_SYNTHESIS_CONFIG.MAX_RATE) {
      setVoiceParams(prev => ({
        ...prev,
        speakingRate: rate
      }));
      debouncedUpdateSettings({ ...voiceParams, speakingRate: rate });
    }
  };

  // Handle pitch change
  const handlePitchChange = (event: Event, newValue: number | number[]) => {
    const pitch = newValue as number;
    setVoiceParams(prev => ({
      ...prev,
      pitch: pitch
    }));
    debouncedUpdateSettings({ ...voiceParams, pitch });
  };

  // Handle volume change
  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const volume = newValue as number;
    setVoiceParams(prev => ({
      ...prev,
      volume: volume
    }));
    debouncedUpdateSettings({ ...voiceParams, volume });
  };

  // Handle voice preview
  const handlePreview = async () => {
    if (previewPlaying) {
      setPreviewPlaying(false);
      return;
    }

    try {
      setPreviewPlaying(true);
      await voiceService.synthesizeSpeech(
        "This is a preview of the selected voice.",
        voiceParams
      );
    } catch (err) {
      setError('Failed to preview voice');
      console.error('Voice preview error:', err);
    } finally {
      setPreviewPlaying(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Voice Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="voice-select-label">Voice</InputLabel>
        <Select
          labelId="voice-select-label"
          value={voiceParams.voiceId}
          onChange={handleVoiceChange}
          disabled={isLoading}
        >
          {availableVoices.map((voice) => (
            <MenuItem key={voice.voiceId} value={voice.voiceId}>
              {voice.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Speaking Rate ({voiceParams.speakingRate}x)
        </Typography>
        <Slider
          value={voiceParams.speakingRate}
          onChange={handleRateChange}
          min={VOICE_SYNTHESIS_CONFIG.MIN_RATE}
          max={VOICE_SYNTHESIS_CONFIG.MAX_RATE}
          step={0.1}
          marks
          valueLabelDisplay="auto"
          disabled={isLoading}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Pitch ({voiceParams.pitch})
        </Typography>
        <Slider
          value={voiceParams.pitch}
          onChange={handlePitchChange}
          min={VOICE_SYNTHESIS_CONFIG.MIN_PITCH}
          max={VOICE_SYNTHESIS_CONFIG.MAX_PITCH}
          step={0.1}
          marks
          valueLabelDisplay="auto"
          disabled={isLoading}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Volume ({voiceParams.volume})
        </Typography>
        <Slider
          value={voiceParams.volume}
          onChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.1}
          marks
          valueLabelDisplay="auto"
          disabled={isLoading}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          onClick={handlePreview}
          disabled={isLoading}
          color="primary"
          aria-label={previewPlaying ? 'Stop preview' : 'Preview voice'}
        >
          {isLoading ? (
            <CircularProgress size={24} />
          ) : previewPlaying ? (
            <Stop />
          ) : (
            <PlayArrow />
          )}
        </IconButton>
        <Typography variant="body2" color="textSecondary">
          {previewPlaying ? 'Playing preview...' : 'Click to preview voice'}
        </Typography>
      </Box>
    </Box>
  );
};

export default VoiceSettings;