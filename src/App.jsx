// App.js - Bilingual Emotion Detector (EN/TH)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

// ========================================================================
// 1. Constants & Translations
// ========================================================================
const MODEL_URL = '/models';
const EMOTIONS = {
  HAPPY: 'happy',
  SAD: 'sad',
};
const EMOTION_COLORS = {
  [EMOTIONS.HAPPY]: '#00FF00', // Green
  [EMOTIONS.SAD]: '#FF0000',   // Red
};

// [LANG] 🇹🇭/🇬🇧: Object เก็บข้อความทั้ง 2 ภาษา
const translations = {
  en: {
    title: 'Emotion Detector',
    subtitle: 'Detecting: Happy, Sad',
    pleaseWait: 'Please wait...',
    loadingModels: 'Loading models...',
    ready: 'Ready to start camera',
    errorModels: 'Error: Could not load models.',
    analyzing: 'Analyzing...',
    statusPrefix: 'Status: ',
    startButton: '🟢 START CAMERA 🟢',
    stopButton: '🛑 STOP CAMERA 🛑',
    emotions: {
      happy: 'Happy',
      sad: 'Sad',
    },
    happyInsult: 'Why are you smiling, you idiot?',
    langCode: 'en-US',
    toggleButton: 'ไทย',
  },
  th: {
    title: 'โปรแกรมจับอารมณ์',
    subtitle: 'ตรวจจับ: มีความสุข, เศร้า',
    pleaseWait: 'กรุณารอสักครู่...',
    loadingModels: 'กำลังโหลดโมเดล...',
    ready: 'พร้อมเริ่มเปิดกล้อง',
    errorModels: 'เกิดข้อผิดพลาด: ไม่สามารถโหลดโมเดลได้',
    analyzing: 'กำลังวิเคราะห์...',
    statusPrefix: 'สถานะ: ',
    startButton: '🟢 เริ่มเปิดกล้อง 🟢',
    stopButton: '🛑 หยุดการทำงาน 🛑',
    emotions: {
      happy: 'มีความสุข',
      sad: 'เศร้า',
    },
    happyInsult: 'ยิ้มอะไรไอ้โง่?',
    langCode: 'th-TH',
    toggleButton: 'English',
  }
};

// ========================================================================
// 2. Custom Hook (useFaceAnalysis)
// ========================================================================
// [LANG] 🇹🇭/🇬🇧: Hook ต้องรับข้อความ (texts) มาจากข้างนอกเพื่อเปลี่ยนภาษาได้
const useFaceAnalysis = (videoRef, texts) => {
  const [status, setStatus] = useState(texts.pleaseWait);
  const [analysisResults, setAnalysisResults] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      setStatus(texts.loadingModels);
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setStatus(texts.ready);
      } catch (error) {
        console.error("Error loading models:", error);
        setStatus(texts.errorModels);
      }
    };
    loadModels();
  }, [texts]); // re-run if texts object changes, e.g. on language switch

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    const results = detections
      .map(det => {
        const topEmotion = Object.entries(det.expressions).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
        let mappedEmotion = null;
        if (topEmotion === EMOTIONS.HAPPY) {
          mappedEmotion = EMOTIONS.HAPPY;
        } else if (topEmotion === EMOTIONS.SAD || topEmotion === 'neutral') {
          mappedEmotion = EMOTIONS.SAD;
        }
        return mappedEmotion ? { region: det.detection.box, emotion: mappedEmotion } : null;
      })
      .filter(Boolean);

    setAnalysisResults(results);

    if (results.length > 0) {
      const emotionCounts = results.reduce((acc, face) => {
        acc[face.emotion] = (acc[face.emotion] || 0) + 1;
        return acc;
      }, {});
      const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b
      );
      setStatus(`${texts.statusPrefix}${texts.emotions[dominantEmotion]}`);
    } else {
      setStatus(texts.analyzing);
    }
  }, [videoRef, texts]);

  const startAnalysis = () => {
    setStatus(texts.analyzing);
    intervalRef.current = setInterval(analyzeFrame, 500);
  };

  const stopAnalysis = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAnalysisResults([]);
    setStatus(texts.ready);
  };

  // Update status text if language changes while idle
  useEffect(() => {
      if (status === translations.en.ready || status === translations.th.ready) {
          setStatus(texts.ready);
      }
  }, [texts, status]);

  return { status, results: analysisResults, startAnalysis, stopAnalysis };
};

// ========================================================================
// 3. Main App Component
// ========================================================================
function App() {
  // [LANG] 🇹🇭/🇬🇧: สร้าง state สำหรับเก็บภาษาปัจจุบัน (en = English, th = Thai)
  const [language, setLanguage] = useState('en');
  const [stream, setStream] = useState(null);
  const [isSad, setIsSad] = useState(false);
  const [alreadySpoken, setAlreadySpoken] = useState(false);

  const videoRef = useRef(null);
  const mainAudioRef = useRef(null);
  const sadAudioRef = useRef(null);

  // [LANG] 🇹🇭/🇬🇧: เลือกชุดข้อความตามภาษาที่เลือก
  const TEXTS = translations[language];

  const { status, results, startAnalysis, stopAnalysis } = useFaceAnalysis(videoRef, TEXTS);

  useEffect(() => {
    const sadDetected = results.some(face => face.emotion === EMOTIONS.SAD);
    setIsSad(sadDetected);
  }, [results]);

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
      // [LANG] 🇹🇭/🇬🇧: ใช้ข้อความและรหัสภาษาตาม state ปัจจุบัน
      const utterance = new SpeechSynthesisUtterance(TEXTS.happyInsult);
      utterance.lang = TEXTS.langCode;
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      setAlreadySpoken(true);
    }

    if (!happyDetected) setAlreadySpoken(false);
  }, [results, alreadySpoken, TEXTS]); // เพิ่ม TEXTS เข้าไปใน dependency array

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
      if (mainAudioRef.current) mainAudioRef.current.currentTime = 0;
      if (sadAudioRef.current) sadAudioRef.current.currentTime = 0;
    }
  };

  // [LANG] 🇹🇭/🇬🇧: ฟังก์ชันสำหรับสลับค่า state ของภาษา
  const toggleLanguage = () => {
    setLanguage(currentLang => (currentLang === 'en' ? 'th' : 'en'));
  };
  
  return (
    <div className={`app ${isSad ? 'sad-effect' : ''}`}>
      <audio ref={mainAudioRef} src="/background-music.mp3" loop />
      <audio ref={sadAudioRef} src="/s.mp3" loop />
      <header className="app__header">
        {/* [LANG] 🇹🇭/🇬🇧: ปุ่มสลับภาษา */}
        <button onClick={toggleLanguage} className="language-toggle">
          {TEXTS.toggleButton}
        </button>
        <h1>{TEXTS.title}</h1>
        <p>{TEXTS.subtitle}</p>
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
                  {TEXTS.emotions[face.emotion]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="app__controls">
        {stream ? (
          <button onClick={handleStopCamera} className="button button--stop">{TEXTS.stopButton}</button>
        ) : (
          <button onClick={handleStartCamera} className="button button--start" disabled={status !== TEXTS.ready}>
            {TEXTS.startButton}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;