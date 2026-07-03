import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import '../styles/Register.css';

export function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    employee_no: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field-specific error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  }

  function validateForm() {
    const errors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Full name validation
    if (!formData.full_name) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }

    // Employee number validation
    if (!formData.employee_no) {
      errors.employee_no = 'Employee number is required';
    } else if (formData.employee_no.trim().length < 3) {
      errors.employee_no = 'Employee number must be at least 3 characters';
    }

    // Phone validation (optional)
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.register(
        formData.email.trim(),
        formData.password,
        formData.full_name.trim(),
        formData.employee_no.trim(),
        formData.phone.trim() || undefined
      );

      setSuccess(true);
      setError('');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Create Account</h1>
        <p className="register-subtitle">Student Performance Analysis System</p>

        {success && (
          <div className="success-message">
            <strong>Registration successful!</strong>
            <p>Redirecting to login page...</p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="full_name">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter your full name"
                className={fieldErrors.full_name ? 'error' : ''}
              />
              {fieldErrors.full_name && (
                <span className="field-error">{fieldErrors.full_name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="employee_no">
                Employee Number <span className="required">*</span>
              </label>
              <input
                id="employee_no"
                name="employee_no"
                type="text"
                value={formData.employee_no}
                onChange={handleChange}
                disabled={loading}
                placeholder="e.g., CSE001, HODCSE"
                className={fieldErrors.employee_no ? 'error' : ''}
              />
              {fieldErrors.employee_no && (
                <span className="field-error">{fieldErrors.employee_no}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter your email"
                className={fieldErrors.email ? 'error' : ''}
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                Phone Number <span className="optional">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter your phone number"
                className={fieldErrors.phone ? 'error' : ''}
              />
              {fieldErrors.phone && (
                <span className="field-error">{fieldErrors.phone}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                placeholder="Minimum 6 characters"
                className={fieldErrors.password ? 'error' : ''}
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder="Re-enter your password"
                className={fieldErrors.confirmPassword ? 'error' : ''}
              />
              {fieldErrors.confirmPassword && (
                <span className="field-error">{fieldErrors.confirmPassword}</span>
              )}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="login-link">
              Already have an account? <Link to="/login">Login here</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
