import React, { useEffect, useState,useRef } from 'react';
import * as faceapi from 'face-api.js';
import AceEditor from "react-ace";
import {
  FilesetResolver,
  ObjectDetector,
} from "@mediapipe/tasks-vision";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Ace Build dependencies
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-beautify";
import "ace-builds/src-noconflict/ext-error_marker";

import "ace-builds/src-noconflict/mode-python";

// Themes
import "ace-builds/src-noconflict/theme-dracula";

import "ace-builds/src-noconflict/snippets/python";

export default function RulesModal({ onClose, test }) {
    const missCountRef = useRef(0);
      const activeToastIdRef = useRef(null);
  
  const [isVisible, setIsVisible] = useState(false);
  const [mobile, setmobile] = useState(false);
  const [talking, setTalking] = useState(true);
  const [acceptHover, setAcceptHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const [pyodide, setPyodide] = useState(null);
    const [focusPercent, setFocusPercent] = useState(0);
    const [presencePercent, setPresencePercent] = useState(0);
    const [talkingPercent, setTalkingPercent] = useState(100);
  const videoRef = useRef();
    const canvasRef = useRef();
  const [multifacePercent, setMFPercent] = useState(100);
  const [multiface, setmultiface] = useState(false);
    const [deviceError, setDeviceError] = useState(null);
  const isAllRulesSatisfied = focusPercent >= 90 && !talking && !multiface && !mobile;
  
    const calculateFocus = (landmarks) => {
    const nose = landmarks.getNose()[3];
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    if (!leftEye.length || !rightEye.length) return 0;

    const leftEyeCenterX = (leftEye[0].x + leftEye[3].x) / 2;
    const rightEyeCenterX = (rightEye[0].x + rightEye[3].x) / 2;
    const midEyeX = (leftEyeCenterX + rightEyeCenterX) / 2;

    const deviation = Math.abs(nose.x - midEyeX);
    let percent = 100 - deviation;
    return Math.max(0, Math.min(100, Math.round(percent)));
  };
  const showSingleToast = (message, type = "error") => {
  if (activeToastIdRef.current) return;
    activeToastIdRef.current = toast[type](message, {
      toastId: "single-toast",
      autoClose: 3500,
      onClose: () => { activeToastIdRef.current = null; },
      position: "top-right",
      theme: "colored",
    });
  
    };
      const detectorRef = useRef(null);
    useEffect(() => {
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }, []);
  
  useEffect(() => {
    setIsVisible(true);
    document.body.style.overflow = 'hidden';
    startVideo();
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 470, height: 340 } })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setDeviceError(false);
      })
      .catch((err) => {
        console.error('Webcam error:', err);
        setDeviceError("Camera access denied or not available. Please enable it to continue the test.");
      }
      );
  };


  useEffect(() => {
      const loadModels = async () => {
         
        const MODEL_URL = '/models';
        try {
               // Simulate progress for better UX
             
               await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
               
              
          await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);


              
               // Load the model fileset
               const vision = await FilesetResolver.forVisionTasks(
                 "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
               );
       
               // Create ObjectDetector
               detectorRef.current = await ObjectDetector.createFromOptions(vision, {
                 baseOptions: {
                   modelAssetPath:
                     "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
                 },
                 scoreThreshold: 0.5,
                 runningMode: "VIDEO",
               });
           
               console.log("Loading Python Runtime...");
               
               // Wait for script to load if not already available
               let attempts = 0;
               while (!window.loadPyodide && attempts < 50) {
                 await new Promise(resolve => setTimeout(resolve, 100));
                 attempts++;
               }
               
               if (!window.loadPyodide) {
                 throw new Error("Python Runtime script failed to load");
               }
               
               const pyodideInstance = await window.loadPyodide({
                 indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/"
               });
               console.log("Python Runtime loaded successfully:", pyodideInstance);
               setPyodide(pyodideInstance);
               
      
               startVideo();
             } catch (error) {
               console.error('Error loading models:', error);
              
        }
        setFocusPercent(100);
          setPresencePercent(100);
          setTalking(false);
           };
       
           loadModels();
         }, [])
  const handleAccept = () => {
    
    setTimeout(() => {
      onClose();
      if (test?.TestType === "MCQ") {
      window.location.href = "/mcqtest";
    } else {
      window.location.href = "/test"; // for coding or any other type
    }
    }, 300);
  };
const handleDetection = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || !videoRef.current.videoWidth) {
      setDeviceError(true);
      return;
    }
    setDeviceError(false);
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,       // Good balance between speed & accuracy
  scoreThreshold: 0.5
    });
       const obdetections =await detectorRef.current.detectForVideo(
      videoRef.current,
      performance.now()
    );

    const ctx = canvasRef.current.getContext('2d');


    const detections = await faceapi
      .detectAllFaces(videoRef.current,tinyOptions)
      .withFaceLandmarks(true);

      obdetections.detections.forEach((det) => {
      const category = det.categories[0];
        if (category.categoryName === "cell phone" && category.score > 0.3) {
          setmobile(true);
        const box = det.boundingBox;
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.originX, box.originY, box.width, box.height);
        ctx.fillStyle = "red";
        ctx.font = "18px Arial";
        ctx.fillText(
          `${category.categoryName} ${(category.score * 100).toFixed(1)}%`,
          box.originX,
          box.originY > 20 ? box.originY - 5 : 20
        );
        showSingleToast("You are Using Mobile Please Don't Use That", "warning");
        }
        else
        { setmobile(false); }
      });
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          
    if (detections.length === 0) {
      missCountRef.current += 1;
      if (missCountRef.current >= 3) {
        if (presencePercent < 10) {
         
          // showSingleToast("You Are Not Present, You Are Watching Anywhere Else", "error");
        }
        else if (presencePercent < 40) {
          // showSingleToast("Please Focus On The Exam Keep Your Eyes On The Screen","warning");
        }
       
        setFocusPercent(0);
        setPresencePercent((prev) => prev - 2);
      }
      
    } else {
      missCountRef.current = 0;

      if (detections.length > 1) {
        setFocusPercent(0);
        showSingleToast(' Multiple Faces detected Please Attend The Test In A Isolated Environment',"error");
        setMFPercent(prev => prev - 5);
        setmultiface(true);
       
      } else {
        const detection = detections[0];
        setmultiface(false);

        const landmarks = detection.landmarks;

        const focus = calculateFocus(landmarks);
        setFocusPercent(focus);
        
        if (focus <= 92)
        {
          
          showSingleToast('Face Not Centered Please Keep Your Face Centered',"info");
        setPresencePercent(presencePercent-3);
          
        }

        const mouth = landmarks.getMouth();
        const topLip = mouth[13];
        const bottomLip = mouth[19];
        const lipDistance = Math.abs(topLip.y - bottomLip.y);
        const isTalking = lipDistance >7.5;

        if (isTalking) {
          setTalking(true);
          showSingleToast(' Your Lips are Moving Please Close Your Mouth',"warning");
          setTalkingPercent((prev) => Math.max(0, prev - 3));
        }
        else {
          setTalking(false);
        }

        if (presencePercent < 10) {
          //  showSingleToast(' You are not present, You are Watching Anywhere Else',"error");
          
        } else if (presencePercent < 40) {
            // showSingleToast(' Stay present, Please Watch The Screen. Keep Your Face Centered',"warning");
        }

        if (talkingPercent < 10) {
          showSingleToast(' You are talking excessively During This Test',"error");
        } else if (talkingPercent < 40) {
           showSingleToast(' You are talking a bit much, Please Keep Your Mouth Closed',"warning");
        }
      }
    }
    if (multifacePercent < 10)
        {
          showSingleToast('Multiple Faces Have Been Detected More Time',"error")
       
        }
    const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
    const resized = faceapi.resizeResults(detections, dims);
    faceapi.draw.drawDetections(canvasRef.current, resized);
    faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
  }



  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

    useEffect(() => {
      const interval = setInterval(() => {
        handleDetection();
      }, 500);
      
    return () => clearInterval(interval);
   }, [focusPercent, presencePercent, talkingPercent, multifacePercent]);

  return (
    <div className={`modal-backdrop ${isVisible ? 'visible' : ''} d-flex gap-5`}>
      <ToastContainer/>
      <div className={`modal-container ${isVisible ? 'visible' : ''}`}>
        <div className="modal-glass">
          <div className="modal-header">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <h2>Test Rules & Regulations</h2>
          </div>
          
          <div className="modal-body">
            <ul className="rules-list">
              <li className="animate__animated animate__fadeInRight">
                <i className="bi bi-lock-fill"></i>
                <span>No tab switching and Copy-Paste allowed</span>
              </li>

              <li className="animate__animated animate__fadeInRight" style={{ animationDelay: '0.2s' }}>
                <i className="bi bi-door-closed-fill"></i>
                <span>Leaving the test page results in disqualification</span>
              </li>

               
              <li className="animate__animated animate__fadeInRight">
                <i className="bi bi-lock-fill"></i>
                <span>Don't Use Mobile Phones</span>
              </li>
              <li className="animate__animated animate__fadeInRight" style={{ animationDelay: '0.3s' }}>
                <i className="bi bi-1-circle-fill"></i>
                <span>Only one attempt is allowed and Do Not Refresh The Website</span>
              </li>
            </ul>
            
            <div className="warning-box animate__animated animate__pulse animate__infinite">
              <i className="bi bi-exclamation-diamond-fill"></i>
              <span>Violating any rule will automatically submit your test! We are Monitoring You, Please Don't Do Any Malpractice</span>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              className={`cancel-btn ${cancelHover ? 'hover' : ''}`}
              onClick={handleCancel}
              onMouseEnter={() => setCancelHover(true)}
              onMouseLeave={() => setCancelHover(false)}
            >
              {cancelHover ? (
                <span className="animate__animated animate__headShake">Cancel</span>
              ) : (
                <span>Cancel</span>
              )}
            </button>
            <button 
              className={`accept-btn ${acceptHover ? 'hover' : ''}`}
              onClick={handleAccept}
              onMouseEnter={() => setAcceptHover(true)}
              onMouseLeave={() => setAcceptHover(false)}
              disabled={!isAllRulesSatisfied}
            >
              {acceptHover ? (
                <span className="animate__animated animate__pulse">Accept & Start Test</span>
              ) : (
                <span>Accept & Start Test</span>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className={`modal-container ${isVisible ? 'visible' : ''}`}>
        <div className="modal-glass">
          <div className="modal-header">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <h2>Camera Check And Audio Check</h2>
          </div>
          
          <div className="modal-body">
            <ul className="rules-list">
              <li className="animate__animated animate__fadeInRight">
                <i className="bi bi-door-closed-fill"></i>
                <span>Be In A Isolated, Good Lighting Space</span>
              </li>

              <li className="animate__animated animate__fadeInRight" style={{ animationDelay: '0.2s' }}>
                <i className="bi bi-lock-fill"></i>
                <span>Keep Your Face Centered, Don't Talk, Don't Wear SunGlasses</span>
              </li>

            </ul>
             <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '6px 6px 12px #d9d9d9, -6px -6px 12px #ffffff',
                    height: '100%',
          background: ((focusPercent < 93 || talking || multiface || mobile)) ? "rgba(255,0,0,0.3)" : "transparent",
          
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              display: 'block',
              width: '470px',
              height: '300px',
              objectFit: 'cover',
                borderRadius: '12px',
          border: (focusPercent < 93 || talking || multiface || mobile) ? "4px solid red" : "4px solid green",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '470px',
              height: '340px',
              borderRadius: '12px'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.6rem',
            fontWeight: '500'
          }}>
            Live Analysis
          </div>
          
            </div>
            <div style={{
  marginTop: '1rem',
  padding: '0.8rem',
  background: 'rgba(0,0,0,0.05)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap'
}}>
  {/* Focus indicator */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center',
    margin: '0 0.5rem',
    color: focusPercent < 90 ? (focusPercent === 0 ? '#dc3545' : '#ffc107') : '#28a745'
  }}>
    <i className={`bi ${focusPercent === 0 ? 'bi-x-circle' : focusPercent < 90 ? 'bi-exclamation-triangle' : 'bi-check-circle'}`} 
       style={{ marginRight: '0.3rem' }}></i>
    <span>Face: {focusPercent === 0 ? "Not Detected" : focusPercent < 90 ? "Off-Center" : "Centered"}</span>
  </div>
  
  {/* Talking indicator */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center',
    margin: '0 0.5rem',
    color: talking ? '#dc3545' : '#28a745'
  }}>
    <i className={`bi ${talking ? 'bi-exclamation-triangle' : 'bi-check-circle'}`} 
       style={{ marginRight: '0.3rem' }}></i>
    <span>Speech: {talking ? "Detected" : "None"}</span>
  </div>
  
  {/* Multiple faces indicator */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center',
    margin: '0 0.5rem',
    color: multiface ? '#dc3545' : '#28a745'
  }}>
    <i className={`bi ${multiface? 'bi-exclamation-triangle' : 'bi-check-circle'}`} 
       style={{ marginRight: '0.3rem' }}></i>
    <span>Faces: {multiface ? "Multiple" : "Single"}</span>
              </div>
              
              {/*  Mobile indicator */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center',
    margin: '0 0.5rem',
    color: mobile ? '#dc3545' : '#28a745'
  }}>
    <i className={`bi ${mobile? 'bi-exclamation-triangle' : 'bi-check-circle'}`} 
       style={{ marginRight: '0.3rem' }}></i>
    <span>Phone: {mobile ? "Detected" : "Not Detected"}</span>
  </div>
  
  {/* Overall status */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center',
    margin: '0 0.5rem',
    fontWeight: 'bold',
    color: (focusPercent >= 89 && !talking && !multiface && !mobile) ? '#28a745' : '#dc3545'
  }}>
    <i className={`bi ${(focusPercent >= 85 && !talking && !multiface && !mobile) ? 'bi-check-circle' : 'bi-x-circle'}`} 
       style={{ marginRight: '0.3rem' }}></i>
    <span>{(focusPercent >= 90 && !talking && !multiface && !mobile) ? "Good To Go, All The Best Do Well" : "Adjust Setup, Follow Above Rules"}</span>
  </div>
</div>
          
          </div>
        </div>
      </div>
       {deviceError && (
        <div className={`malpractice-modal visible`}>
          <div className="modal-content animate__animated animate__headShake">
            <div className="modal-icon">
              <i className="bi bi-exclamation-octagon"></i>
            </div>
            <h3>No Webcam Or Mic Detected</h3>
            <p>Please Ensure You Have A Proper WebCam or Mic And Switch On Both Of Them Please</p>
            <p>Your test is being Hold</p>
          </div>
        </div>
        )}
    </div>
  );
}