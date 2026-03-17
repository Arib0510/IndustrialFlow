import React, { useEffect, useRef, useContext } from 'react';
import Gauge from 'svg-gauge'; // Ensure this is installed via npm or linked correctly
import { SCADAContext } from '../../context/SCADAContext';

export const GaugeWidget = ({ node }) => {
  const { tags } = useContext(SCADAContext);
  const gaugeContainerRef = useRef(null);
  const gaugeInstanceRef = useRef(null);

  // Retrieve real-time data or fallback to 0
  const tagKey = node.boundTag;
  const currentValue = (tagKey && tags[tagKey]) ? Number(tags[tagKey].value) : 0;
  
  // Customization props from Inspector
  const color = node.color || '#3B82F6';
  const name = node.name || 'Analog Gauge';
  const unit = node.unit || '';

  // ── Initialize svg-gauge on Mount
  useEffect(() => {
    if (!gaugeContainerRef.current) return;

    // Create the Vanilla JS gauge instance
    gaugeInstanceRef.current = Gauge(gaugeContainerRef.current, {
      max: 100, // Can be dynamic if you add a max property to Inspector
      min: 0,
      dialStartAngle: 135,
      dialEndAngle: 45,
      value: 0,
      color: function(value) {
        // Optional dynamic color mapping based on value ranges
        if(value < 20) return '#10b981'; // Green
        if(value > 80) return '#ef4444'; // Red
        return color; // The color picked in the Inspector
      },
      label: function(value) {
        return Math.round(value) + " " + unit;
      }
    });

    return () => {
      // Cleanup DOM on unmount to prevent duplicates if React strictly re-renders
      if (gaugeContainerRef.current) {
         gaugeContainerRef.current.innerHTML = '';
      }
    };
  }, [color, unit]); // Re-initialize if theming changes

  // ── Update Vanilla JS Instance when SCADA Context Changes
  useEffect(() => {
    if (gaugeInstanceRef.current) {
      // 1-second animation duration to match your simulator interval
      gaugeInstanceRef.current.setValueAnimated(currentValue, 1);
    }
  }, [currentValue]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none p-2 relative">
      <div 
        ref={gaugeContainerRef} 
        className="w-full flex-1"
        style={{ pointerEvents: 'auto' }} // Allows gauge tooltips if any
      />
      <div 
        className="absolute bottom-2 text-[10px] font-bold tracking-widest uppercase text-center w-full" 
        style={{ color: 'var(--text-secondary)' }}
      >
        {name}
      </div>
    </div>
  );
};