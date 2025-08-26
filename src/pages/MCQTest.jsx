import React, { useEffect, useState,useRef } from 'react';
import * as faceapi from 'face-api.js';
import {
  FilesetResolver,
  ObjectDetector,
} from "@mediapipe/tasks-vision";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";



function MCQTest() {
  let mobilewarning = 0;
  const activeToastIdRef = useRef(null);
  const [examFinished, setExamFinished] = useState(false);
  const detectorRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [resizeCount, setResizeCount] = useState(0);
  const [malpractice, setMalpractice] = useState(false);
  const [malpracticeType, setMalpracticeType] = useState([]);
  const [timeTaken, setTimeTaken] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  const missCountRef = useRef(0);
  const [cKeywords, setCKeywords] = useState([]);
  const [focusPercent, setFocusPercent] = useState(100);
  const [multifacePercent, setMFPercent] = useState(100);
  const [presencePercent, setPresencePercent] = useState(100);
  const [talkingPercent, setTalkingPercent] = useState(100);
  const hasSubmittedRef = useRef(false);
  const [deviceError, setDeviceError] = useState(null);
  const [browserError, setBrowserError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);


const showSingleToast = (message, type = "error") => {
if (activeToastIdRef.current) return;
  activeToastIdRef.current = toast[type](message, {
    toastId: "single-toast",
    autoClose: 3500,
    onClose: () => { activeToastIdRef.current = null; },
    position: "top-right",
    theme: "colored"
  });
  activeToastIdRef.current = null;
  };
  
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      const MODEL_URL = '/models';
      
      try {
        // Simulate progress for better UX
        setProgress(30);
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        
        setProgress(60);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        
        setProgress(80);
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
        
        setProgress(100);
        setTimeout(() => setIsLoading(false), 500);
        startVideo();
      } catch (error) {
        console.error('Error loading models:', error);
        setDeviceError("Failed to load detection models. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  
    
       useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isSmallScreen = window.innerWidth <= 768; 

      if (
        /android|iphone|ipad|ipod|windows phone/i.test(userAgent.toLowerCase()) ||
        isSmallScreen
      ) {
        setIsMobile(true);
        setInterval(() => {
        handleMalpractice(`Invalid Device`)
      }, 2000);
      } else {
        setIsMobile(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
       }, []);
  
  useEffect(() => {
    // Detect browser
    const browser = (() => {
      const userAgent = navigator.userAgent;
      if (userAgent.includes("Edg")) return "Edge";
      if (userAgent.includes("Chrome")) return "Chrome";
      if (userAgent.includes("Firefox")) return "Firefox";
      return "Other";
    })();

    if (browser !== "Chrome") {
      setBrowserError(true);
      setInterval(() => {
        handleMalpractice(`Invalid Browser : ${browser}`)
      }, 2000);
    }
    else
    {
      setBrowserError(false);
    }
  }, []);
  const extractKeywords = (questionsArray) => {
  return questionsArray
    .map(q => q.question + " " + q.options.join(" ")) // join question + all options
    .join(" ")                                       // flatten to single string
    .replace(/[^\w\s]/g, "")                         // remove punctuation
    .split(/\s+/)                                    // split into words
    .map(w => w.toLowerCase());                      // normalize
  };
  
  const handleMalpractice = async (type) => {
    if (examFinished || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setMalpractice(true);
    setMalpracticeType(prev => [...new Set([...prev, type])]);
    const screenshot = captureScreenshot(); 
    setExamFinished(true);
    const username = localStorage.getItem("token");
    let done = parseInt(localStorage.getItem("done"));
    let department =localStorage.getItem("department");
     let year =   localStorage.getItem("year");
    let section=  localStorage.getItem("section");
   
    done = done + 1;

    const results = questions.map((q, idx) => ({
      question: q.question,
      selected: answers[idx],
      correctAnswer: q.correctAnswer,
      success: answers[idx] == q.correctAnswer,
    }));

    await fetch("https://marqueebackend.onrender.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        results,
        timeTaken: Math.floor((Date.now() - startTime) / 1000),
        malpractice_type: [...new Set([...malpracticeType, type])],
        totalMarks: results.filter(r => r?.success).length,
        test_type: "MCQ",
        malpractice: type,
        done,
        restrict: true,
        department,
        year,
        section,
        doneTest:"MCQ",
        screenshot
      }),
    });

    setShowPopup(true);
    
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }, 1000);
  };

    const handleMultiFace = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "Multiple Faces Detected"])]);
      await handleMalpractice("MultiFace Detected");
    };

    const handleNotPresence = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "SideView Copy"])]);
      await handleMalpractice("SideView Copy");
    }

    const handleSpeech = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "Talking"])]);
      await handleMalpractice("Talking");
  }
  const startRecording = () => {
    if (recording) return; // avoid multiple triggers

    setRecording(true);
    chunksRef.current = [];

    const stream = videoRef.current.srcObject;
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      sendToBackend(blob);
      setRecording(false);
    };

    mediaRecorder.start();
    console.log("Recording started");

    setTimeout(() => {
      mediaRecorder.stop();
      console.log("Recording stopped");
    }, 5000); // 5 sec
  };

  // Send video to backend
  const sendToBackend = async (blob) => {
    if (recording) return;
    setRecording(true);
    const formData = new FormData();
    const username = localStorage.getItem("token");
    formData.append("video", blob, `suspicious_clip_${username}.webm`);

    try {
      await fetch("https://marqueebackend.onrender.com/upload-video", {
        method: "POST",
        body: formData,
      });
      console.log("Video sent to backend");
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

      useEffect(() => {
        const interval = setInterval(() => {
          handleDetection();
        }, 500);
    
        return () => clearInterval(interval);
      }, [focusPercent, presencePercent, talkingPercent,multifacePercent]);
    
      const startVideo = () => {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 640, height: 480 } })
          .then((stream) => {
            videoRef.current.srcObject = stream;
            setDeviceError(false);
          })
          .catch((err) => {
            console.error('Webcam error:', err);
        setDeviceError("Camera access denied or not available. Please enable it to continue the test.");
          });
  };
  
    const captureScreenshot = () => {
  if (!videoRef.current) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

  // Convert to base64 (PNG)
  const imageData = canvas.toDataURL('image/png');
  return imageData;
};

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
    
      const handleDetection = async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) {
          return;
        }
        
        const tinyOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 512,       // Good balance between speed & accuracy
          scoreThreshold: 0.5
        });
        const obdetections =await detectorRef.current.detectForVideo(
      videoRef.current,
      performance.now()
    );

        // Draw video
        const ctx = canvasRef.current.getContext('2d');
        
    
    // Draw detections
    obdetections.detections.forEach((det) => {
      const category = det.categories[0];
      if (category.categoryName === "cell phone" && category.score > 0.3) {
        mobilewarning++;
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
        if (mobilewarning > 1)
        {
          showSingleToast("You are Using Mobile", "error");
          handleMalpractice("Using Mobile");
        }
      }
    });
        
        const detections = await faceapi
          .detectAllFaces(videoRef.current,tinyOptions)
          .withFaceLandmarks(true);
    
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
        if (detections.length === 0) {
          missCountRef.current += 1;
          if (missCountRef.current >= 3) {
            if (presencePercent < 10) {
              handleNotPresence();
              showSingleToast("You Are Not Present, You Are Watching Anywhere Else","error");
            }
            else if (presencePercent < 40) {
              showSingleToast("Please Focus On The Exam Keep Your Eyes On The Screen","warning");
            }
            setFocusPercent(0);
            showSingleToast(' Your Face Not Detected Please Keep Your Face Centered', "error");
            startRecording();
            setPresencePercent((prev) => prev - 2);
          }
        } else {
          missCountRef.current = 0;
          
          if (detections.length > 1) {
            setFocusPercent(0);
            setMFPercent(prev => prev - 5);
            startRecording();
            showSingleToast(' Multiple Faces detected',"error");
          }
          else {
            const detection = detections[0];
            const landmarks = detection.landmarks;
    
            const focus = calculateFocus(landmarks);
            setFocusPercent(focus);
    
            
            if (focus <= 84)
            {
              showSingleToast('Face Not Centered Please Keep Your Face Centered',"info");
              setPresencePercent((prev) => prev - 3)
              startRecording();
            }
          
            const mouth = landmarks.getMouth();
            const topLip = mouth[13];
            const bottomLip = mouth[19];
            const lipDistance = Math.abs(topLip.y - bottomLip.y);
            const isTalking = lipDistance > 9.2;
    
            if (isTalking) {
              showSingleToast(' Your Lips are Moving Please Close Your Mouth',"warning");
              setTalkingPercent((prev) => Math.max(0, prev - 3));
              startRecording();
            }
           
    
            if (presencePercent < 10) {
              handleNotPresence();
              showSingleToast(' You are not present, You are Watching Anywhere Else',"error");
            } else if (presencePercent < 40) {
              showSingleToast(' Stay present, Please Watch The Screen. Keep Your Face Centered',"warning");
            }
    
            if (talkingPercent < 10) {
              handleSpeech();
              showSingleToast(' You are talking excessively During This Test',"error");
            } else if (talkingPercent < 40) {
              showSingleToast(' You are talking a bit much, Please Keep Your Mouth Closed',"warning");
            }
            
          }
        }
    
        const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
        const resized = faceapi.resizeResults(detections, dims);
        faceapi.draw.drawDetections(canvasRef.current, resized);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
        if (multifacePercent < 10)
        {
          showSingleToast('Multiple Faces Have Been Detected More Time',"error")
          handleMultiFace();
        }
      };
    
      const getStatusColor = (percent) => {
        if (percent > 70) return '#4ade80'; // Green
        if (percent > 40) return '#fbbf24'; // Yellow
        return '#f87171'; // Red
      };

  useEffect(() => {
    fetch("https://marqueebackend.onrender.com/admin/mcqquestions")
      .then(res => res.json())
      .then(data => {
        setQuestions(data[0].MCQ);
        const words = extractKeywords(data[0].MCQ); // generate from MCQs
        setCKeywords(words);
       });
    
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeTaken(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  useEffect(() => {
  let recognition;

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript.toLowerCase();
        console.log(transcript)
      }

      console.log('Transcript:', transcript);

      if (cKeywords.some(word => transcript.toLowerCase().includes(word))) {
        showSingleToast(' Programming terms spoken, Dont speak The Question',"error");
      }
    };

    recognition.onerror = (e) => console.error('Speech error:', e.error);
    recognition.onend = () => recognition.start(); // restart on end

    recognition.start();
  };

  document.addEventListener("click", startRecognition, { once: true });

  return () => {
    if (recognition) recognition.stop();
  };
  }, []);
   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  
  // ... (keep all your existing useEffect hooks and functions until handleSelect)
  
  const handleSelect = (qIndex, optionIndex) => {
    setAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
    
    // Mark question as answered
    setAnsweredQuestions(prev => {
      const newSet = new Set(prev);
      newSet.add(qIndex);
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuestionNav = (index) => {
    setCurrentQuestionIndex(index);
  };

useEffect(() => {
  const goFullscreen = () => {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  // Add listener for first click
 document.addEventListener("click",goFullscreen)

  return () => document.removeEventListener("click", goFullscreen);
}, []);

  const handleSubmit = async () => {
    const username = localStorage.getItem("token");
    let done = parseInt(localStorage.getItem("done"));
    let department =localStorage.getItem("department");
     let year =   localStorage.getItem("year");
    let section = localStorage.getItem("section");
    done = done + 1;
    setShowCompletionPopup(true);
    const screenshot = captureScreenshot(); 
    const results = questions.map((q, idx) => ({
      question: q.question,
      selected: answers[idx],
      correctAnswer: q.correctAnswer,
      success: answers[idx] == q.correctAnswer,
    }));

    await fetch("https://marqueebackend.onrender.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        results,
        timeTaken,
        malpractice_type: [...new Set(malpracticeType)],
        totalMarks: results.filter(r => r?.success).length,
        test_type: "MCQ",
        malpractice: false,
        done,
        screenshot,
        restrict: false,
        department,
        year,
        section,
        doneTest:"MCQ",
      }),
    });

    localStorage.removeItem("token");
    setExamFinished(true);
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }, 3000);
  };
  useEffect(() => {
    const handleResize = () => {
      setResizeCount((prev) => {
        const newCount = prev + 1;

        if (newCount >=2) {
          showSingleToast(` You have resized the window ${newCount-1} times.`,"info");
        }

        if (newCount >= 5) {
          showSingleToast(" You resized too many times. Logging out.","error");
           handleMalpractice("Window Resize")
        }

        return newCount;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
useEffect(() => {
  const handleBeforeUnload = (e) => {
     if (malpractice || examFinished) {
        return;
      }
    showSingleToast("Please Do Not Refresh The Webage Or The Website", "error");
    if (!malpractice  && !examFinished) {
      handleMalpractice("Closed Test");
      e.preventDefault();
      e.returnValue = "You Have Left or Refreshed The Website It Is A Malpractice.";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [malpractice,examFinished]);

  useEffect(() => {
    const handleCopy = (e) => {
      if (examFinished) return;
      e.preventDefault();
      setMalpractice(true);
      handleMalpractice("Copy Paste");
    };
    const handleBlur = () => {
      if (examFinished) return;
      handleMalpractice("Tab Switch");
    };
   
    
     const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      showSingleToast('please Do Not Press Escape', "warning");
       }
       if (e.keyCode === 122) {
      e.preventDefault();
      showSingleToast('please Do Not Press Escape', "warning");
       }
         if (
    (e.ctrlKey && e.key === "p") || // Print
    (e.ctrlKey && e.key === "s") || // Save
    (e.ctrlKey && e.key === "u") || // View source
    (e.ctrlKey && e.key === "Shift") || // Dev tools
    (e.key === "PrintScreen")       // Print screen
  )  {
          navigator.clipboard.writeText("Screenshots disabled");
          handleMalpractice("Taking ScreenShot");
          showSingleToast('Taking ScreenShot Not Alloweded', "info");
    }
    };
    document.addEventListener("keydown", handleKeyDown);
 
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handleCopy);
    document.addEventListener("cut", handleCopy);

    window.addEventListener("blur", handleBlur);
   
    document.addEventListener("visibilitychange", handleBlur);
     window.history.pushState(null, null, window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

       
    return () => {

      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("visibilitychange", handleBlur);
      window.removeEventListener("blur", handleBlur);
    };
  });

  return (
    <div className="container-fluid mt-4 d-flex">
      {isLoading && (
        <div className="loading-screen">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Loading Exam Environment</h2>
            <p>Setting up Your Face Detection And Speech Detecting Exam Portal...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${progress}%`}}></div>
            </div>
            <span>{progress}% Complete</span>
          </div>
        </div>
      )}
      <div  style={{width:"61vw"}}>
     <div className="exam-header">
        <h2 className="exam-title">MCQ Assessment</h2>
        <div className="exam-timer">
          <i className="bi bi-clock"></i>
          <span>{formatTime(timeTaken)}</span>
        </div>
      </div>
    <ToastContainer />
      

      <div className="questions-panel">
            {malpractice && (
              <div className="malpractice-alert">
                <i className="bi bi-exclamation-triangle"></i>
                <span>Malpractice Detected - Submitting test...</span>
              </div>
            )}

            
        <div className="exam-content">
        <div className="question-navigation">
          <div className="navigation-header">
            <h3>Questions</h3>
            <div className="progress-info ms-2">
              <span className="answered-count">{answeredQuestions.size}</span>
              <span className="total-count">/{questions.length}</span>
            </div>
          </div>
          
          <div className="question-grid">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`nav-item ${currentQuestionIndex === index ? 'active' : ''} ${answeredQuestions.has(index) ? 'answered' : ''}`}
                onClick={() => handleQuestionNav(index)}
              >
                <span className="question-index">{index + 1}</span>
                {answeredQuestions.has(index) && (
                  <span className="answered-indicator">
                    <i className="bi bi-check"></i>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="question-viewer">
          {questions.length > 0 && (
            <div className="question-card neumorphic pb-5">
              <div className="question-header">
                <span className="question-number">Question {currentQuestionIndex + 1} of {questions.length}</span>
                <div className="question-status">
                  {answeredQuestions.has(currentQuestionIndex) ? (
                    <span className="status-badge answered">Answered</span>
                  ) : (
                    <span className="status-badge unanswered">Not Answered</span>
                  )}
                </div>
              </div>
              
              <div className="question-text">
                <h3>{questions[currentQuestionIndex].question}</h3>
              </div>
              
              <div className="options-container">
                {questions[currentQuestionIndex].options.map((option, oIndex) => (
                  <div 
                    key={oIndex} 
                    className={`option-item neumorphic-pressable ${answers[currentQuestionIndex] == oIndex ? 'selected' : ''}`}
                    onClick={() => handleSelect(currentQuestionIndex, oIndex)}
                  >
                    <div className="option-selector">
                      {answers[currentQuestionIndex] == oIndex ? (
                        <div className="option-dot selected">
                          <i className="bi bi-check-circle-fill"></i>
                        </div>
                      ) : (
                        <div className="option-dot">
                          <i className="bi bi-circle"></i>
                        </div>
                      )}
                    </div>
                    <label className="option-label">{option}</label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          
            </div>
            
          </div>
          <div className="navigation-buttons px-5 mx-5 mt-5">
            <button 
              className="nav-btn prev-btn neumorphic"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
            >
              <i className="bi bi-arrow-left"></i>
              Previous
            </button>
            
            <div className="progress-indicator">
              <span>{currentQuestionIndex + 1} of {questions.length}</span>
            </div>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <button 
                className="nav-btn next-btn neumorphic"
                onClick={handleNext}
              >
                Next
                <i className="bi bi-arrow-right"></i>
              </button>
            ) : (
              <button 
                className="submit-exam-btn neumorphic"
                onClick={handleSubmit}
                disabled={questions.length === 0}
              >
                <i className="bi bi-send"></i>
                Submit Test
              </button>
            )}
          </div>
          </div>

      {showPopup && (
        <div className={`malpractice-modal visible`}>
          <div className="modal-content animate__animated animate__headShake">
            <div className="modal-icon">
              <i className="bi bi-exclamation-octagon"></i>
            </div>
            <h3>Malpractice Detected!</h3>
            <p>Your test has been flagged for suspicious activity:</p>
            <ul>
              {malpracticeType.map((type, i) => (
                <li key={i}>{type}</li>
              ))}
            </ul>
            <p>Your test is being submitted automatically.</p>
            <div className="countdown">
              Redirecting in 3 seconds...
            </div>
          </div>
          </div>
        )}
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

        {isMobile && (
        <div className={`malpractice-modal visible`}>
          <div className="modal-content animate__animated animate__headShake">
            <div className="modal-icon">
              <i className="bi bi-exclamation-octagon"></i>
            </div>
            <h3>Mobile Phone Detected</h3>
            <p>Please Ensure You Attend The Test Using Laptop Or An System</p>
            <p>Your test is being Hold</p>
          </div>
        </div>
        )}
        
        {browserError && (
        <div className={`malpractice-modal visible`}>
          <div className="modal-content animate__animated animate__headShake">
            <div className="modal-icon">
              <i className="bi bi-exclamation-octagon"></i>
            </div>
            <h3>Invalid Browser Detected</h3>
            <p>Please Ensure You Have A Chrome Browser To Attend The Test. Test Will Not Available On Other Browsers</p>
            <p>Your test is being Hold</p>
          </div>
        </div>
      )}
          {showCompletionPopup && (
        <div className={`completion-modal visible`}>
          <div className="modal-content animate__animated animate__fadeIn">
            <div className="modal-icon">
              <i className="bi bi-check-circle-fill text-success"></i>
            </div>
            <h3>Test Completed Successfully!</h3>
            <p>Thank you for taking the test. Your responses have been submitted.</p>
            <div className="countdown">
              You will be redirected to login page in 3 seconds...
            </div>
          </div>
        </div>
      )}
      </div>
      <div style={{
      width: '30vw',
        height: '90vh',
        position: 'fixed',
      right:'100px',
      margin: '0.5rem auto',
      padding: '1rem',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, #f0f0f0, #e0e0e0)',
      boxShadow: '10px 10px 20px #d9d9d9, -10px -10px 20px #ffffff',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.2rem',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Face & Speech Analyzer</h1>
        </div>
        </div>
        

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexGrow: 1,
        overflow: 'hidden'
      }}>
          <div style={{
          justifyContent:'center',
          flex: 1,
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '6px 6px 12px #d9d9d9, -6px -6px 12px #ffffff',
            height: '100%',
          background: focusPercent < 90 ? "rgba(255,0,0,0.3)" : "transparent",
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              display: 'block',
              width: '420px',
              height: '350px',
              objectFit: 'cover',
              borderRadius: '12px',
          border: focusPercent < 90 ? "4px solid red" : "4px solid green",
            }}
            />
            <div style={{
            position: 'absolute',
            top:'1rem',
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
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '400px',
              height: '350px',
              borderRadius: '12px'
            }}
            />
          
        </div>
        </div>
        <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon presence">
                  <i className="bi bi-person"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-title">Presence</span>
                  <span className="metric-value" style={{color: getStatusColor(presencePercent)}}>
                    {presencePercent}%
                  </span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{
                      width: `${presencePercent}%`,
                      background: `linear-gradient(90deg, ${getStatusColor(presencePercent)}, ${getStatusColor(presencePercent)}80)`
                    }}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon attention">
                  <i className="bi bi-eye"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-title">Attention</span>
                  <span className="metric-value" style={{color: getStatusColor(focusPercent)}}>
                    {focusPercent}%
                  </span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{
                      width: `${focusPercent}%`,
                      background: `linear-gradient(90deg, ${getStatusColor(focusPercent)}, ${getStatusColor(focusPercent)}80)`
                    }}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon speech">
                  <i className="bi bi-mic"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-title">Talking</span>
                  <span className="metric-value" style={{color: getStatusColor(talkingPercent)}}>
                    {talkingPercent}%
                  </span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{
                      width: `${talkingPercent}%`,
                      background: `linear-gradient(90deg, ${getStatusColor(talkingPercent)}, ${getStatusColor(talkingPercent)}80)`
                    }}
                  ></div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon multiface">
                  <i className="bi bi-people"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-title">Multi-Face</span>
                  <span className="metric-value" style={{color: getStatusColor(multifacePercent)}}>
                    {multifacePercent}%
                  </span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{
                      width: `${multifacePercent}%`,
                      background: `linear-gradient(90deg, ${getStatusColor(multifacePercent)}, ${getStatusColor(multifacePercent)}80)`
                    }}
                  ></div>
                </div>
              </div>
            </div>
        </div>
      </div>
  );
}

export default MCQTest;
