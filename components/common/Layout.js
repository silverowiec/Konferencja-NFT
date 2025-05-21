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
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Application for lecture POAPs" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header style={{ background: '#fff', borderBottom: '1.5px solid #e0f7fa', marginBottom: 0 }}>
        <nav className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>
          <div className="logo">
            <Link href="/">
              <span style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#00838f', letterSpacing: '-1px' }}>CoNFT System</span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* QR Scanner link for all users */}
            <Link href="/scan"                 style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}
            >
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
              <Link href="/admin" style={{ color: '#00838f', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', padding: '8px 14px', borderRadius: '7px', transition: 'background 0.2s' }}>
                Admin Panel
              </Link>
            )}
            {/* Show login link for non-logged-in users */}
            {!isLoading && !isLoggedIn && (
              <Link href="/admin" style={{ color: '#00838f', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', padding: '8px 14px', borderRadius: '7px', transition: 'background 0.2s' }}>
                Admin Login
              </Link>
            )}
            {/* Show logout button for logged-in users */}
            {isLoggedIn && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.97rem', color: '#00838f', fontWeight: 500 }}>
                  Hello, {username || 'Admin'}
                </span>
                <button
                  onClick={logout}
                  type="button"
                  className="btn-secondary"
                  style={{ background: '#fff', color: '#00838f', border: '1.5px solid #00838f', borderRadius: '7px', fontWeight: 600, fontSize: '1rem', padding: '7px 16px', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="container" style={{ minHeight: 'calc(100vh - 160px)', padding: '20px 0', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>
        <div
          className="card"
          style={{
            background: '#e0f7fa',
            border: '1.5px solid #00838f',
            fontWeight: 'bold',
            fontSize: '1rem',
            color: '#00838f',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
            borderRadius: '10px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,131,143,0.07)',
            padding: '18px 20px',
          }}
        >
          Always check the smartcontract address. Official <b>IOEC 2025 POAP</b> smartcontract address is:{' '}
          <a
            href={
              process.env.NEXT_PUBLIC_BLOCK_EXPLORER_ACCOUNT_URL +
              process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
            }
            style={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              display: 'inline-block',
              maxWidth: '100%',
              verticalAlign: 'bottom',
              color: '#00838f',
              textDecoration: 'underline',
              fontWeight: 600,
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
          </a><br />(click to see the history of transactions carried out by this contract)


        </div>
        {isMounted && children}
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 0', borderTop: '1.5px solid #e0f7fa', background: '#fff', color: '#00838f', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif', fontWeight: 500, fontSize: '1.05rem' }}>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} CoNFT System</p>
        </div>
      </footer>
      <style jsx>{`
        @media (max-width: 600px) {
          .card a {
            word-break: break-all;
            overflow-wrap: break-word;
            display: inline-block;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}