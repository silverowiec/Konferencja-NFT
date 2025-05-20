import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/common/Layout';
import LectureForm from '../../components/admin/LectureForm';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateLecture() {
  const router = useRouter();
  const [createdLectureId, setCreatedLectureId] = useState(null);
  const { isLoggedIn } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn && typeof window !== 'undefined') {
      router.replace('/admin');
    }
  }, [isLoggedIn, router]);
  
  // Handle lecture creation success
  const handleLectureCreated = (lectureId) => {
    setCreatedLectureId(lectureId);
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
  
  return (
    <Layout title="Create New Lecture - POAP Lecture App">
      <div>
        <h1 style={{ color: '#00838f', fontWeight: 700, fontSize: '2rem', letterSpacing: '-1px', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif', marginBottom: '24px' }}>Create New Lecture</h1>
        <div className="card" style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,131,143,0.07)', border: '1px solid #e0f7fa', marginBottom: '32px', padding: '28px 24px' }}>
          <LectureForm onLectureCreated={handleLectureCreated} />
        </div>
        
        {createdLectureId && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Lecture Created Successfully!</h3>
            <p>Your lecture has been created with ID: {createdLectureId}</p>
            <p>
              <Link href="/admin">
                <button style={{ marginRight: '10px' }}>Go to Dashboard</button>
              </Link>
              <button 
                className="btn-success" 
                onClick={() => router.push(`/admin?highlight=${createdLectureId}`)}
              >
                Generate QR Code
              </button>
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}