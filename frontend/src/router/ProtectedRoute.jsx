import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function ProtectedRoute() 
{
    const { token } = useAuth();
    if (!token) return <Navigate to="/login" replace />;
    return <Outlet />;
}
