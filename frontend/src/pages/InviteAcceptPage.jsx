import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function InviteAcceptPage() 
{
    const { token } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState('loading'); // 'loading' | 'need-login' | 'ok' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() =>
    {
        if (!token) 
        {
            setStatus('error');
            setMessage('Invalid invite link.');
            return;
        }

        // Require login first
        if (!user) 
        {
            setStatus('need-login');
            setMessage('Please log in with the email this invite was sent to, then reload this page.');
            return;
        }

        (async () =>
        {
            try 
            {
                setStatus('loading');
                const res = await api.acceptCalendarInvite(token);
                setStatus('ok');
                setMessage('Invite accepted successfully.');

                // Optional: auto-redirect to calendar page
                if (res.calendarId) 
                {
                    // adjust route shape if your calendar route is different
                    navigate(`/calendar?calendarId=${res.calendarId}`, { replace: true });
                }
            }
            catch (e) 
            {
                setStatus('error');
                setMessage(e.message || 'Failed to accept invite.');
            }
        })();
    }, [token, user, navigate]);

    return (
        <div className="page center">
            <div className="card">
                <h1>Calendar invite</h1>
                {status === 'loading' && <p>Processing invite…</p>}
                {status === 'need-login' && (
                    <p>{message}</p>
                )}
                {status === 'need-login' && (
                    <a href="/login" className="btn">Go to Login</a>
                )}
                {(status === 'ok' || status === 'error') && (
                    <p>{message}</p>
                )}
            </div>
        </div>
    );
}
