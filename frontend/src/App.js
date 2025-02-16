import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PropertyList from './pages/PropertyList';
import AreaAnalysis from './pages/AreaAnalysis';
import PropertyValuation from './pages/PropertyValuation';

function App() {
  return (
    <Router>
      <Navbar />
      <Container>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/properties" element={<PropertyList />} />
          <Route path="/area-analysis" element={<AreaAnalysis />} />
          <Route path="/valuation" element={<PropertyValuation />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App; 