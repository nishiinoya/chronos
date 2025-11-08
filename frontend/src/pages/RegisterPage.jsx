import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function RegisterPage() 
{
    const [name, setName] = useState('');
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
            const data = await api.register({ name, email, password });
            // most APIs auto-login after register by returning a token
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
                <h2>Create account</h2>
                <label className="fld"><span>Name</span>
                    <input value={name} onChange={e=>setName(e.target.value)} required />
                </label>
                <label className="fld"><span>Email</span>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </label>
                <label className="fld"><span>Password</span>
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </label>
                <button className="btn" disabled={busy} type="submit">Register</button>
                <div className="muted">Already have an account? <Link to="/login">Login</Link></div>
            </form>
        </div>
    );
}
