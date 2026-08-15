import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardHera from './pages/DashboardHera';
import FaunaMonitoring from './pages/FaunaMonitoring';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardHera />} />
        <Route path="/fauna" element={<FaunaMonitoring />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
