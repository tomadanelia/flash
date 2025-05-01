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
 
// Define keypoint indices for easier reference (based on MediaPipe Hands model)
const KEYPOINT_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const;
 
 
const HOLD_DURATION = 1500; // Time in ms needed to hold gesture for confirmation
const INACTIVITY_TIMEOUT = 30000; // Time in ms (30 seconds) before resetting
 
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
  const [detectedGesture, setDetectedGesture] = useState<AnswerDifficultyString | null>(null); // <<< ADDED State for currently detected gesture
  const [holdStartTime, setHoldStartTime] = useState<number | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
 
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector>(null); // Stores the loaded handpose detector
  const rafRef = useRef<number | null>(null); // Stores the requestAnimationFrame ID
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
 
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
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4',
      };
      const detector = await handPoseDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
      console.log("Hand Pose Detection model loaded successfully.");
    } catch (err: any) {
      console.error("Error loading hand pose model:", err);
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
    setIsCameraEnabled(false); setConfirmingGesture(null); setConfirmationProgress(0); setDetectedGesture(null); // <<< ADDED Reset detected gesture
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
 
  // --- GESTURE MAPPING LOGIC ---
  function mapHandToGesture(hand: handPoseDetection.Hand): AnswerDifficultyString | null {
    if (!hand || !hand.keypoints || hand.keypoints.length !== 21) {
      return null;
    }
 
    const kp = hand.keypoints; // Shorthand for keypoints array
 
    // Helper to check if finger is likely extended vertically
    const isFingerExtended = (tipIndex: number, pipIndex: number, mcpIndex: number, toleranceY: number = 5): boolean => {
        return kp[tipIndex].y < kp[pipIndex].y - toleranceY && kp[pipIndex].y < kp[mcpIndex].y - toleranceY;
    };
 
    // Finger Extension Status
    const indexExtended = isFingerExtended(KEYPOINT_INDICES.INDEX_TIP, KEYPOINT_INDICES.INDEX_PIP, KEYPOINT_INDICES.INDEX_MCP);
    const middleExtended = isFingerExtended(KEYPOINT_INDICES.MIDDLE_TIP, KEYPOINT_INDICES.MIDDLE_PIP, KEYPOINT_INDICES.MIDDLE_MCP);
    const ringExtended = isFingerExtended(KEYPOINT_INDICES.RING_TIP, KEYPOINT_INDICES.RING_PIP, KEYPOINT_INDICES.RING_MCP);
    const pinkyExtended = isFingerExtended(KEYPOINT_INDICES.PINKY_TIP, KEYPOINT_INDICES.PINKY_PIP, KEYPOINT_INDICES.PINKY_MCP);
    // Thumb extension: Check if tip is significantly higher than its MCP joint
    const thumbExtended = kp[KEYPOINT_INDICES.THUMB_TIP].y < kp[KEYPOINT_INDICES.THUMB_MCP].y - 10; // Adjust tolerance as needed
 
    // Gesture Logic
 
    // 1. Check for Flat Hand ('Hard') - All fingers extended
    const allFingersExtended = thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended;
    if (allFingersExtended) {
       // Check if all tips are generally above the wrist (pointing upwards)
       const allTipsAboveWrist = [
         KEYPOINT_INDICES.THUMB_TIP, KEYPOINT_INDICES.INDEX_TIP,
         KEYPOINT_INDICES.MIDDLE_TIP, KEYPOINT_INDICES.RING_TIP, KEYPOINT_INDICES.PINKY_TIP
       ].every(tipIndex => kp[tipIndex].y < kp[KEYPOINT_INDICES.WRIST].y);
 
       if (allTipsAboveWrist) {
           // console.debug("Gesture Check: Flat Hand (Hard)");
           return 'Hard';
       }
    }
 
    // 2. Check for Thumbs Up ('Easy')
    // Condition: Thumb tip clearly above other fingers' middle joints (PIPs) AND other fingers curled.
    const thumbTipWellAbove = kp[KEYPOINT_INDICES.THUMB_TIP].y < kp[KEYPOINT_INDICES.INDEX_PIP].y &&
                              kp[KEYPOINT_INDICES.THUMB_TIP].y < kp[KEYPOINT_INDICES.MIDDLE_PIP].y &&
                              kp[KEYPOINT_INDICES.THUMB_TIP].y < kp[KEYPOINT_INDICES.RING_PIP].y &&
                              kp[KEYPOINT_INDICES.THUMB_TIP].y < kp[KEYPOINT_INDICES.PINKY_PIP].y;
 
    const otherFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
 
    if (thumbTipWellAbove && otherFingersCurled) {
        // console.debug("Gesture Check: Thumbs Up (Easy)");
        return 'Easy';
    }
 
    // 3. Check for Thumbs Down ('Wrong')
    // Condition: Thumb tip clearly below the base knuckles (MCPs) of other fingers AND other fingers curled.
    const thumbTipWellBelow = kp[KEYPOINT_INDICES.THUMB_TIP].y > kp[KEYPOINT_INDICES.INDEX_MCP].y + 5 && // Add tolerance
                              kp[KEYPOINT_INDICES.THUMB_TIP].y > kp[KEYPOINT_INDICES.MIDDLE_MCP].y + 5 &&
                              kp[KEYPOINT_INDICES.THUMB_TIP].y > kp[KEYPOINT_INDICES.RING_MCP].y + 5 &&
                              kp[KEYPOINT_INDICES.THUMB_TIP].y > kp[KEYPOINT_INDICES.PINKY_MCP].y + 5;
 
    if (thumbTipWellBelow && otherFingersCurled) {
        // console.debug("Gesture Check: Thumbs Down (Wrong)");
        return 'Wrong';
    }
 
    // No recognizable gesture matched
    return null;
  }
  // --- END GESTURE MAPPING LOGIC ---
  const handleShowFront = useCallback((): void => {
    setShowBack(false);
    setConfirmingGesture(null);
    setConfirmationProgress(0);
    setDetectedGesture(null);
  }, []);
 
  const handleInactivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityTime > INACTIVITY_TIMEOUT && showBack) {
      console.log("Inactivity timeout - resetting view");
      handleShowFront();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }
  }, [lastActivityTime, showBack, handleShowFront]);
 
  const handleAnswer = async (difficulty: AnswerDifficultyString) => {
    const currentCard = practiceCards[currentIndex];
    if (!currentCard?.id) { setError("Error submitting: Card data missing."); return; }
    console.log(`Submitting answer: ${difficulty} for card ${currentCard.id}`);
 
    // Stop detection loop temporarily if running
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
 
    // Reset gesture states immediately
    setConfirmingGesture(null);
    setConfirmationProgress(0);
    setDetectedGesture(null);
 
    try {
      await apiService.submitAnswer(currentCard.id, difficulty);
      setShowBack(false); // Go back to front
      if (currentIndex < practiceCards.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setSessionFinished(true);
      }
      setError(null);
    } catch (error: any) {
      setError("Failed to submit answer.");
      // Optionally restart detection loop here if needed, but handleShowFront should do it via useEffect
    }
  };
  const handleNextDay = async () => {
     if (isLoading) return;
     stopCamera(); // Ensure camera is off before loading next day
     setIsLoading(true); setError(null);
     try { await apiService.advanceDay(); await loadPracticeCards(); }
     catch (error: any) { setError("Failed to advance to the next day."); }
     finally { setIsLoading(false); }
  };
 
  // --- MODIFIED Hand Detection Loop Logic ---
  const runHandDetection = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
 
    if (isCameraEnabled && showBack && detector && video && video.readyState >= 3) {
      let currentGesture: AnswerDifficultyString | null = null;
     
      try {
        const hands = await detector.estimateHands(video, { flipHorizontal: false });
 
        if (hands.length > 0) {
          currentGesture = mapHandToGesture(hands[0]);
          setDetectedGesture(currentGesture);
         
          if (currentGesture) {
            setLastActivityTime(Date.now());
 
            if (!confirmingGesture) {
              // Start new confirmation
              setConfirmingGesture(currentGesture);
              setHoldStartTime(Date.now());
              setConfirmationProgress(0);
            } else if (currentGesture === confirmingGesture) {
              // Continue confirmation
              const elapsedTime = Date.now() - (holdStartTime || Date.now());
              const progress = Math.min((elapsedTime / HOLD_DURATION) * 100, 100);
              setConfirmationProgress(progress);
 
              if (progress >= 100) {
                // Confirmation complete
                handleAnswer(currentGesture);
                setConfirmingGesture(null);
                setHoldStartTime(null);
                setConfirmationProgress(0);
              }
            } else {
              // Different gesture detected - reset confirmation
              setConfirmingGesture(currentGesture);
              setHoldStartTime(Date.now());
              setConfirmationProgress(0);
            }
          }
        } else {
          setDetectedGesture(null);
          if (confirmingGesture) {
            setConfirmingGesture(null);
            setHoldStartTime(null);
            setConfirmationProgress(0);
          }
        }
        setDetectionError(null);
      } catch (err: any) {
        console.error("Error during hand detection:", err);
        setDetectionError("Error during hand detection.");
        setDetectedGesture(null);
        setConfirmingGesture(null);
        setHoldStartTime(null);
        setConfirmationProgress(0);
      }
    } else {
      setDetectedGesture(null);
      if (confirmingGesture) {
        setConfirmingGesture(null);
        setHoldStartTime(null);
        setConfirmationProgress(0);
      }
    }
 
    if (isCameraEnabled && showBack) {
      rafRef.current = requestAnimationFrame(runHandDetection);
    } else {
      rafRef.current = null;
    }
  }, [isCameraEnabled, showBack, confirmingGesture, holdStartTime, handleAnswer]);
 
  // --- Event Handlers ---
  const handleToggleCamera = () => { if (isCameraEnabled) { stopCamera(); } else { startCamera(); } };
  const handleShowBack = (): void => { setShowBack(true); };
 
 
 
  // --- UseEffect Hooks ---
 
 
// Add with other useEffect hooks
useEffect(() => {
  if (showBack) {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setInterval(handleInactivity, 1000);
  }
 
  return () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };
}, [showBack, handleInactivity]);
 
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
      // Start loop ONLY if camera is enabled, back is shown, AND model is loaded
      if (isCameraEnabled && showBack && detectorRef.current) {
          if (!rafRef.current) {
            console.log("Starting detection loop...");
            rafRef.current = requestAnimationFrame(runHandDetection);
          }
      } else {
          // Stop loop if any condition is false
          if (rafRef.current) {
            console.log("Stopping detection loop (useEffect)...");
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          // Reset confirmation state whenever loop stops
          setConfirmingGesture(null);
          setConfirmationProgress(0);
          setDetectedGesture(null); // Reset detected gesture too
      }
      // Cleanup function for when dependencies change or component unmounts
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          console.log("Detection loop effect cleanup.");
        }
      };
  // Re-run effect if camera state, showBack state, or the detector instance changes
  }, [isCameraEnabled, showBack, detectorRef.current, runHandDetection]);
 
  // Effect for Component Unmount Cleanup
  useEffect(() => {
    return () => {
      console.log("PracticeView unmounting: Cleanup.");
      stopCamera();
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [stopCamera]);  // Depend on stopCamera callback
 
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
         {/* <<< ADDED Display detected gesture (optional for debug) >>> */}
         {isCameraEnabled && !cameraError && showBack && (
            <p style={{marginTop: '5px', fontSize: '0.9em', fontWeight: 'bold'}}>
                Detected Gesture: {detectedGesture || 'None'}
            </p>
         )}
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
                     {/* Added Emojis to buttons */}
                     <button onClick={() => handleAnswer('Easy')} disabled={isLoading || !!confirmingGesture || isModelLoading}>Easy 👍</button>
                     <button onClick={() => handleAnswer('Hard')} disabled={isLoading || !!confirmingGesture || isModelLoading}>Hard 🖐️</button>
                     <button onClick={() => handleAnswer('Wrong')} disabled={isLoading || !!confirmingGesture || isModelLoading}>Wrong 👎</button>
                     <button onClick={handleShowFront} style={{ marginLeft: '10px' }} disabled={isLoading || !!confirmingGesture || isModelLoading}>Show Front</button>
                  </div>
                  {/* Indicator (Keep for next step) */}
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