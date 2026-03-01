import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Mail, Lock, User, AtSign, Check, X, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { signUp, checkUsernameAvailable } from '../services/auth';
import {
  validateEmail,
  validateUsername,
  validatePassword,
  getPasswordStrength,
  validateConfirmPassword,
} from '../utils/validation';

export function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: '',
  });

  const [touched, setTouched] = useState({
    email: false,
    username: false,
    password: false,
    confirmPassword: false,
  });

  const emailValidation = validateEmail(formData.email);
  const usernameValidation = validateUsername(formData.username);
  const passwordValidation = validatePassword(formData.password);
  const confirmPasswordValidation = validateConfirmPassword(
    formData.password,
    formData.confirmPassword
  );
  const passwordStrength = getPasswordStrength(formData.password);

  useEffect(() => {
    if (!formData.username || !usernameValidation.isValid) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null, message: '' });

      const available = await checkUsernameAvailable(formData.username);

      setUsernameStatus({
        checking: false,
        available,
        message: available ? 'Username available' : 'Username is taken',
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, usernameValidation.isValid]);

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setTouched({
      email: true,
      username: true,
      password: true,
      confirmPassword: true,
    });

    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      return;
    }

    if (!usernameValidation.isValid) {
      setError(usernameValidation.message);
      return;
    }

    if (usernameStatus.available === false) {
      setError('Username is already taken');
      return;
    }

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

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      username: formData.username,
      displayName: formData.displayName || formData.username,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{formData.email}</strong>.
              Click the link to verify your account.
            </p>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/login')}
            >
              Back to Sign In
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create account</h1>
          <p className="text-gray-600">Join us and start messaging</p>
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

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              leftIcon={<Mail size={18} />}
              error={touched.email && !emailValidation.isValid ? emailValidation.message : undefined}
              autoComplete="email"
              autoFocus
            />

            <div className="space-y-1">
              <Input
                label="Username"
                type="text"
                placeholder="your_username"
                value={formData.username}
                onChange={handleChange('username')}
                onBlur={handleBlur('username')}
                leftIcon={<AtSign size={18} />}
                rightIcon={
                  usernameStatus.checking ? (
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  ) : usernameStatus.available === true ? (
                    <Check size={18} className="text-green-500" />
                  ) : usernameStatus.available === false ? (
                    <X size={18} className="text-red-500" />
                  ) : null
                }
                error={
                  touched.username && !usernameValidation.isValid
                    ? usernameValidation.message
                    : usernameStatus.available === false
                    ? usernameStatus.message
                    : undefined
                }
                hint={
                  usernameValidation.isValid && usernameStatus.available
                    ? usernameStatus.message
                    : undefined
                }
                autoComplete="username"
              />
            </div>

            <Input
              label="Display Name (optional)"
              type="text"
              placeholder="How you want to be called"
              value={formData.displayName}
              onChange={handleChange('displayName')}
              leftIcon={<User size={18} />}
              autoComplete="name"
            />

            <div className="space-y-2">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange('password')}
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
              />
              {formData.password && <PasswordStrengthMeter strength={passwordStrength} />}
            </div>

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
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
              disabled={
                isLoading ||
                usernameStatus.checking ||
                usernameStatus.available === false
              }
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
