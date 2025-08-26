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

// Languages - Only Python
import "ace-builds/src-noconflict/mode-python";

// Themes
import "ace-builds/src-noconflict/theme-dracula";

// Snippets - Only Python
import "ace-builds/src-noconflict/snippets/python";


function Test() {
  // Load Pyodide script if not already loaded
  useEffect(() => {
    if (!window.loadPyodide) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const activeToastIdRef = useRef(null);
  const [information, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [multifacePercent, setMFPercent] = useState(100);
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [malpractice, setMalpractice] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [malpracticeType, setMalpracticeType] = useState([]);
  const [timeTaken, setTimeTaken] = useState(0);
  const [results, setResults] = useState([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [showPopup, setShowPopup] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  const missCountRef = useRef(0);
  const [focusPercent, setFocusPercent] = useState(100);
  const [presencePercent, setPresencePercent] = useState(100);
  const [talkingPercent, setTalkingPercent] = useState(100);
  const hasSubmittedRef = useRef(false);
  const [deviceError, setDeviceError] = useState(null);
const [code, setCode] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [annotations, setAnnotations] = useState([]);
  const [markers, setMarkers] = useState([]);
    let mobilewarning = 0;
  const detectorRef = useRef(null);
    const [resizeCount, setResizeCount] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
  const [browserError, setBrowserError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [pyodide, setPyodide] = useState(null);

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

  useEffect(() => {
    fetch("https://marqueebackend.onrender.com/admin/codingquestions")
      .then(res => res.json())
      .then(data => {
        console.log("Fetched questions data:", data);
        console.log("Coding questions:", data[0]?.Coding);
        setQuestions(data[0].Coding);
      })
      .catch(error => {
        console.error("Error fetching questions:", error);
        // Set some default questions for testing
        setQuestions([
          {
            question: "Write a function that prints 'Hello, World!'",
            expectedOutput: "Hello, World!\n"
          }
        ]);
      });
  }, []);
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

    
    document.removeEventListener("click", goFullscreen);
  };

  // Add listener for first click
  document.addEventListener("click", goFullscreen);

  return () => document.removeEventListener("click", goFullscreen);
});
  const defaultCode = {
    python: "# Start coding here..."
  };

  // Example error highlighting function for Python
  const validateCode = (code) => {
    const newAnnotations = [];
    const newMarkers = [];
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      // Python-specific validations
      if (line.includes("print(") && !line.trim().endsWith(")")) {
        newAnnotations.push({
          row: index,
          column: line.indexOf("print("),
          text: "Check syntax for print statement",
          type: "warning",
        });
      }
      if (line.includes("def ") && !line.trim().endsWith(":")) {
        newAnnotations.push({
          row: index,
          column: line.indexOf("def "),
          text: "Function definition should end with ':'",
          type: "error",
        });
      }
    });

    setAnnotations(newAnnotations);
    setMarkers(newMarkers);
  };

  useEffect(() => {
    validateCode(code);
  }, [code, language]);

  const handleModeChange = () => {
    // Only Python is supported
    setLanguage("python");
    setCode(defaultCode["python"] || "# Start coding here...");
  };

  const handleFontSizeChange = (e) => {
    setFontSize(parseInt(e.target.value));
  };

  const handleClear = () => {
    setCode("");
  };


  const submitAndLogout = async (detectedType) => {
  if (hasSubmittedRef.current || examFinished) return;
    hasSubmittedRef.current = true;
      setMalpracticeType(prev => [...new Set([...prev, detectedType])]);
    const screenshot = captureScreenshot();
    
    setMalpractice(true);
    setExamFinished(true);
    
    const username = localStorage.getItem("token");
    let done = parseInt(localStorage.getItem("done"))
    let donetest = localStorage.getItem("doneTest");
    let department =localStorage.getItem("department");
     let year =   localStorage.getItem("year");
    let section=  localStorage.getItem("section");


    done = done + 1;
    const resultData = {
      title: information[index].question,
      language,
      expected_output: information[index].expectedOutput,
      success: false,
      malpractice: true,
      malpractice_type: [...new Set([...malpracticeType, detectedType])],
      timeTaken: Math.floor((Date.now() - startTime) / 1000),
    };
     
    const newResults = [...results];
    newResults[index] = resultData;

    await fetch("https://marqueebackend.onrender.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, results: newResults,totalMarks: newResults.filter(r => r?.success).length,test_type:"Coding",malpractice:detectedType,done,restrict:true,screenshot,doneTest:"Coding", department,
        year,
        section,
         })
    });

    
    setShowPopup(true);

    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }, 1500);

  };
  useEffect(() => {
    let timer = setInterval(() => setTimeTaken(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const loadModelsAndPyodide = async () => {
        setIsLoading(true);
      const MODEL_URL = '/models';
      try {
             // Load face detection models
             setProgress(20);
             await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
             
             setProgress(40);
             await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
             
             setProgress(60);
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
             
             // Load Python Runtime
             setProgress(80);
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
             
             setProgress(100);
             setTimeout(() => setIsLoading(false), 500);
             startVideo();
           } catch (error) {
             console.error('Error loading models or Python Runtime:', error);
             setDeviceError("Failed to load detection models or Python Runtime. Please refresh and try again.");
             setIsLoading(false);
           }
         };
     
         loadModelsAndPyodide();
       }, []);

  
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
        }

        console.log('Transcript:', transcript);
        if (transcript.match(/\b(program|code|input|output|print)\b/)) {
          showSingleToast(" Programming terms spoken! Don't Speak Otherwise You Will Be Considered As Malpratice","error");
        }
      };

      recognition.onerror = (e) => console.error('Speech error:', e.error);
      recognition.onend = () => recognition.start(); // restart on end

      recognition.start();
    };

    document.addEventListener("click", startRecognition, { once: true });

    return () => {
      if (recognition) recognition.stop();
    }
  },[])

useEffect(() => {
    const handleCopy = (e) => {
      if (examFinished) return;
      e.preventDefault();
      submitAndLogout("Copy Paste");
    };
    const handleBlur = () => {
      if (examFinished) return;
      submitAndLogout("Tab Switch");
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
          submitAndLogout("Taking ScreenShot");
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

  const captureScreenshot = () => {
  if (!videoRef.current) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

  // Convert to base64 (PNG)F
  const imageData = canvas.toDataURL('image/png');
  return imageData;
  };
  

   useEffect(() => {
    const interval = setInterval(() => {
      handleDetection();
    }, 500);

    return () => clearInterval(interval);
   }, [focusPercent, presencePercent, talkingPercent, multifacePercent]);
  
  useEffect(() => {
      const handleResize = () => {
        setResizeCount((prev) => {
          const newCount = prev + 1;
  
          if (newCount >=2) {
            showSingleToast(` You have resized the window ${newCount-1} times.`,"info");
          }
  
          if (newCount >= 7) {
            showSingleToast(" You resized too many times. Logging out.","error");
             submitAndLogout("Window Resize")
          }
  
          return newCount;
        });
      };
  
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
  });
  
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (malpractice || examFinished) {
        return;
      }
     
      showSingleToast("Please Do Not Refresh The Webage Or Close The Website", "error");
      if (!malpractice && !examFinished) {
      submitAndLogout("Closed Test");
        e.preventDefault();
        e.returnValue = "You Have Left or Refreshed The Website It Is A Malpractice.";
      }
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  });
  
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
          submitAndLogout(`Invalid Device`);
        }, 2000);
      } else {
        setIsMobile(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  });
  


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

  const handleMultiFace = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "Multiple Faces Detected"])]);
      await submitAndLogout("MultiFace Detected");
    };

    const handleNotPresence = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "SideView Copy"])]);
      await submitAndLogout("SideView Copy");
  }
  const handleCameraOff = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "Camera Off"])]);
      await submitAndLogout("Camera Off");
    }

    const handleSpeech = async () => {
      if (examFinished) return;
      setMalpractice(true);
      setMalpracticeType(prev => [...new Set([...prev, "Talking With Others"])]);
      await submitAndLogout("Talking");
  }
  
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
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (detections.length === 0) {
      missCountRef.current += 1;
      if (missCountRef.current >= 3) {
        if (presencePercent < 10) {
           handleCameraOff();
          showSingleToast("You Are Not Present, You Are Watching Anywhere Else", "error");
        }
        else if (presencePercent < 40) {
          showSingleToast("Please Focus On The Exam Keep Your Eyes On The Screen","warning");
        }
        startRecording();
        setFocusPercent(0);
        setPresencePercent((prev) => prev - 2);
      }
      
    } else {
      missCountRef.current = 0;

      if (detections.length > 1) {
        setFocusPercent(0);
        showSingleToast(' Multiple Faces detected Please Attend The Test In A Isolated Environment',"error");
        setMFPercent(prev => prev - 5);
        startRecording();
      } else {
        const detection = detections[0];
        const landmarks = detection.landmarks;

        const focus = calculateFocus(landmarks);
        setFocusPercent(focus);
        
        if (focus <= 92)
        {
          startRecording();
          showSingleToast('Face Not Centered Please Keep Your Face Centered',"info");
        setPresencePercent(presencePercent-3);
          
        }

        const mouth = landmarks.getMouth();
        const topLip = mouth[13];
        const bottomLip = mouth[19];
        const lipDistance = Math.abs(topLip.y - bottomLip.y);
        const isTalking = lipDistance > 6;

        if (isTalking) {
          startRecording();
          showSingleToast(' Your Lips are Moving Please Close Your Mouth',"warning");
          setTalkingPercent((prev) => Math.max(0, prev - 3));
        }

        if (presencePercent < 10) {
           showSingleToast(' You are not present, You are Watching Anywhere Else',"error");
          handleNotPresence();
        } else if (presencePercent < 40) {
            showSingleToast(' Stay present, Please Watch The Screen. Keep Your Face Centered',"warning");
        }

        if (talkingPercent < 10) {
          showSingleToast(' You are talking excessively During This Test',"error");
          handleSpeech();
        } else if (talkingPercent < 40) {
           showSingleToast(' You are talking a bit much, Please Keep Your Mouth Closed',"warning");
        }
      }
    }
    if (multifacePercent < 10)
        {
          showSingleToast('Multiple Faces Have Been Detected More Time',"error")
          handleMultiFace();
        }
    const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
    const resized = faceapi.resizeResults(detections, dims);
    faceapi.draw.drawDetections(canvasRef.current, resized);
    faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
  }

  const getStatusColor = (percent) => {
    if (percent > 70) return '#4ade80'; // Green
    if (percent > 40) return '#fbbf24'; // Yellow
    return '#f87171'; // Red
  };

  const handleCompile = async () => {
    console.log("handleCompile called, pyodide state:", pyodide);
    
    if (!pyodide) {
      setOutput("❌ Python Runtime not loaded yet. Please wait...");
      console.log("Python Runtime not loaded yet");
      return;
    }

    const endTime = Date.now();
    const question = information[index];
    
    console.log("Current question object:", question);
    console.log("Expected output:", question?.expectedOutput);
    console.log("Expected output type:", typeof question?.expectedOutput);
    
    if (!question) {
      setOutput("❌ Error: No question data available");
      return;
    }
    
    try {
      console.log("Executing code:", code);
      
      // Capture stdout
      let output = "";
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `);

      // Execute user code
      pyodide.runPython(code);
      
      // Get the output
      output = pyodide.runPython("sys.stdout.getvalue()");
      
      // Reset stdout
      pyodide.runPython("sys.stdout = sys.__stdout__");
      
      console.log("Code execution output:", output);
      
      // Check if output matches expected output
      const expectedOutput = question.expectedOutput ? String(question.expectedOutput).trim() : "";
      const actualOutput = output ? String(output).trim() : "";
      const success = actualOutput === expectedOutput;
      
      console.log("Expected:", expectedOutput);
      console.log("Actual:", actualOutput);
      console.log("Success:", success);
      
      setOutput(success ? `✅ ${output}` : `❌ Expected: ${expectedOutput}\nGot: ${actualOutput}`);
      
      const questionTime = Math.floor((endTime - startTime) / 1000);

      const resultData = {
        title: information[index].question,
        code,
        language: "python",
        expected_output: question.expectedOutput || "",
        output: actualOutput,
        success: success,
        malpractice,
        malpractice_type: malpracticeType,
        timeTaken: questionTime
      };

      const newResults = [...results];
      newResults[index] = resultData;
      setResults(newResults);

    } catch (error) {
      console.error("Code execution error:", error);
      setOutput(`❌ Error: ${error.message}`);
      
      const questionTime = Math.floor((endTime - startTime) / 1000);
      const resultData = {
        title: information[index].question,
        code,
        language: "python",
        expected_output: question.expectedOutput || "",
        output: `Error: ${error.message}`,
        success: false,
        malpractice,
        malpractice_type: malpracticeType,
        timeTaken: questionTime
      };

      const newResults = [...results];
      newResults[index] = resultData;
      setResults(newResults);
    }

    setStartTime(Date.now());
  };


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuestionChange = (newIndex) => {
    setIndex(newIndex);
    setOutput("");
    setCode("")
  };

    

  const handleFinishExam = async () => {
    const username = localStorage.getItem("token");
    let done = parseInt(localStorage.getItem("done"));
    let department =localStorage.getItem("department");
     let year =   localStorage.getItem("year");
    let section=  localStorage.getItem("section");
    
    

    const screenshot = captureScreenshot();
    setExamFinished(true);
    done = done + 1;
    await fetch("https://marqueebackend.onrender.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username, results: results,totalMarks: results.filter(r => r?.success).length,test_type:"Coding",malpractice:false,done,screenshot, department,
        year,
        section,
        restrict:false,
        doneTest:"Coding",
       })
    });
    
    setShowCompletionPopup(true);
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }, 4000);
  };

  return (
    <div className="test-container">
      <ToastContainer></ToastContainer>
    {isLoading && (
        <div className="loading-screen">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Loading Exam Environment</h2>
            <p>Setting up Face Detection and Python Runtime...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${progress}%`}}></div>
            </div>
            <span>{progress}% Complete</span>
          </div>
        </div>
      )}
      <div className="main-content p-0">
        {information.length > 0 ? (
          <div className="row g-4 p-4">
            <div className="col-md-5 d-flex flex-column justify-content-evenly">
              <div className="question-card glass-card">
                <div className="question-data">
                  <h3 className="question-title">
                  Question {index + 1} of {information.length} 
                </h3>
                <div className="txt">
                  {information[index].question}
                </div>
                <div className="output-container">
                  <h5>Output:</h5>
                  <pre className={`output ${output.includes("✅") ? 'success' : output.includes("❌") ? 'error' : ''}`}>
                    {output || "Your output will appear here..."}
                  </pre>
                  </div>
                </div>
               <div className="navigation-footer mt-5">
        <button 
          className="btn btn-outline-primary"
          disabled={index === 0}
          onClick={() => handleQuestionChange(index - 1)}
        >
          <i className="bi bi-arrow-left"></i> Previous
        </button>
        
        <button 
          className="btn btn-success"
          onClick={handleFinishExam}
        >
          <i className="bi bi-check-circle"></i> Finish Exam
        </button>
        
        <button 
          className="btn btn-outline-primary"
          disabled={index === information.length - 1}
          onClick={() => handleQuestionChange(index + 1)}
        >
          Next <i className="bi bi-arrow-right"></i>
        </button>
      </div>  
              </div>
            </div>

            <div className="col-md-7">
              <div className="code-editor-container glass-card">
                <div className="editor-header">
                  <select
            id="language-select"
            value={language}
            onChange={handleModeChange}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
            disabled
          >
            <option value="python">Python (Client-side)</option>
                  </select>
                  <div>
          <label htmlFor="font-size" className='me-2'>Font Size: </label>
          <select
            id="font-size"
            value={fontSize}
                      onChange={handleFontSizeChange}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value={12}>12px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
            <option value={20}>20px</option>
            <option value={24}>24px</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleClear}
            style={{
              padding: "8px 12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
                  
                  <button 
                    className={`btn ${pyodide ? 'btn-primary' : 'btn-secondary'} compile-btn`}
                    onClick={() => {
                      console.log("Run Code button clicked");
                      handleCompile();
                    }}
                    disabled={!pyodide}
                    title={pyodide ? 'Python Runtime ready' : 'Loading Python Runtime...'}
                  >
                    <i className="bi bi-play-fill"></i> {pyodide ? 'Run Code' : 'Loading Python Runtime...'}
                  </button>
                  <div className="time-display">
          <i className="bi bi-clock"></i> {formatTime(timeTaken)}
        </div>
                </div>
                
                <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          margin: "0 auto",
          maxWidth: "90vw",
        }}
      >
        <AceEditor
          mode="python"
          theme="dracula"
          name="UNIQUE_ID_OF_DIV"
          onChange={setCode}
          value={code}
          fontSize={fontSize}
          width="100%"
          height="250px"
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          placeholder="Write your code here..."
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            useWorker: true,
            behavioursEnabled: true,
            displayIndentGuides: true,
          }}
          annotations={annotations}
          markers={markers}
        />
      </div>
      </div>
              </div>
            </div>
            <div className='facescan'>
              <div style={{
      maxWidth: '90vw',
      height: '45vh',
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
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '6px 6px 12px #d9d9d9, -6px -6px 12px #ffffff',
                    height: '100%',
          background: focusPercent < 93 ? "rgba(255,0,0,0.3)" : "transparent",
          
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              display: 'block',
              width: '470px',
              height: '340px',
              objectFit: 'cover',
                borderRadius: '12px',
          border: focusPercent < 93 ? "4px solid red" : "4px solid green",

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
        <div className="metrics-grid" style={{width:"40%"}}>
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
                  <span className="metric-title">Speech</span>
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
                  <div style={{
            marginTop: '0.5rem',
            padding: '0.6rem',
            borderRadius: '8px',
            background: 'linear-gradient(145deg, #f0f0f0, #e0e0e0)',
          boxShadow: '4px 4px 8px #d9d9d9, -4px -4px 8px #ffffff',
          }}>
            <h4 style={{
              margin: '0 0 0.3rem',
              fontSize: '1rem',
              color: '#334155',
              fontWeight: '600'
            }}>Guidelines</h4>
            <ul style={{
              margin: 0,
              paddingLeft: '1rem',
              fontSize: '0.92rem',
              color: '#64748b',
              lineHeight: '1.6'
            }}>
              <li>Don't Look Away, View The Screen</li>
              <li>Single person Must Take The Exam</li>
              <li>Don't Talk While Taking Exam</li>
              <li>Don't Copy Question</li>
              <li>Don't Switch Tab Or Minimize Screen</li>
              <li>Don't Refresh Or Close Tab</li>
              <li>Don't Use Mobile </li> 
            </ul>
          </div>
                </div>
                
              </div>

        </div>
        </div>
        ) : (
          <div className="loading-placeholder">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading questions...</p>
          </div>
        )}
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
  );
}

export default Test;