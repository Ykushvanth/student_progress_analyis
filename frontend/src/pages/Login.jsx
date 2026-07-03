import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import '../styles/Login.css';

const RESEND_COOLDOWN_SECONDS = 60;

function getOtpErrorMessage(message) {
  if (!message || message === '{}' || message === '[object Object]') {
    return 'Failed to send OTP. Please check your Supabase SMTP configuration or wait if you hit rate limits.';
  }

  if (/rate limit/i.test(message)) {
    return 'Email rate limit exceeded. Supabase allows about 4 OTP emails per hour per address on the free plan. Wait up to an hour before trying again, or set up custom SMTP in Supabase (Settings → Auth → SMTP) to remove this limit.';
  }

  return message;
}

export function Login() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { setUserData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSendOtp(e) {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (resendCooldown > 0) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('Sending OTP to:', email.trim());

      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim()
      });

      console.log('OTP Response:', { data, error: otpError });

      if (otpError) {
        console.error('OTP Error:', otpError);
        throw new Error(otpError.message);
      }

      console.log('OTP sent successfully');
      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setError('');
    } catch (err) {
      console.error('Caught error:', err);
      const errorMsg = getOtpErrorMessage(err.message);
      console.log('Error message to display:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      if (!data.session) {
        throw new Error('Failed to create session');
      }

      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);

      console.log('Fetching user data from /auth/me');
      console.log('Access token:', data.session.access_token?.substring(0, 20) + '...');

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const userData = await response.json();
      console.log('User data received:', userData);

      if (!userData.user || !userData.user.roles) {
        console.error('Invalid user data structure:', userData);
        throw new Error('Invalid user data received');
      }

      setUserData(userData);

      if (userData.user.roles.length > 1) {
        navigate('/select-role');
      } else if (userData.user.roles.length === 1) {
        const role = userData.user.roles[0].role_name;
        navigate(getRoleHomePage(role));
      } else {
        setError('No roles assigned to this account');
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  function getRoleHomePage(role) {
    const roleRoutes = {
      'Faculty': '/faculty',
      'HOD': '/hod',
      'Dean': '/dean',
      'IQAC': '/iqac',
      'Admin': '/admin'
    };
    return roleRoutes[role] || '/';
  }

  function handleBackToEmail() {
    setStep('email');
    setOtp('');
    setError('');
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>SPAS Login</h1>
        <p className="login-subtitle">Student Performance Analysis System</p>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter your email"
                autoFocus
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <p className="login-hint">
              You'll receive an 8-digit code via email
            </p>

            <div className="register-link">
              Don't have an account? <Link to="/register">Register here</Link>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="otp-sent-message">
              <p>OTP sent to</p>
              <strong>{email}</strong>
            </div>

            <div className="form-group">
              <label htmlFor="otp">Enter OTP Code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                disabled={loading}
                placeholder="8-digit code"
                maxLength="8"
                autoFocus
                className="otp-input"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading || otp.length !== 8}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              className="back-button"
              onClick={handleBackToEmail}
              disabled={loading}
            >
              Change Email
            </button>

            <button
              type="button"
              className="resend-button"
              onClick={handleSendOtp}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
