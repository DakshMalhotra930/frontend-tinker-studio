import React, { useEffect } from "react";

// Use your Google Client ID
const GOOGLE_CLIENT_ID = "621306164868-21bamnrurup0nk6f836fss6q92s04aav.apps.googleusercontent.com";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://praxisai-rho.vercel.app/"; 

const GoogleLogin = ({ onLogin }) => {
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large" }
      );
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      console.log("Loading Google Sign-In script...");
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    }
  }, []);

  const handleCredentialResponse = (response) => {
    fetch(`${API_BASE_URL}/api/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: response.credential }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Login failed");
        return res.json();
      })
      .then((data) => {
        // Validate that the backend response contains the required fields
        if (!data.user_id || !data.email || !data.name) {
          throw new Error("Invalid login response: missing user data");
        }
        
        // Create user object with consistent data structure
        const userData = {
          user_id: data.user_id,
          email: data.email,
          name: data.name,
        };
        
        onLogin(userData); // Pass user info to parent
        console.log("Login successful:", userData);
      })
      .catch((error) => {
        console.error("Login failed:", error);
        alert(`Login failed: ${error.message}`);
      });
      console.log("Google Sign-In response:", response);
  };

  return <div id="google-signin-button"></div>;
};

export default GoogleLogin;
