// later_augment_client/src/App.tsx

import { useState, useEffect } from "react";
import "./App.css";

interface Speech {
  id: number;
  text: string;
  audio_url: string | null;
  created_at: string;
}

function App() {
  const [inputText, setInputText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const API_BASE_URL = import.meta.env.VITE_RAILS_API_URL;

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
  }, []);

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

  const handleSynthesizeSpeech = async () => {
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    if (!inputText.trim()) {
      setError("Please enter some text to synthesize.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Details: ${errorText}`
        );
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      setInputText("");
      await fetchSpeeches();
    } catch (err: any) {
      console.error("Error during speech synthesis:", err);
      setError(`Failed to synthesize speech: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpeech = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this speech entry?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/speeches/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Details: ${errorText}`
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
    <div className="later-augment-app">
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

      <textarea
        placeholder="Enter text to synthesize..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={5}
        cols={50}
        style={{ marginBottom: "15px", padding: "10px", fontSize: "1em" }}
      ></textarea>

      <button
        onClick={handleSynthesizeSpeech}
        disabled={isLoading}
        style={{ padding: "10px 20px", fontSize: "1.1em", cursor: "pointer" }}
      >
        {isLoading ? "Synthesizing..." : "Synthesize Speech"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "15px" }}>Error: {error}</p>
      )}

      {audioUrl && (
        <div style={{ marginTop: "20px" }}>
          <h3>Play Audio:</h3>
          <audio controls src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div
        style={{
          marginTop: "40px",
          borderTop: "1px solid #eee",
          paddingTop: "20px",
        }}
      >
        <h2>Saved Speeches</h2>
        {speeches.length === 0 && !isLoading && !error && (
          <p>No speeches saved yet.</p>
        )}
        {error && speeches.length === 0 && (
          <p style={{ color: "red" }}>Could not load saved speeches.</p>
        )}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {speeches.map((speech) => (
            <li
              key={speech.id}
              style={{
                // Removed background: '#f9f9f9',
                border: "1px solid #ddd",
                borderRadius: "5px",
                padding: "10px",
                marginBottom: "10px",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>{speech.text}</p>
                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: "0.8em" /* Removed color: '#666' */,
                  }}
                >
                  Saved: {new Date(speech.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteSpeech(speech.id)}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  fontSize: "0.9em",
                  cursor: "pointer",
                  marginLeft: "15px",
                }}
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
