import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function LoginPage() 
{
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const { login } = useAuth();
    const nav = useNavigate();

    async function onSubmit(e) 
    {
        e.preventDefault();
        setBusy(true);
        try 
        {
            const data = await api.login({ email, password });
            console.log(data);
            login(data);
            nav('/calendar', { replace: true });
        }
        catch (e) 
        {
            alert(e.message);
        }
        finally 
        {
            setBusy(false); 
        }
    }

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={onSubmit}>
                <h2>Sign in</h2>
                <label className="fld"><span>Email</span>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </label>
                <label className="fld"><span>Password</span>
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </label>
                <button className="btn" disabled={busy} type="submit">Login</button>
                <div className="muted">No account? <Link to="/register">Register</Link></div>
            </form>
        </div>
    );
}
