import { Routes, Route, Navigate } from 'react-router-dom';
import CalendarPage from './pages/CalendarPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import InviteAcceptPage from './pages/InviteAcceptPage.jsx';
import ProtectedRoute from './router/ProtectedRoute.jsx';
import { AuthProvider } from './state/AuthContext.jsx';

export default function App() 
{
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Navigate to="/calendar" replace />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/calendar" element={<CalendarPage />} />
                </Route>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/invites/:token" element={<InviteAcceptPage />} />
                <Route path="*" element={<Navigate to="/calendar" replace />} />
            </Routes>
        </AuthProvider>
    );
}
