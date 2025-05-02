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
      <Layout title="Admin Login - POAP Lecture App">
        <div>
          <h1 style={{ marginBottom: '20px' }}>Admin Authentication Required</h1>
          <LoginForm />
        </div>
      </Layout>
    );
  }
  
  // If logged in, show admin dashboard
  return (
    <Layout title="Admin Dashboard - POAP Lecture App">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Admin Dashboard</h1>
          <div>
            <button onClick={refreshLectures} style={{ marginRight: '10px' }}>
              Refresh Lectures
            </button>
            <Link href="/admin/create">
              <button className="btn-success">Create New Lecture</button>
            </Link>
          </div>
        </div>
        
        <div className="card">
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