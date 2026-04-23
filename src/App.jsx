/**
 * ============================================================================
 * ENTERPRISE SCADA & IOT DASHBOARD - MODULARIZED
 * Features: Diagram editor, real-time data visualization, device management
 * ============================================================================
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "jointjs/dist/joint.css";

import { SCADAProvider } from "./context/SCADAContext";
import { MainLayout } from "./layouts/MainLayout";
import { EditorPage } from "./pages/EditorPage";

export default function App() {
  return (
    <SCADAProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/editor" replace />} />
            <Route path="editor" element={<EditorPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SCADAProvider>
  );
}
