import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true); 
    setAuthError(null);
    let error;
    
    if (isLoginMode) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = signUpError;
      if (!error) alert("Conta criada com sucesso!");
    }
    
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4 font-sans text-white">
      <div className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 shadow-2xl p-8">
        <h1 className="text-4xl font-black text-center text-blue-500 tracking-tighter mb-2">SCOUT<span className="text-white">PRO</span></h1>
        <p className="text-center text-gray-400 mb-8">{isLoginMode ? "Insira as suas credenciais para aceder ao sistema." : "Crie uma nova conta."}</p>
        
        {authError && <div className="bg-red-900/50 border border-red-900 text-red-300 p-3 rounded mb-4 text-sm">{authError}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">E-mail</label>
            <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Palavra-passe</label>
            <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg outline-none focus:border-blue-500" />
          </div>
          <button type="submit" disabled={authLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 mt-4">
            {authLoading ? "Aguarde..." : (isLoginMode ? "Entrar" : "Registar e Entrar")}
          </button>
        </form>
        
        <div className="mt-6 text-center border-t border-gray-800 pt-6">
          <button onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(null); }} className="text-sm text-gray-400 hover:text-white">
            {isLoginMode ? "Criar nova conta." : "Já tem conta? Fazer Login."}
          </button>
        </div>
      </div>
    </div>
  );
}