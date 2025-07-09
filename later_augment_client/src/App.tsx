// later_augment_client/src/App.tsx
import { useState, useEffect } from "react";
import "./App.css";
import VoicePreviewer from "./components/VoicePreviewer"; // Import the new component

// Define interfaces for better type safety
interface Speech {
  id: number;
  text: string;
  audio_url: string | null;
  created_at: string;
  // Include other properties from your Speech model if you want to display them
  voice_name: string;
  speaking_rate: number;
  pitch: number;
}

function App() {
  const [inputText, setInputText] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // For the main synthesized speech (newly generated)
  const [isSynthesizingMain, setIsSynthesizingMain] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [speeches, setSpeeches] = useState<Speech[]>([]); // For the list of saved speeches
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // State to hold the voice settings selected in VoicePreviewer
  const [currentVoiceSettings, setCurrentVoiceSettings] = useState<{
    voiceName: string;
    languageCode: string;
    speakingRate: number;
    pitch: number;
  } | null>(null);

  const API_BASE_URL: string = import.meta.env.VITE_RAILS_API_URL || "";

  // --- fetchSpeeches function ---
  const fetchSpeeches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/speeches`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data: Speech[] = await response.json();
      setSpeeches(data);
    } catch (err: any) {
      console.error("Error fetching speeches:", err);
      setError(`Failed to load speeches: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchSpeeches();
  }, [API_BASE_URL]); // Only fetch speeches on mount or API_BASE_URL change

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  // --- handleSynthesizeSpeech function (for main text) ---
  const handleSynthesizeSpeech = async () => {
    setIsSynthesizingMain(true);
    setError(null);
    setAudioUrl(null); // Clear previous audio on new synthesis attempt

    if (!inputText.trim()) {
      setError("Please enter some text to synthesize.");
      setIsSynthesizingMain(false);
      return;
    }
    if (!currentVoiceSettings?.voiceName) {
      // Check if voice settings are available
      setError(
        "Please select a voice using the previewer before synthesizing."
      );
      setIsSynthesizingMain(false);
      return;
    }

    const requestBody = {
      text: inputText,
      voice_name: currentVoiceSettings.voiceName,
      language_code: currentVoiceSettings.languageCode,
      speaking_rate: currentVoiceSettings.speakingRate,
      pitch: currentVoiceSettings.pitch,
    };

    try {
      // REMOVED X-CSRF-Token header
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "X-CSRF-Token": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
          // ^ REMOVED: No longer needed for API-only Rails app as per previous fixes
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to parse JSON error from server if available
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `HTTP error! Status: ${response.status}, Details: ${response.statusText}`
        );
      }

      const data: Speech = await response.json();
      setAudioUrl(data.audio_url); // Set URL for the single generated audio player
      setInputText(""); // Clear the input field
      await fetchSpeeches(); // Refresh the list of saved speeches to include the new one
    } catch (err: any) {
      console.error("Error during speech synthesis:", err);
      setError(`Failed to synthesize speech: ${err.message}`);
    } finally {
      setIsSynthesizingMain(false);
    }
  };

  const handleDeleteSpeech = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this speech entry?")) {
      return;
    }

    try {
      // REMOVED X-CSRF-Token header
      const response = await fetch(`${API_BASE_URL}/speeches/${id}`, {
        method: "DELETE",
        headers: {
          // "X-CSRF-Token": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
          // ^ REMOVED: No longer needed for API-only Rails app as per previous fixes
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `HTTP error! Status: ${response.status}, Details: ${response.statusText}`
        );
      }

      setSpeeches((prevSpeeches) =>
        prevSpeeches.filter((speech) => speech.id !== id)
      );
    } catch (err: any) {
      console.error("Error deleting speech:", err);
      setError(`Failed to delete speech: ${err.message}`);
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? "dark-mode" : ""}`}>
      <button
        onClick={toggleDarkMode}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "8px 15px",
          fontSize: "0.9em",
          backgroundColor: isDarkMode ? "#5a5e6c" : "#f0f2f5",
          color: isDarkMode ? "#f8f8f2" : "#333",
          border: "1px solid",
          borderColor: isDarkMode ? "#6a6e7c" : "#ccc",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>

      <h1>Text-to-Speech Converter</h1>

      {/* Render the VoicePreviewer component here */}
      <VoicePreviewer
        // Pass a callback to update App's state with selected voice details
        onVoiceSettingsChange={(settings) => setCurrentVoiceSettings(settings)}
      />

      {/* Main Text-to-Speech Input */}
      <div className="main-tts-input-section">
        <h3>Generate Speech from Text</h3>
        <textarea
          placeholder="Enter text to synthesize..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={5}
          cols={50}
          disabled={isSynthesizingMain}
        ></textarea>

        <button
          onClick={handleSynthesizeSpeech}
          disabled={
            isSynthesizingMain || !inputText.trim() || !currentVoiceSettings
          }
          className="synthesize-button"
        >
          {isSynthesizingMain ? "Synthesizing..." : "Synthesize Speech"}
        </button>
      </div>

      {error && <p className="error-message">Error: {error}</p>}

      {/* Player for the newly generated audio (optional) */}
      {audioUrl && (
        <div className="audio-player-container newly-generated">
          <h3>Last Generated Audio:</h3>
          <audio controls src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div className="saved-speeches-section">
        <h2>Saved Speeches</h2>
        {speeches.length === 0 && !isSynthesizingMain && !error && (
          <p>No speeches saved yet.</p>
        )}
        {error && speeches.length === 0 && (
          <p className="error-message">Could not load saved speeches.</p>
        )}
        <ul className="speeches-list">
          {speeches.map((speech) => (
            <li key={speech.id} className="speech-item">
              <div>
                <p className="speech-text">{speech.text}</p>
                <p className="speech-meta">
                  Voice: {speech.voice_name} | Rate: {speech.speaking_rate} |
                  Pitch: {speech.pitch}
                </p>
                <p className="speech-meta">
                  Saved: {new Date(speech.created_at).toLocaleString()}
                </p>
              </div>

              {/* --- ADDED AUDIO PLAYER FOR SAVED SPEECHES --- */}
              {speech.audio_url && (
                <div className="audio-player-for-saved-speech">
                  <audio controls preload="none">
                    <source src={speech.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              {/* --- END ADDED AUDIO PLAYER --- */}

              <button
                onClick={() => handleDeleteSpeech(speech.id)}
                className="delete-button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
