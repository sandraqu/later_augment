// later_augment_client/src/components/VoicePreviewer.tsx
import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback for robustness

// --- Type Definitions ---
interface GoogleVoice {
  name: string;
  language_codes: string[];
  ssml_gender: "SSML_VOICE_GENDER_UNSPECIFIED" | "MALE" | "FEMALE" | "NEUTRAL";
  natural_sample_rate_hertz: number;
}

interface VoicesResponse {
  voices: GoogleVoice[];
}

interface SynthesizeResponse {
  audioContent: string; // Base64 encoded audio string
}

// Define the exact structure of settings to be passed
interface VoiceSettings {
  voiceName: string;
  languageCode: string;
  speakingRate: number;
  pitch: number;
}

// Define props for VoicePreviewer
interface VoicePreviewerProps {
  onVoiceSettingsChange: (settings: VoiceSettings | null) => void;
}
// --- End Type Definitions ---

const PREVIEW_TEXT: string = "This is a preview of the selected voice.";

// Helper for shallow comparison of objects (checks if all direct properties are equal)
const shallowCompare = (obj1: any, obj2: any) => {
  if (obj1 === obj2) return true; // Same object reference or both null/undefined
  if (!obj1 || !obj2 || typeof obj1 !== "object" || typeof obj2 !== "object")
    return false; // One is null/undefined or not an object

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
};

// --- Corrected VoicePreviewer Component ---
const VoicePreviewer: React.FC<VoicePreviewerProps> = ({
  onVoiceSettingsChange,
}) => {
  const [voices, setVoices] = useState<GoogleVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0.0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(true);
  const [isGeneratingPreview, setIsGeneratingPreview] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSettingsRef = useRef<VoiceSettings | null>(null); // Ref to store previously sent settings

  const API_BASE_URL: string = import.meta.env.VITE_RAILS_API_URL || "";

  // --- Effect to fetch voices ---
  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoadingVoices(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/voices`);
        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(
            errorData.error || `HTTP error! Status: ${response.status}`
          );
        }
        const data: VoicesResponse = await response.json();
        setVoices(data.voices);
        if (data.voices.length > 0) {
          const defaultEnglishVoice =
            data.voices.find(
              (v) =>
                v.name.startsWith("en-US-Standard") &&
                v.ssml_gender === "FEMALE"
            ) ||
            data.voices.find((v) => v.name.startsWith("en-US")) ||
            data.voices[0];
          setSelectedVoiceName(defaultEnglishVoice.name);
        }
      } catch (err: any) {
        console.error("Error fetching voices:", err);
        setError(`Failed to load voices: ${err.message}`);
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [API_BASE_URL]);

  // --- Effect to call onVoiceSettingsChange whenever settings update ---
  // This is the CRITICAL effect that was causing the loop
  useEffect(() => {
    let currentSettings: VoiceSettings | null = null;
    if (selectedVoiceName && voices.length > 0) {
      const selectedVoice = voices.find((v) => v.name === selectedVoiceName);
      if (selectedVoice) {
        currentSettings = {
          voiceName: selectedVoice.name,
          languageCode: selectedVoice.language_codes[0], // Assuming the first language code is primary
          speakingRate: speakingRate,
          pitch: pitch,
        };
      }
    }

    // Only call onVoiceSettingsChange if the settings have actually changed content
    // Use shallowCompare to compare the current settings object with the previously sent one
    if (!shallowCompare(prevSettingsRef.current, currentSettings)) {
      onVoiceSettingsChange(currentSettings); // Call the prop function
      prevSettingsRef.current = currentSettings; // Update the ref for the next comparison
    }
  }, [selectedVoiceName, speakingRate, pitch, voices, onVoiceSettingsChange]); // Dependencies

  // Helper function to convert base64 audio to a Blob URL for playback
  const base64ToBlobUrl = useCallback(
    (
      // Memoize this function
      base64String: string,
      mimeType: string = "audio/mpeg"
    ): string => {
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array<number>(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    },
    []
  ); // Empty dependency array as it depends on no external state

  // --- Handle Preview Voice Function ---
  const handlePreviewVoice = async () => {
    setIsGeneratingPreview(true);
    setError(null);
    setPreviewAudioUrl(null);

    if (!selectedVoiceName) {
      setError("Please select a voice for preview.");
      setIsGeneratingPreview(false);
      return;
    }

    const selectedVoice = voices.find(
      (voice) => voice.name === selectedVoiceName
    );
    const languageCode: string = selectedVoice
      ? selectedVoice.language_codes[0]
      : "en-US";

    try {
      const response = await fetch(`${API_BASE_URL}/preview_tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: PREVIEW_TEXT,
          voice_name: selectedVoiceName,
          language_code: languageCode,
          speaking_rate: speakingRate,
          pitch: pitch,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(
          errorData.error || `HTTP error! Status: ${response.status}`
        );
      }

      const data: SynthesizeResponse = await response.json();
      const url = base64ToBlobUrl(data.audioContent);
      setPreviewAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch((playError: DOMException) => {
          console.warn("Autoplay blocked for preview:", playError);
        });
      }
    } catch (err: any) {
      console.error("Error generating voice preview:", err);
      setError(`Failed to generate preview: ${err.message}`);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <div className="voice-preview-section">
      <h2>Voice Preview Settings</h2>
      {error && <p className="error-message">Error: {error}</p>}

      {/* Voice Selection */}
      <div className="input-group">
        <label htmlFor="voice-select">Select Voice:</label>
        <select
          id="voice-select"
          value={selectedVoiceName}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setSelectedVoiceName(e.target.value)
          }
          disabled={isLoadingVoices || isGeneratingPreview}
        >
          {isLoadingVoices ? (
            <option value="">Loading voices...</option>
          ) : voices.length === 0 ? (
            <option value="">No voices available</option>
          ) : (
            voices.map((voice: GoogleVoice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.language_codes.join(", ")}) [
                {voice.ssml_gender
                  .replace("SSML_VOICE_GENDER_", "")
                  .toLowerCase()}
                ]
              </option>
            ))
          )}
        </select>
      </div>

      {/* Speaking Rate & Pitch Controls */}
      <div className="input-group-horizontal">
        <div className="input-control">
          <label htmlFor="speaking-rate">
            Speaking Rate: ({speakingRate.toFixed(2)})
          </label>
          <input
            type="range"
            id="speaking-rate"
            min="0.25"
            max="4.0"
            step="0.01"
            value={speakingRate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSpeakingRate(parseFloat(e.target.value))
            }
            disabled={isGeneratingPreview}
          />
        </div>
        <div className="input-control">
          <label htmlFor="pitch">Pitch: ({pitch.toFixed(2)})</label>
          <input
            type="range"
            id="pitch"
            min="-20.0"
            max="20.0"
            step="0.1"
            value={pitch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPitch(parseFloat(e.target.value))
            }
            disabled={isGeneratingPreview}
          />
        </div>
      </div>

      {/* Preview Button and Audio Player */}
      <button
        onClick={handlePreviewVoice}
        disabled={
          isGeneratingPreview || !selectedVoiceName || voices.length === 0
        }
        className="preview-button"
      >
        {isGeneratingPreview ? "Generating Preview..." : "Preview Voice"}
      </button>

      {previewAudioUrl && (
        <div className="audio-player-container">
          <h3>Preview:</h3>
          <audio controls src={previewAudioUrl} ref={audioRef}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default VoicePreviewer;
