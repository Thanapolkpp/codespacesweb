// App.js - Emotion Detector with TTS for Happy

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

// ========================================================================
// 1. Constants
// ========================================================================
const MODEL_URL = '/models';
const EMOTIONS = {
  HAPPY: 'happy',
  SAD: 'sad',
  NEUTRAL: 'neutral',
};
const EMOTION_COLORS = {
  [EMOTIONS.HAPPY]: '#00FF00',
  [EMOTIONS.SAD]: '#FF0000',
  [EMOTIONS.NEUTRAL]: '#AAAAAA',
};

const formatEmotionText = (emotion) => {
  if (!emotion) return '';
  return emotion.charAt(0).toUpperCase() + emotion.slice(1);
};

// ========================================================================
// 2. Custom Hook
// ========================================================================
const useFaceAnalysis = (videoRef) => {
  const [status, setStatus] = useState('Please wait...');
  const [analysisResults, setAnalysisResults] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      setStatus('Loading models...');
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setStatus('Ready to start camera');
      } catch (error) {
        console.error("Error loading models:", error);
        setStatus('Error: Could not load models.');
      }
    };
    loadModels();
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    const results = detections
      .map(det => {
        const topEmotion = Object.entries(det.expressions).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
        if (Object.values(EMOTIONS).includes(topEmotion)) {
          return { region: det.detection.box, emotion: topEmotion };
        }
        return null;
      })
      .filter(Boolean);

    setAnalysisResults(results);

    // อัปเดตสถานะ
    if (results.length > 0) {
      const emotionCounts = results.reduce((acc, face) => {
        acc[face.emotion] = (acc[face.emotion] || 0) + 1;
        return acc;
      }, {});
      const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b
      );
      setStatus(`Status: ${formatEmotionText(dominantEmotion)}`);
    } else {
      setStatus('Analyzing...');
    }

  }, [videoRef]);

  const startAnalysis = () => {
    setStatus('Analyzing...');
    intervalRef.current = setInterval(analyzeFrame, 500);
  };

  const stopAnalysis = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAnalysisResults([]);
    setStatus('Ready to start camera');
  };

  return { status, results: analysisResults, startAnalysis, stopAnalysis };
};

// ========================================================================
// 3. Main App Component
// ========================================================================
function App() {
  const [stream, setStream] = useState(null);
  const [isSad, setIsSad] = useState(false);
  const [alreadySpoken, setAlreadySpoken] = useState(false);

  const videoRef = useRef(null);
  const mainAudioRef = useRef(null);
  const sadAudioRef = useRef(null);
  
  const { status, results, startAnalysis, stopAnalysis } = useFaceAnalysis(videoRef);

  // ตรวจสอบ Sad
  useEffect(() => {
    const sadDetected = results.some(face => face.emotion === EMOTIONS.SAD);
    setIsSad(sadDetected);
  }, [results]);

  // เล่นเพลงตามอารมณ์
  useEffect(() => {
    const playMainAudio = () => mainAudioRef.current?.play().catch(console.error);
    const pauseMainAudio = () => mainAudioRef.current?.pause();
    const playSadAudio = () => sadAudioRef.current?.play().catch(console.error);
    const pauseSadAudio = () => sadAudioRef.current?.pause();

    if (isSad) {
      pauseMainAudio();
      playSadAudio();
    } else {
      pauseSadAudio();
      if (stream) playMainAudio();
    }
  }, [isSad, stream]);

  // TTS สำหรับ Happy
  useEffect(() => {
    const happyDetected = results.some(face => face.emotion === EMOTIONS.HAPPY);

    if (happyDetected && !alreadySpoken) {
      const utterance = new SpeechSynthesisUtterance(
        "Why are you smiling, you idiot?"
      );
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      setAlreadySpoken(true);
    }

    // รีเซ็ต alreadySpoken ถ้าไม่มีคนยิ้ม
    if (!happyDetected) setAlreadySpoken(false);
  }, [results, alreadySpoken]);

  const handleStartCamera = async () => {
    try {
      const streamData = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = streamData;
        videoRef.current.onloadedmetadata = () => startAnalysis();
      }
      setStream(streamData);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const handleStopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      stopAnalysis();
      mainAudioRef.current.currentTime = 0;
      sadAudioRef.current.currentTime = 0;
    }
  };
  
  return (
    <div className={`app ${isSad ? 'sad-effect' : ''}`}>
      <audio ref={mainAudioRef} src="/background-music.mp3" loop />
      <audio ref={sadAudioRef} src="/s.mp3" loop />
      <header className="app__header">
        <h1>Emotion Detector</h1>
        <p>Detecting: Happy, Neutral, Sad</p>
      </header>
      <div className="app__status">
        <p>{status}</p>
      </div>
      <div className="app__video-wrapper">
        <video ref={videoRef} className="app__video-feed" autoPlay muted playsInline />
        <div className="app__analysis-overlays">
          {results.map((face, index) => {
            const color = EMOTION_COLORS[face.emotion] || '#FFFFFF';
            return (
              <div
                key={index}
                className="face-overlay"
                style={{
                  left: `${face.region.x}px`,
                  top: `${face.region.y}px`,
                  width: `${face.region.width}px`,
                  height: `${face.region.height}px`,
                  borderColor: color,
                  backgroundColor: `${color}33`
                }}
              >
                <span className="face-overlay__emotion" style={{ color }}>
                  {formatEmotionText(face.emotion)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="app__controls">
        {stream ? (
          <button onClick={handleStopCamera} className="button button--stop">🛑 STOP CAMERA 🛑</button>
        ) : (
          <button onClick={handleStartCamera} className="button button--start" disabled={status !== 'Ready to start camera'}>
            🟢 START CAMERA 🟢
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
