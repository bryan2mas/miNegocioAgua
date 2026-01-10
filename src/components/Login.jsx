import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Droplets, LogIn, UserPlus } from 'lucide-react';
import '../App.css';

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
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <Droplets size={64} />
                </div>

                <h2 className="login-title">
                    AguaControl
                </h2>

                <p className="login-subtitle">
                    {isLogin ? 'Inicia sesión para continuar' : 'Crea una cuenta nueva'}
                </p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-field">
                        <label className="login-label">
                            Correo Electrónico
                        </label>
                        <input
                            className="login-input"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@correo.com"
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label">
                            Contraseña
                        </label>
                        <input
                            className="login-input"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="login-submit-btn"
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                {isLogin ? 'Ingresar' : 'Registrarse'}
                                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="login-switch-btn"
                    >
                        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
