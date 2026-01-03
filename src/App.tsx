import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Repository from './pages/Repository';
import Editor from './pages/Editor';
import PostView from './pages/PostView';
import ScrollToTop from './components/ScrollToTop';
import AIAssistant from './components/AIAssistant';
import { supabase } from './lib/supabase';

function App() {
  useEffect(() => {
    // Record Site Visit (Once per session)
    const recordVisit = async () => {
        if (!sessionStorage.getItem('khaliq_visited')) {
            try {
                await supabase.rpc('increment_site_visit');
                sessionStorage.setItem('khaliq_visited', 'true');
            } catch (e) {
                console.error("Analytics Error", e);
            }
        }
    };
    recordVisit();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary font-sans flex flex-col transition-colors duration-300">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/repo" element={<Repository />} />
            <Route path="/post/:id" element={<PostView />} />
            <Route path="/editor/:id" element={<Editor />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTop />
        <AIAssistant />
      </div>
    </Router>
  );
}

export default App;
