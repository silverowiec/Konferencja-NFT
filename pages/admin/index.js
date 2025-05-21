import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import LectureList from '../../components/admin/LectureList';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  
  // Force refresh of lecture list
  const refreshLectures = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  // If not logged in, show login form
  if (!isLoggedIn) {
    return (
      <Layout title="Admin Login - CoNFT System">
        <div>
          <h1 style={{ marginBottom: '20px' }}>Admin Authentication Required</h1>
          <LoginForm />
        </div>
      </Layout>
    );
  }
  
  // If logged in, show admin dashboard
  return (
    <Layout title="Admin Dashboard - CoNFT System">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#00838f', fontWeight: 700, fontSize: '2rem', letterSpacing: '-1px', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>Admin Dashboard</h1>
          <div>
            <button onClick={refreshLectures} style={{ marginRight: '10px', background: '#fff', color: '#00838f', border: '1.5px solid #00838f', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', padding: '8px 18px', cursor: 'pointer', transition: 'background 0.2s' }}>
              Refresh Lectures
            </button>
            <Link href="/admin/create">
              <button className="btn-success" style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', padding: '8px 18px', cursor: 'pointer', transition: 'background 0.2s' }}>Create New Lecture</button>
            </Link>
          </div>
        </div>
        <div className="card" style={{ background: '#e0f7fa', border: '1.5px solid #00838f', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', color: '#00838f', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,131,143,0.07)', padding: '18px 20px' }}>
          <p>
            Welcome to the admin dashboard. Here you can manage lectures and generate QR codes
            for attendees to claim their POAPs.
          </p>
        </div>
        <LectureList refresh={refreshKey} />
      </div>
    </Layout>
  );
}