import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mail, ArrowLeft, Check } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { resetPassword } from '../services/auth';
import { validateEmail } from '../utils/validation';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailValidation = validateEmail(email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched(true);

    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(email);

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
              We've sent a password reset link to <strong>{email}</strong>.
              Click the link to reset your password.
            </p>
            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setSuccess(false)}
              >
                Send another link
              </Button>
              <Link to="/login">
                <Button variant="outline" fullWidth>
                  Back to Sign In
                </Button>
              </Link>
            </div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot password?</h1>
          <p className="text-gray-600">No worries, we'll send you reset instructions</p>
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
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              leftIcon={<Mail size={18} />}
              error={touched && !emailValidation.isValid ? emailValidation.message : undefined}
              autoComplete="email"
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Reset Password
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
