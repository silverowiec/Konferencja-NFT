import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout({ children, title = 'POAP Lecture App' }) {
  const [isMounted, setIsMounted] = useState(false);
  const { isLoggedIn, logoutUser } = useAuth();
  
  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Application for lecture POAPs" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header>
        <nav className="container" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0' }}>
          <Link href="/">
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Lecture POAP App</span>
          </Link>
          <div>
            {/* Show admin panel link only for logged-in users */}
            {isLoggedIn && (
              <Link href="/admin" style={{ marginRight: '20px' }}>
                Admin Panel
              </Link>
            )}
            {/* Show login link for non-logged-in users */}
            {!isLoggedIn && (
              <Link href="/admin" style={{ marginRight: '20px' }}>
                Admin Login
              </Link>
            )}
            {/* Show logout button for logged-in users */}
            {isLoggedIn && (
              <button 
                onClick={logoutUser}
                className="btn-secondary"
                style={{ fontSize: '0.9rem', padding: '5px 10px' }}
              >
                Logout
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="container" style={{ minHeight: 'calc(100vh - 160px)', padding: '20px 0' }}>
        {isMounted && children}
      </main>

      <footer style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid #eee' }}>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Lecture POAP App</p>
        </div>
      </footer>
    </div>
  );
}