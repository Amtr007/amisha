import { supabase } from '../lib/supabase';

import type { User as AuthUser } from '@supabase/supabase-js';

import type { User, UserUpdate } from '../types/database';

import { withRetry } from '../utils/retry';



export interface SignUpData {

      email: string;

      password: string;

      username: string;

      displayName?: string;

}



export interface SignInData {

      identifier: string;

      password: string;

}



export interface AuthError {

      message: string;

      code?: string;

}



export interface AuthResult<T = void> {

      data: T | null;

      error: AuthError | null;

}



export async function checkUsernameAvailable(username: string): Promise<boolean> {

      const { data, error } = await supabase.rpc('check_username_available', {

            username_to_check: username,

      });



      if (error) {

            console.error('Error checking username:', error);

            return false;

      }



      return data ?? false;

}



async function getEmailByUsername(username: string): Promise<string | null> {

      // Retry up to 3 times — critical for login with username on cold DB

      return withRetry(

            async () => {

                  const { data, error } = await supabase.rpc('get_user_email_by_username', {

                        username_input: username,

                  });

                  if (error) {

                        console.error('Error getting email by username:', error);

                        throw error; // Throw so withRetry retries it

                  }

                  return data;

            },

            { label: 'getEmailByUsername' }

      );

}



export async function signUp(data: SignUpData): Promise<AuthResult<AuthUser>> {

      const { email, password, username, displayName } = data;



      const isAvailable = await checkUsernameAvailable(username);

      if (!isAvailable) {

            return {

                  data: null,

                  error: { message: 'Username is already taken', code: 'username_taken' },

            };

      }



      const { data: authData, error: authError } = await supabase.auth.signUp({

            email,

            password,

            options: {

                  data: {

                        username,

                        display_name: displayName || username,

                  },

            },

      });



      if (authError) {

            return {

                  data: null,

                  error: { message: getAuthErrorMessage(authError.message), code: authError.code },

            };

      }



      if (!authData.user) {

            return {

                  data: null,

                  error: { message: 'Failed to create account', code: 'unknown' },

            };

      }



      const { error: profileError } = await supabase.from('users').insert({

            id: authData.user.id,

            username,

            email,

            display_name: displayName || username,

      });



      if (profileError) {

            console.error('Error creating profile:', profileError);

            return {

                  data: null,

                  error: { message: 'Account created but failed to create profile', code: 'profile_error' },

            };

      }



      return { data: authData.user, error: null };

}



export async function signIn(data: SignInData): Promise<AuthResult<AuthUser>> {

      try {

            const { identifier, password } = data;



            let email = identifier;



            const isEmail = identifier.includes('@');

            if (!isEmail) {

                  try {

                        const foundEmail = await getEmailByUsername(identifier);

                        if (!foundEmail) {

                              return {

                                    data: null,

                                    error: { message: 'Invalid username or password', code: 'invalid_credentials' },

                              };

                        }

                        email = foundEmail;

                  } catch (err) {

                        console.error('Error during username lookup:', err);

                        return {

                              data: null,

                              error: { message: 'Unable to sign in right now. Please try again.', code: 'network_error' },

                        };

                  }

            }



            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({

                  email,

                  password,

            });



            if (authError) {

                  return {

                        data: null,

                        error: { message: getAuthErrorMessage(authError.message), code: authError.code },

                  };

            }



            if (authData.user) {

                  // Non-blocking: update last seen in background

                  Promise.resolve(supabase.rpc('update_last_seen')).catch(() => { });

            }



            return { data: authData.user, error: null };

      } catch (err) {

            console.error('Unexpected sign in error:', err);

            return {

                  data: null,

                  error: { message: 'An unexpected error occurred. Please try again.', code: 'unexpected' },

            };

      }

}



export async function signOut(): Promise<AuthResult> {

      const { error } = await supabase.auth.signOut();



      if (error) {

            return {

                  data: null,

                  error: { message: getAuthErrorMessage(error.message), code: error.code },

            };

      }



      return { data: null, error: null };

}



export async function resetPassword(email: string): Promise<AuthResult> {

      const { error } = await supabase.auth.resetPasswordForEmail(email, {

            redirectTo: `${window.location.origin}/reset-password`,

      });



      if (error) {

            return {

                  data: null,

                  error: { message: getAuthErrorMessage(error.message), code: error.code },

            };

      }



      return { data: null, error: null };

}



export async function updatePassword(newPassword: string): Promise<AuthResult> {

      const { error } = await supabase.auth.updateUser({

            password: newPassword,

      });



      if (error) {

            return {

                  data: null,

                  error: { message: getAuthErrorMessage(error.message), code: error.code },

            };

      }



      return { data: null, error: null };

}



export async function getCurrentUser(): Promise<AuthUser | null> {

      const { data: { user } } = await supabase.auth.getUser();

      return user;

}



export async function getUserProfile(userId: string): Promise<User | null> {

      // Retry up to 3 times — DB may be waking up from cold start

      try {

            const result = await withRetry(

                  async () => {

                        const { data, error } = await supabase

                              .from('users')

                              .select('*')

                              .eq('id', userId)

                              .maybeSingle();

                        if (error) throw error;

                        return data;

                  },

                  { label: 'getUserProfile' }

            );

            return result;

      } catch (err) {

            console.error('Error fetching profile after retries:', err);

            return null;

      }

}



export async function updateUserProfile(userId: string, updates: UserUpdate): Promise<AuthResult<User>> {

      const { data, error } = await supabase

            .from('users')

            .update(updates)

            .eq('id', userId)

            .select()

            .maybeSingle();



      if (error) {

            return {

                  data: null,

                  error: { message: error.message, code: error.code },

            };

      }



      return { data, error: null };

}



export async function uploadProfilePhoto(userId: string, file: File): Promise<AuthResult<string>> {

      const fileExt = file.name.split('.').pop();

      const fileName = `${userId}/${Date.now()}.${fileExt}`;



      const { data, error } = await supabase.storage

            .from('profile-photos')

            .upload(fileName, file, {

                  cacheControl: '3600',

                  upsert: true,

            });



      if (error) {

            return {

                  data: null,

                  error: { message: error.message, code: error.code },

            };

      }



      const { data: urlData } = supabase.storage

            .from('profile-photos')

            .getPublicUrl(data.path);



      const { error: updateError } = await supabase

            .from('users')

            .update({ profile_photo_url: urlData.publicUrl })

            .eq('id', userId);



      if (updateError) {

            return {

                  data: null,

                  error: { message: updateError.message, code: updateError.code },

            };

      }



      return { data: urlData.publicUrl, error: null };

}



function getAuthErrorMessage(message: string): string {

      const errorMessages: Record<string, string> = {

            'Invalid login credentials': 'Invalid email/username or password',

            'Email not confirmed': 'Please verify your email before signing in',

            'User already registered': 'An account with this email already exists',

            'Password should be at least 6 characters': 'Password must be at least 8 characters',

            'Email rate limit exceeded': 'Too many attempts. Please try again later',

            'Signup disabled': 'Registration is currently disabled',

      };



      return errorMessages[message] || message;

}

