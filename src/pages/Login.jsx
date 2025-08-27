import { useState } from "react";
import { useNavigate } from "react-router-dom";


export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://marqueebackend.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (parseInt(data.done) >= 2)
          {
              setError(data.message || "You Have Taken Exams Two Times ");
          }
      else if (res.status === 200) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("name", data.name);
        localStorage.setItem("role", data.role);
        localStorage.setItem("done", data.done);
        localStorage.setItem("doneTest", data.doneTest);
        localStorage.setItem("department", data.department);
        localStorage.setItem("year", data.year);
        localStorage.setItem("section", data.section);
        localStorage.setItem("regno", data.regno);

        setShowSuccess(true);
        setTimeout(() => {
          if (data.role === "admin") {
            navigate("/admin");
          }
          else {
            navigate("/dashboard");
          }
        }, 2000);
      }
      else if (res.status == 403)
      {
        setError("You Are Restricted You Have Done Malpractice");
      }
      else {
        setError(data.message || "Invalid credentials");
      }
    } catch (e) {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{height:"100vh"}}>
    <div className="login-container">
      <div className="login-card animate__animated animate__fadeIn">
        <div className="login-header">
          <h2>LOGIN</h2>
          <p>Please enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="text"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="ms-2">Authenticating...</span>
              </>
            ) : (
              "Login"
            )}
          </button>

          {error && (
            <div className="error-modal animate__animated animate__headShake">
              <div className="error-content">
                <i className="bi bi-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {showSuccess && (
        <div className="success-modal-login animate__animated animate__fadeIn">
          <div className="success-content animate__animated animate__zoomIn">
            <div className="success-icon">
              <i className="bi bi-check-circle"></i>
            </div>
            <h3>Login Successful!</h3>
            <p>You will be redirected to your dashboard shortly...</p>
            <div className="progress-bar">
              <div className="progress"></div>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
  );
}