import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Droplets, LogIn, UserPlus } from 'lucide-react';
import '../App.css'; // Re-use App styles or we can add specific styles here

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                toast.success('Sesión iniciada correctamente');
            } else {
                await register(email, password);
                toast.success('Cuenta creada y sesión iniciada');
            }
        } catch (error) {
            console.error("Auth error:", error);
            let msg = "Error de autenticación";
            if (error.code === 'auth/wrong-password') msg = "Contraseña incorrecta";
            if (error.code === 'auth/user-not-found') msg = "Usuario no encontrado";
            if (error.code === 'auth/email-already-in-use') msg = "El correo ya está registrado";
            if (error.code === 'auth/weak-password') msg = "La contraseña es muy debil";
            if (error.code === 'auth/invalid-email') msg = "Correo inválido";

            toast.error(msg);
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f1f5f9',
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    color: '#0284c7'
                }}>
                    <Droplets size={64} />
                </div>

                <h2 style={{
                    marginBottom: '0.5rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#0f172a'
                }}>
                    AguaControl
                </h2>

                <p style={{
                    color: '#64748b',
                    marginBottom: '2rem'
                }}>
                    {isLogin ? 'Inicia sesión para continuar' : 'Crea una cuenta nueva'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="tu@correo.com"
                        />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #cbd5e1',
                                outline: 'none'
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '1rem',
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#0284c7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                {isLogin ? 'Ingresar' : 'Registrarse'}
                                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            textDecoration: 'underline'
                        }}
                    >
                        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
