// frontend/src/components/PracticeView.tsx

// Import React hooks
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import TFJS and Hand Pose Detection Model
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl'; // Register WebGL backend

// Import project types and services
import { Flashcard, AnswerDifficultyString, PracticeSession } from "../types";
import apiService from "../services/api";
import FlashcardDisplay from "./FlashcardDisplay";

// Define the type for the TFJS detector
type Detector = handPoseDetection.HandDetector | null;

const PracticeView = () => {
  // --- State ---
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading cards state
  const [error, setError] = useState<string | null>(null);     // General errors
  const [day, setDay] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(false);
  const [confirmationProgress, setConfirmationProgress] = useState<number>(0);
  const [confirmingGesture, setConfirmingGesture] = useState<AnswerDifficultyString | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false); // TFJS Model loading state
  const [detectionError, setDetectionError] = useState<string | null>(null); // TFJS errors

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector>(null); // Stores the loaded handpose detector
  const rafRef = useRef<number | null>(null); // Stores the requestAnimationFrame ID

  // --- Function Definitions ---

  const loadPracticeCards = useCallback(async () => {
    console.log("Loading practice cards...");
    setIsLoading(true); setError(null); setSessionFinished(false); setCurrentIndex(0); setShowBack(false); setPracticeCards([]);
    try {
      const result: PracticeSession = await apiService.fetchPracticeCards();
      if (result?.cards?.length > 0) {
        setPracticeCards(result.cards); setDay(result.day); setSessionFinished(false); console.log(`Loaded ${result.cards.length} cards for day ${result.day}`);
      } else {
        setPracticeCards([]); setDay(result.day); setSessionFinished(true); console.log(`No cards to load for day ${result.day}`);
      }
    } catch (error: any) {
      console.error("Error loading practice cards:", error); setError("Failed to load practice cards."); setPracticeCards([]); setSessionFinished(true);
    } finally { setIsLoading(false); }
  }, []);

  const loadHandPoseModel = useCallback(async () => {
    if (detectorRef.current || isModelLoading) return;
    console.log("Loading Hand Pose Detection model...");
    setIsModelLoading(true); setDetectionError(null);
    try {
      await tf.ready();
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
        runtime: 'mediapipe',
        modelType: 'lite',
        maxHands: 1,
        // --- FIX: Added explicit solutionPath ---
        // This tells the library where to download the MediaPipe WASM binaries and models
        // Using jsdelivr CDN is common. Use a specific version for stability.
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4',
        // ------------------------------------------
      };
      const detector = await handPoseDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
      console.log("Hand Pose Detection model loaded successfully.");
    } catch (err: any) {
      console.error("Error loading hand pose model:", err);
      // Add more specific error check if possible
      if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('ERR_NAME_NOT_RESOLVED'))) {
         setDetectionError(`Failed to load model assets. Check network connection or CDN path. Error: ${err.message}`);
      } else {
         setDetectionError(`Failed to load hand pose model: ${err.message}`);
      }
      detectorRef.current = null;
    } finally { setIsModelLoading(false); }
  }, [isModelLoading]);

  const stopCamera = useCallback(() => {
    console.log("Stopping camera & detection loop...");
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; console.log("Detection loop stopped."); }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; console.log("Stream tracks stopped."); }
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.onloadedmetadata = null; videoRef.current.onerror = null; console.log("Video srcObject cleared."); }
    setIsCameraEnabled(false); setConfirmingGesture(null); setConfirmationProgress(0);
  }, []);

  const startCamera = useCallback(async () => {
    console.log("Attempting to start camera...");
    setCameraError(null);
    if (!videoRef.current) { console.error("startCamera: videoRef missing."); setCameraError("Video element not ready."); return; }
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        console.log("Requesting media stream...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        console.log("Media stream obtained.");
        streamRef.current = stream;
        const videoElement = videoRef.current;
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          console.log("Video metadata loaded.");
          videoElement.play().then(() => {
            console.log("Video playback started.");
            setIsCameraEnabled(true);
            loadHandPoseModel(); // Load model once camera is playing
          }).catch(playErr => {
            console.error("videoElement.play() failed:", playErr); setCameraError(`Playback failed: ${playErr.message || playErr.name}.`); stopCamera();
          });
        };
        videoElement.onerror = (e) => { console.error("Video element error:", e); setCameraError("Video element error."); stopCamera(); };
      } catch (err: any) {
        console.error("Error during getUserMedia:", err);
        let message = "Could not access camera.";
        if (err.name === "NotAllowedError") message = "Camera permission denied."; else if (err.name === "NotFoundError") message = "No camera found."; else if (err.name === "NotReadableError") message = "Camera is already in use."; else message = `Error: ${err.name}`;
        setCameraError(message); setIsCameraEnabled(false); streamRef.current = null;
      }
    } else { console.error("getUserMedia not supported."); setCameraError("Camera access not supported."); setIsCameraEnabled(false); }
  }, [loadHandPoseModel, stopCamera]);

  // --- Hand Detection Loop Logic ---
  const runHandDetection = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (isCameraEnabled && showBack && detector && video && video.readyState >= 3) {
        try {
            const hands = await detector.estimateHands(video, { flipHorizontal: false });
            if (hands.length > 0) {
                // Gesture Mapping Logic (Next Step)
                 // console.log("Hand Detected:", hands[0].keypoints); // For debugging
            } else {
                if (confirmingGesture) {
                    console.log("Hand lost, resetting confirmation.");
                    setConfirmingGesture(null); setConfirmationProgress(0);
                }
            }
            setDetectionError(null);
        } catch (err: any) {
            console.error("Error during hand detection:", err);
            setDetectionError("Error during hand detection.");
        }
    } else {
        if (confirmingGesture){ setConfirmingGesture(null); setConfirmationProgress(0); }
    }

    if (isCameraEnabled) {
        rafRef.current = requestAnimationFrame(runHandDetection);
    } else {
        rafRef.current = null;
    }
  }, [isCameraEnabled, showBack, confirmingGesture]);

  // --- Event Handlers ---
  const handleToggleCamera = () => { if (isCameraEnabled) { stopCamera(); } else { startCamera(); } };
  const handleShowBack = (): void => { setShowBack(true); };
  const handleShowFront = (): void => { setShowBack(false); setConfirmingGesture(null); setConfirmationProgress(0); };
  const handleAnswer = async (difficulty: AnswerDifficultyString) => {
    const currentCard = practiceCards[currentIndex];
    if (!currentCard?.id) { setError("Error submitting: Card data missing."); return; }
    console.log(`Submitting answer: ${difficulty} for card ${currentCard.id}`);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setConfirmingGesture(null); setConfirmationProgress(0);
    try {
      await apiService.submitAnswer(currentCard.id, difficulty);
      setShowBack(false);
      if (currentIndex < practiceCards.length - 1) { setCurrentIndex(i => i + 1); } else { setSessionFinished(true); }
      setError(null);
    } catch (error: any) { setError("Failed to submit answer."); }
  };
  const handleNextDay = async () => {
     if (isLoading) return;
     stopCamera();
     setIsLoading(true); setError(null);
     try { await apiService.advanceDay(); await loadPracticeCards(); }
     catch (error: any) { setError("Failed to advance to the next day."); }
     finally { setIsLoading(false); }
  };

  // --- UseEffect Hooks ---
  useEffect(() => { // TFJS Backend Init
    const setupTF = async () => {
        try { await tf.setBackend('webgl'); await tf.ready(); console.log("TFJS WebGL backend ready."); }
        catch (err) { console.error("TFJS Backend setup failed:", err); setDetectionError("TFJS backend setup failed."); }
    };
    setupTF();
  }, []);

  useEffect(() => { // Initial Card Load
      loadPracticeCards();
  }, [loadPracticeCards]);

  // Effect to Start/Stop Detection Loop
  useEffect(() => {
      if (isCameraEnabled && showBack && detectorRef.current) {
          if (!rafRef.current) { console.log("Starting detection loop..."); rafRef.current = requestAnimationFrame(runHandDetection); }
      } else {
          if (rafRef.current) { console.log("Stopping detection loop..."); cancelAnimationFrame(rafRef.current); rafRef.current = null; setConfirmingGesture(null); setConfirmationProgress(0); }
      }
      return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; console.log("Detection loop effect cleanup."); } };
  }, [isCameraEnabled, showBack, detectorRef.current, runHandDetection]);

  // Effect for Component Unmount Cleanup
  useEffect(() => {
    return () => {
      console.log("PracticeView unmounting: Cleanup.");
      stopCamera();
      detectorRef.current?.dispose();
      console.log("Hand pose detector disposed.");
      detectorRef.current = null;
    };
  }, [stopCamera]);

  // --- Rendering Logic ---
  const currentCard = practiceCards[currentIndex];

  return (
    <div /*className={styles.practiceContainer}*/>
      <h1>Practice Time!</h1>
      <p>Day: {day}</p>

      {/* Camera Control and Preview Area */}
      <div style={{ margin: '20px 0', padding: '10px', border: '1px dashed blue' }}>
        <h4>Hand Gesture Controls</h4>
        <button onClick={handleToggleCamera} disabled={isLoading || isModelLoading}>
          {isModelLoading ? 'Loading Model...' : (isCameraEnabled ? 'Disable Camera' : 'Enable Camera for Gestures')}
        </button>
        {cameraError && <p style={{ color: 'red', marginTop: '5px' }}>Camera Error: {cameraError}</p>}
        {detectionError && <p style={{ color: 'orange', marginTop: '5px' }}>Detection Error: {detectionError}</p>}
        <div style={{ marginTop: '10px', position: 'relative', width: '200px', height: '150px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <video ref={videoRef} style={{ width: '100%', height: '100%', display: isCameraEnabled && !cameraError ? 'block' : 'none' }} autoPlay playsInline muted />
             {isCameraEnabled && !cameraError && videoRef.current?.paused && <p style={{ position: 'absolute', color: '#555', fontSize: '0.9em' }}>Waiting for stream...</p> }
             {!isCameraEnabled && !cameraError && <p style={{ color: '#555', fontSize: '0.9em', textAlign: 'center' }}>Camera is off</p> }
             {cameraError && <p style={{ position: 'absolute', color: 'red', padding: '5px', background: 'rgba(255,255,255,0.8)' }}>Error!</p> }
        </div>
         {!isCameraEnabled && !cameraError && <p style={{fontSize: '0.9em', color: '#666'}}>Enable camera to use hand gestures for answering.</p>}
      </div>
      {/* End Camera Control Area */}

      {/* Loading/Error/Session Finished Rendering */}
      {isLoading && <p>Loading cards...</p>}
      {error && !cameraError && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && !error && sessionFinished && ( /* Session Finished */
        <div><h2>Session Complete!</h2><p>No more cards for day {day}.</p><button onClick={handleNextDay} disabled={isLoading}>{isLoading ? "Loading..." : "Go to Next Day"}</button></div>
      )}

      {/* Main Practice Card Area */}
      {!isLoading && !sessionFinished && currentCard && ( /* Card Display */
         <div>
            <p>Card {currentIndex + 1} of {practiceCards.length}</p>
            <FlashcardDisplay card={currentCard} showBack={showBack} />
            {!showBack ? ( <button onClick={handleShowBack}>Show Answer</button> ) : (
               <div style={{ marginTop: '15px' }}>
                  <div> {/* Button Row */}
                     <button onClick={() => handleAnswer('Easy')} disabled={isLoading || !!confirmingGesture || isModelLoading}>Easy</button>
                     <button onClick={() => handleAnswer('Hard')} disabled={isLoading || !!confirmingGesture || isModelLoading}>Hard</button>
                     <button onClick={() => handleAnswer('Wrong')} disabled={isLoading || !!confirmingGesture || isModelLoading}>Wrong</button>
                     <button onClick={handleShowFront} style={{ marginLeft: '10px' }} disabled={isLoading || !!confirmingGesture || isModelLoading}>Show Front</button>
                  </div>
                  {/* Indicator */}
                  {isCameraEnabled && confirmingGesture && ( /* Indicator Display */
                    <div style={{ marginTop: '10px', padding: '10px', border: '1px solid orange', background: '#fff8e1' }}>
                        <p>Confirming: <strong>{confirmingGesture}</strong> ({confirmationProgress}%)</p>
                        <div style={{ width: '100%', backgroundColor: '#eee', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                           <div style={{ width: `${confirmationProgress}%`, backgroundColor: 'orange', height: '100%' }}></div>
                        </div>
                        <p style={{fontSize: '0.8em', color: '#600'}}>Hold gesture steady...</p>
                    </div>
                  )}
               </div>
            )}
         </div>
      )}

      {/* Edge cases */}
      {!isLoading && !error && !sessionFinished && !currentCard && practiceCards.length > 0 && ( <p>Error: Inconsistent state...</p> )}
      {!isLoading && !error && !sessionFinished && practiceCards.length === 0 && ( <p>No cards available...</p> )}
    </div>
  );
};

export default PracticeView;