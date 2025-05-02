import { useState } from 'react';
import { authenticate } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    // Authenticate
    const isAuthenticated = authenticate(username, password);
    
    if (isAuthenticated) {
      login(true);
    } else {
      setError('Invalid username or password');
    }
  };
  
  return (
    <div className="card">
      <h2>Admin Login</h2>
      {error && <p className="error">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        
        <button type="submit">Login</button>
      </form>
    </div>
  );
}