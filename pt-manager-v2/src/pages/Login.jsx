import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { FiLogIn, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function Login() {
  const { register, handleSubmit } = useForm();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (err) {
      setError("Email o password non validi. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full p-3 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="relative flex justify-center items-center min-h-screen bg-background overflow-hidden">
      
      {/* --- NUOVO SFONDO A ONDE PIU' DINAMICO --- */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full filter blur-2xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-800 rounded-full filter blur-2xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-800 rounded-full filter blur-2xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute -bottom-16 right-20 w-56 h-56 bg-primary rounded-full filter blur-xl opacity-10 animate-blob animation-delay-1000"></div>
      </div>
      
      {/* --- FORM DI LOGIN (in primo piano) --- */}
      <motion.div 
        className="relative z-10 w-full max-w-sm p-8 bg-card/80 backdrop-blur-md rounded-xl border border-white/10 shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">PT Manager V2</h1>
        <p className="text-center text-muted mb-6">Accesso Admin</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input
              type="email"
              {...register('email', { required: true })}
              className={inputStyle}
              placeholder="La tua email"
            />
          </div>
          <div>
            <input
              type="password"
              {...register('password', { required: true })}
              className={inputStyle}
              placeholder="La tua password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-red-900/50 text-red-300">
              <FiAlertCircle />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg transition font-semibold disabled:bg-primary/50"
          >
            <FiLogIn /> {isSubmitting ? 'Accesso in corso...' : 'Entra'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

