import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout({ children, title = 'POAP Lecture App' }) {
  const [isMounted, setIsMounted] = useState(false);
  const { isLoggedIn, logout, username, isLoading } = useAuth();
  
  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return (
    <div style={{ margin: '0 20%' }}>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Application for lecture POAPs" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header>
        <nav className="container" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0' }}>
          <div className="logo">
            <Link href="/">
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Lecture POAP App</span>
            </Link>
          </div>
          <div>
            {/* QR Scanner link for all users */}
            <Link href="/scan" style={{ marginRight: '20px', display: 'inline-flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '5px' }} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Scan QR Code</span>
            </Link>
            
            {/* Show admin panel link only for logged-in users */}
            {isLoggedIn && (
              <Link href="/admin" style={{ marginRight: '20px' }}>
                Admin Panel
              </Link>
            )}
            {/* Show login link for non-logged-in users */}
            {!isLoading && !isLoggedIn && (
              <Link href="/admin" style={{ marginRight: '20px' }}>
                Admin Login
              </Link>
            )}
            {/* Show logout button for logged-in users */}
            {isLoggedIn && (
              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ marginRight: '15px', fontSize: '0.9rem' }}>
                  Hello, {username || 'Admin'}
                </span>
                <button 
                  onClick={logout}
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.9rem', padding: '5px 10px' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="contract-banner" style={{background:'#fffbe6',border:'1px solid #ffe58f',padding:'10px',margin:'10px 0',borderRadius:'6px',fontWeight:'bold',fontSize:'1rem',color:'#ad8b00'}}>
          Always check the contract address. Official POAP contract address is: <a href={process.env.NEXT_PUBLIC_BLOCK_EXPLORER_ACCOUNT_URL+process.env.NEXT_PUBLIC_CONTRACT_ADDRESS} style={{fontFamily:'monospace'}}>{process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}</a>
        </div>
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