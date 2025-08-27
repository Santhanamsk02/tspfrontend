import axios from "axios";
import RulesModal from "../components/RulesModal";
import React, { useEffect, useState,useRef, useId } from 'react';
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


export default function TestEntrance() {
    const detectorRef = useRef(null);
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [doneTest, setDoneTest] = useState(localStorage.getItem("doneTest"));
    const [pyodide, setPyodide] = useState(null);
  
  const id = useId();
    useEffect(() => {
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }, []);
  
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
      };
      startVideo();
           loadModels();
         }, []);
  
  const startVideo = async () => {
    try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
  } catch (err) {
    console.error("Permission denied or error:", err);
  }
  }
  
  useEffect(() => {
    const fetchAllTests = async () => {
      try {
        const response = await axios.get("https://marqueebackend.onrender.com/admin/tests"); // Call to your backend
        setTests(response.data);
      } catch (err) {
        console.error("Error fetching tests:", err);
      }
    };
    fetchAllTests();
    
  }, []);

  const handleStartTest = (test) => {
    setSelectedTest(test);
    setShowModal(true);
    
  };
  

  return (
    <div className="test-entrance-container">
      {tests.map((test, index) =>
      {
        let btnclass='start-test-btn'
        if (test.TestType == doneTest)
        {
          btnclass='hide-test-btn'   
        }
        return (
          <div key={index} className="test-card animate__animated animate__fadeIn">
          <div className="test-header">
            <h2><i className="bi bi-journal-text me-2"></i>{test.TestName}</h2>
            <div className="test-badge">New</div>
          </div>

          <div className="test-details">
            <div className="test-info">
              <i className="bi bi-card-heading"></i>
              <span>{test.TestType} Test</span>
            </div>
            <div className="test-info">
              <i className="bi bi-clock"></i>
              <span>{test.Time} Minutes Duration</span>
            </div>
            <div className="test-info">
              <i className="bi bi-question-circle"></i>
              <span>{test.TotalQuestions} Questions</span>
            </div>
          </div>

          <button
            className={`${btnclass}`}
            onClick={() => handleStartTest(test)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            disabled={test.TestType==doneTest}
          >
            <span className={hoveredIndex === index ? "animate__animated animate__pulse" : ""}>
              <i className="bi bi-arrow-right-circle me-2"></i>
              Start Test Now
            </span>
          </button>
        </div>
        )
      }
      )}

      {showModal && <RulesModal test={selectedTest} onClose={() => setShowModal(false)} />}
    </div>
  );
}
