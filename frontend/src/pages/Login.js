import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Import the new styles

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);

      // Redirect based on role
      const role = res.data.role;
      if (role === 'student') navigate('/student');
      else if (role === 'department') navigate('/department');
      else if (role === 'admin') navigate('/admin');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Branding */}
      <div className="login-left">
        <h1 className="brand-title">University Clearance System</h1>
        <p className="brand-subtitle">
          Streamlined digital clearance for students and staff. Log in to manage your account.
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Please enter your details to sign in.</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <button type="submit" className="login-btn">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;