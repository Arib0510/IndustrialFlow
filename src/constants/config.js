import { Activity, Zap, Thermometer, Droplets, Wind, Sun, Battery, Box, Layers, Cpu, Lightbulb, Fan, AirVent, Tv, Blinds, CarFront, Bot, Cylinder, Compass, Power, CircleDot, Type, SlidersHorizontal, Lock as LockIcon, AlertTriangle, Gauge, ToggleRight, Hash } from "lucide-react";

export const INITIAL_TAGS = {
  "sys/master_power": { value: 1, type: "boolean" },
  "power/main_watts": { value: 1450, type: "number" },
  "power/solar_yield": { value: 3200, type: "number" },
  "power/ev_charge": { value: 45, type: "number" },
  "ac/power": { value: 1, type: "boolean" },
  "ac/temp": { value: 22, type: "number" },
  "sensor/live_temp": { value: 24.5, type: "number" },
  "sensor/humidity": { value: 45, type: "number" },
  "factory/tank_level": { value: 65, type: "number" },
  "factory/pump_active": { value: 1, type: "boolean" },
  "factory/exhaust_fan": { value: 1, type: "boolean" },
  "factory/main_valve": { value: 0, type: "boolean" },
  "factory/pressure": { value: 85, type: "number" },
  "security/front_door": { value: 0, type: "boolean" },
  "security/motion_pir": { value: 1, type: "boolean" },
  "weather/wind_dir": { value: 180, type: "number" },
  "system/status_msg": { value: "All Systems Nominal", type: "string" }
};

export const INITIAL_DEVICES = [
  {
    category: "Industrial & Factory",
    devices: [
      { id: "dev_factory", name: "Pump Station", location: "Sector 4", iconKey: "Cylinder", props: [{ key: "factory/pump_active", name: "Pump Power", type: "boolean" }, { key: "factory/tank_level", name: "Tank Volume", type: "number", unit: "%" }] },
      { id: "dev_exhaust", name: "Ventilation", location: "Roof", iconKey: "Fan", props: [{ key: "factory/exhaust_fan", name: "Fan Power", type: "boolean" }] },
      { id: "dev_pipeline", name: "Main Pipeline", location: "Sector 1", iconKey: "ToggleRight", props: [{ key: "factory/main_valve", name: "Valve State", type: "boolean" }, { key: "factory/pressure", name: "PSI Level", type: "number", unit: "PSI" }] }
    ]
  },
  {
    category: "Energy & Power",
    devices: [
      { id: "dev_solar", name: "Solar Array", location: "Grid A", iconKey: "Sun", props: [{ key: "power/solar_yield", name: "Current Yield", type: "number", unit: "W" }] },
      { id: "dev_ev", name: "EV Charger", location: "Garage", iconKey: "Zap", props: [{ key: "power/ev_charge", name: "Charge Level", type: "number", unit: "%" }] }
    ]
  },
  {
    category: "Climate & Environment",
    devices: [
      { id: "dev_ac", name: "Master AC", location: "Zone 1", iconKey: "AirVent", props: [{ key: "ac/power", name: "AC Power", type: "boolean" }, { key: "ac/temp", name: "Target Temp", type: "number", unit: "°C" }] },
      { id: "dev_sensor", name: "Room Sensor", location: "Zone 1", iconKey: "Cpu", props: [{ key: "sensor/live_temp", name: "Live Temp", type: "number", unit: "°C" }, { key: "sensor/humidity", name: "Humidity", type: "number", unit: "%" }] },
    ]
  }
];

export const ICON_MAP = { Activity, Zap, Thermometer, Droplets, Wind, Sun, Battery, Box, Layers, Cpu, Lightbulb, Fan, AirVent, Tv, Blinds, CarFront, Bot, Cylinder, Compass, Power, CircleDot, Type, SlidersHorizontal, LockIcon, AlertTriangle, Gauge, ToggleRight, Hash };
