import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import Button from '../components/shared/Button';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { AuthService } from '../services/auth.service';

// Styled components with enhanced accessibility and responsive design
const LandingContainer = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: var(--spacing-xl);
  background: var(--background-default);
  color: var(--text-primary);

  @media (max-width: 768px) {
    padding: var(--spacing-md);
  }
`;

const HeroSection = styled.section`
  text-align: center;
  max-width: 800px;
  margin-bottom: var(--spacing-xxl);
`;

const Title = styled.h1`
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);

  @media (max-width: 768px) {
    font-size: var(--font-size-xl);
  }
`;

const Subtitle = styled.p`
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: var(--line-height-loose);
`;

const AuthForm = styled.form`
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-xl);
  background: var(--background-paper);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
`;

const FormGroup = styled.div`
  margin-bottom: var(--spacing-lg);
`;

const Label = styled.label`
  display: block;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
`;

const Input = styled.input`
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--divider);
  border-radius: 4px;
  background: var(--background-default);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  transition: all var(--transition-duration-normal) var(--transition-timing-ease);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: var(--shadow-focus);
  }

  &:disabled {
    background: var(--action-disabled);
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
  min-height: 20px;
`;

interface FormData {
  email: string;
  password: string;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset error when form data changes
  useEffect(() => {
    if (error) setError('');
  }, [formData]);

  // Handle form input changes with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    return true;
  }, [formData]);

  // Handle form submission with security measures
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');

      if (!validateForm()) return;

      setIsLoading(true);
      
      // Announce loading state for screen readers
      const loadingAnnouncement = document.createElement('div');
      loadingAnnouncement.setAttribute('role', 'status');
      loadingAnnouncement.setAttribute('aria-live', 'polite');
      loadingAnnouncement.textContent = 'Signing in, please wait...';
      document.body.appendChild(loadingAnnouncement);

      const response = await AuthService.login({
        email: formData.email,
        password: formData.password,
        deviceId: crypto.randomUUID()
      });

      // Navigate to conversation page on success
      navigate('/conversation');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during sign in';
      setError(errorMessage);
      
      // Log security event
      AuthService.handleSecurityEvent({
        type: 'token_invalid',
        timestamp: Date.now(),
        details: err
      });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
      const loadingAnnouncement = document.querySelector('[role="status"]');
      if (loadingAnnouncement) loadingAnnouncement.remove();
    }
  };

  return (
    <LandingContainer>
      <HeroSection>
        <Title>Welcome to AI Voice Agent</Title>
        <Subtitle>
          Experience natural conversations with our AI assistant through your voice.
          Start talking now with enhanced security and accessibility.
        </Subtitle>
      </HeroSection>

      <AuthForm
        ref={formRef}
        onSubmit={handleSubmit}
        aria-labelledby="auth-form-title"
        noValidate
      >
        <h2 id="auth-form-title" className="sr-only">Sign In Form</h2>
        
        <FormGroup>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "error-message" : undefined}
            autoComplete="email"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "error-message" : undefined}
            autoComplete="current-password"
          />
        </FormGroup>

        {error && (
          <ErrorMessage id="error-message" role="alert">
            {error}
          </ErrorMessage>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isLoading}
          loading={isLoading}
          ariaLabel="Sign in"
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Sign In'}
        </Button>
      </AuthForm>
    </LandingContainer>
  );
};

export default LandingPage;