import { createContext, useContext, useMemo, useState } from 'react';

const AuthCtx = createContext(null);

function safeParseUser(raw) 
{
    if (!raw) return null;
    if (raw === 'undefined' || raw === 'null') return null;
    try 
    {
        return JSON.parse(raw); 
    }
    catch 
    {
        return null; 
    }
}

export function AuthProvider({ children }) 
{
    const [token, setToken] = useState(() => 
    {
        try 
        {
            return localStorage.getItem('token') || null; 
        }
        catch 
        {
            return null; 
        }
    });

    const [user, setUser] = useState(() => 
    {
        try 
        {
            return safeParseUser(localStorage.getItem('user')); 
        }
        catch 
        {
            return null; 
        }
    });

    function login({ token, user }) 
    {
        setToken(token); setUser(user || null);
        try 
        {
            localStorage.setItem('token', token || '');
            localStorage.setItem('user', user ? JSON.stringify(user) : '');
        }
        catch 
        {}
    }

    function logout() 
    {
        setToken(null); setUser(null);
        try 
        {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        catch 
        {}
    }

    const value = useMemo(() => ({ token, user, login, logout }), [token, user]);
    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() 
{
    return useContext(AuthCtx);
}
