import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { X } from "lucide-react";
import { CustomDropdown } from "../ui/CustomDropdown";

const AddDeviceModal = ({ onClose, onAdd }) => {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Industrial & Factory");
  const cats = ["Industrial & Factory", "Energy & Power", "Climate & Environment"];

  const inputSt = {
    backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 8, padding: '8px 12px',
    fontSize: 12, outline: 'none', width: '100%',
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-80 rounded-2xl shadow-2xl theme-transition" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Add Device</span>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-secondary)' }}>Device Name</label>
            <input style={inputSt} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pump A" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-secondary)' }}>Location / Sector</label>
            <input style={inputSt} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sector 2" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-secondary)' }}>Category</label>
            <CustomDropdown value={category} options={cats.map(c => ({ label: c, value: c }))} onChange={setCategory} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
          <button onClick={() => { if (name) { onAdd({ id: uuidv4(), name, location, category, iconKey: 'Box', props: [] }); onClose(); } }} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>Add</button>
        </div>
      </div>
    </div>
  );
};

export default AddDeviceModal;
