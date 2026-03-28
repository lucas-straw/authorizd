import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getMe } from './api';
import Layout    from './components/Layout';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Overview  from './pages/Overview';
import Settings  from './pages/Settings';
import ApiKeys   from './pages/ApiKeys';
import Events    from './pages/Events';
import './styles/app.css';

function ProtectedRoute({ merchant, children }) {
  if (!merchant) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [merchant, setMerchant] = useState(undefined); // undefined = loading, null = not authed

  useEffect(() => {
    const token = localStorage.getItem('authorizd_token');
    if (!token) { setMerchant(null); return; }
    getMe()
      .then(({ merchant: m }) => setMerchant(m))
      .catch(() => {
        localStorage.removeItem('authorizd_token');
        setMerchant(null);
      });
  }, []);

  if (merchant === undefined) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#888' }}>
        Loading…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<Login    onAuth={setMerchant} />} />
        <Route path="/register" element={<Register onAuth={setMerchant} />} />

        {/* Protected routes — wrapped in Layout */}
        <Route path="/" element={
          <ProtectedRoute merchant={merchant}>
            <Layout merchant={merchant} onLogout={() => setMerchant(null)}>
              <Overview merchant={merchant} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute merchant={merchant}>
            <Layout merchant={merchant} onLogout={() => setMerchant(null)}>
              <Settings merchant={merchant} onMerchantUpdate={setMerchant} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/api-keys" element={
          <ProtectedRoute merchant={merchant}>
            <Layout merchant={merchant} onLogout={() => setMerchant(null)}>
              <ApiKeys merchant={merchant} onMerchantUpdate={setMerchant} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute merchant={merchant}>
            <Layout merchant={merchant} onLogout={() => setMerchant(null)}>
              <Events />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
