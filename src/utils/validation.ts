export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface PasswordStrength {
  score: number;
  label: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
  feedback: string[];
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true, message: '' };
}

export function validateUsername(username: string): ValidationResult {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { isValid: false, message: 'Username must be 20 characters or less' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }

  if (/^[0-9]/.test(username)) {
    return { isValid: false, message: 'Username cannot start with a number' };
  }

  return { isValid: true, message: '' };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' };
  }

  return { isValid: true, message: '' };
}

export function getPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      label: 'weak',
      color: '#ef4444',
      feedback: ['Enter a password'],
    };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('At least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }

  let label: PasswordStrength['label'];
  let color: string;

  if (score <= 2) {
    label = 'weak';
    color = '#ef4444';
  } else if (score <= 3) {
    label = 'fair';
    color = '#f59e0b';
  } else if (score <= 4) {
    label = 'good';
    color = '#22c55e';
  } else {
    label = 'strong';
    color = '#16a34a';
  }

  return { score, label, color, feedback };
}

export function validateDisplayName(name: string): ValidationResult {
  if (!name) {
    return { isValid: true, message: '' };
  }

  if (name.length > 50) {
    return { isValid: false, message: 'Display name must be 50 characters or less' };
  }

  return { isValid: true, message: '' };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' };
  }

  return { isValid: true, message: '' };
}
