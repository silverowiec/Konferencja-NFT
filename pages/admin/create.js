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
    <Layout title="Create Lecture - POAP Lecture App">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Create New Lecture</h1>
          <Link href="/admin">
            <button className="btn-secondary">Back to Dashboard</button>
          </Link>
        </div>
        
        <LectureForm onLectureCreated={handleLectureCreated} />
        
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