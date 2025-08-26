import { useState, useEffect } from "react";
import axios from "axios";
import RulesModal from "../components/RulesModal";
import * as faceapi from 'face-api.js';
import {
  FilesetResolver,
  ObjectDetector,
} from "@mediapipe/tasks-vision";

export default function TestEntrance() {
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [doneTest, setDoneTest] = useState(localStorage.getItem("doneTest"));
   useEffect(() => {
      const loadModels = async () => {
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
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
     };
     console.log(doneTest)
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
          <div key={test._id} className="test-card animate__animated animate__fadeIn">
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
