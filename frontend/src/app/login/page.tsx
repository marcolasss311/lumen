"use client";

import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login com Google");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login com Email/Senha");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md">
        <h1 className="text-3xl font-bold text-center text-blue-600">Lumen</h1>
        <p className="text-center text-gray-500">Plataforma de Estudos Inteligente</p>
        
        {error && <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">{error}</div>}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-black border rounded-md focus:outline-none focus:ring focus:ring-blue-200" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-black border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
              required 
            />
          </div>
          <button type="submit" className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Entrar com Email
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500 bg-white">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          Google
        </button>
      </div>
    </div>
  );
}
