import React, { createContext, useState, useCallback, useEffect } from "react";
import { INITIAL_TAGS, INITIAL_DEVICES } from "../constants/config";

export const SCADAContext = createContext(null);

export const SCADAProvider = ({ children }) => {
  const [tags, setTags] = useState(INITIAL_TAGS);
  const [history, setHistory] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const writeTag = useCallback((key, value) => {
    setTags(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
    setHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), [key]: value }].slice(-100));
  }, []);

  const addCustomTag = useCallback((key, type, value) => {
    setTags(prev => ({
      ...prev,
      [key]: { type, value }
    }));
  }, []);

  useEffect(() => {
    let interval;
    if (simulating) {
      interval = setInterval(() => {
        setTags(prev => {
          const newTags = { ...prev };
          Object.keys(newTags).forEach(k => {
            if (newTags[k].type === 'number' && k !== 'sys/master_power') {
               const variance = (Math.random() - 0.5) * (newTags[k].value * 0.15);
               newTags[k].value = Math.max(0, Number((newTags[k].value + variance).toFixed(1)));
            }
          });
          
          // History tracking for analytics 
          const timeLabel = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
          const snapshot = { time: timeLabel };
          Object.keys(newTags).forEach(k => { snapshot[k] = newTags[k].value; });
          
          setHistory(prevHist => {
             const updated = [...prevHist, snapshot];
             if (updated.length > 25) return updated.slice(updated.length - 25);
             return updated;
          });

          return newTags;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [simulating]);

  const contextValue = {
    tags,
    history,
    isSimulating: simulating,
    isDarkMode,
    setIsDarkMode,
    writeTag,
    addCustomTag,
    devices,
    setDevices,
    setSimulating
  };

  return (
    <SCADAContext.Provider value={contextValue}>
      {children}
    </SCADAContext.Provider>
  );
};
