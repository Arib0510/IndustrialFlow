import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Your Tailwind CSS

// YOU MUST ADD THESE TWO LINES TO FIX THE OVERLAPPING CARDS
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)