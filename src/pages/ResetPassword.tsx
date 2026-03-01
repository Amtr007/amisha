import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Lock, Check } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { updatePassword } from '../services/auth';
import { supabase } from '../lib/supabase';
import {
  validatePassword,
  getPasswordStrength,
  validateConfirmPassword,
} from '../utils/validation';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  const passwordValidation = validatePassword(password);
  const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidSession(!!session);
    });
  }, []);

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setTouched({ password: true, confirmPassword: true });

    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Please use a stronger password');
      return;
    }

    if (!confirmPasswordValidation.isValid) {
      setError(confirmPasswordValidation.message);
      return;
    }

    setIsLoading(true);

    const result = await updatePassword(password);

    setIsLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSuccess(true);
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 text-center">
            <Alert
              type="error"
              title="Invalid or expired link"
              message="This password reset link is invalid or has expired. Please request a new one."
            />
            <div className="mt-6">
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/forgot-password')}
              >
                Request New Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h2>
            <p className="text-gray-600 mb-6">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set new password</h1>
          <p className="text-gray-600">Please enter your new password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError(null)}
              />
            )}

            <div className="space-y-2">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handleBlur('password')}
                leftIcon={<Lock size={18} />}
                showPasswordToggle
                isPasswordVisible={showPassword}
                onPasswordToggle={() => setShowPassword(!showPassword)}
                error={
                  touched.password && !passwordValidation.isValid
                    ? passwordValidation.message
                    : undefined
                }
                autoComplete="new-password"
                autoFocus
              />
              {password && <PasswordStrengthMeter strength={passwordStrength} />}
            </div>

            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={handleBlur('confirmPassword')}
              leftIcon={<Lock size={18} />}
              showPasswordToggle
              isPasswordVisible={showConfirmPassword}
              onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              error={
                touched.confirmPassword && !confirmPasswordValidation.isValid
                  ? confirmPasswordValidation.message
                  : undefined
              }
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
