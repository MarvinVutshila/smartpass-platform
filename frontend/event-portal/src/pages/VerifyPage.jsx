import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';

const statusColors = {
    VALID: 'border-green-500 bg-green-50',
    USED: 'border-yellow-500 bg-yellow-50',
    REVOKED: 'border-red-500 bg-red-50',
    EXPIRED: 'border-gray-500 bg-gray-50',
    INVALID: 'border-red-500 bg-red-50',
};

const statusIcons = {
    VALID: '✅',
    USED: '🔄',
    REVOKED: '🚫',
    EXPIRED: '⏰',
    INVALID: '❌',
};

export default function VerifyPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setStatus({ status: 'INVALID', message: 'No token provided' });
            setLoading(false);
            return;
        }

        console.log('Verifying token:', token);

        API.get(`/tickets/verify?credential=${encodeURIComponent(token)}`)
            .then(res => {
                console.log('Verification response:', res.data);
                setStatus(res.data);
            })
            .catch(err => {
                console.error('Verification error:', err);
                setStatus({ 
                    status: 'ERROR', 
                    message: err.response?.data?.detail || 'Verification failed' 
                });
            })
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto" />
                    <p className="mt-4 text-slate-500">Verifying ticket...</p>
                </div>
            </div>
        );
    }

    const isSuccess = status?.status === 'VALID';
    const colorClass = statusColors[status?.status] || 'border-gray-300 bg-gray-50';
    const icon = statusIcons[status?.status] || '❓';

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className={`max-w-md w-full p-6 rounded-2xl border-2 shadow-lg ${colorClass}`}>
                <div className="text-center">
                    <div className="text-5xl mb-4">{icon}</div>
                    <h2 className={`text-3xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                        {status?.status || 'UNKNOWN'}
                    </h2>
                    <p className="text-slate-600 mt-2">{status?.message || 'Ticket verification failed'}</p>
                    {status?.event_name && (
                        <p className="text-sm text-slate-500 mt-4">Event: <span className="font-semibold">{status.event_name}</span></p>
                    )}
                    {status?.attendee_name && (
                        <p className="text-sm text-slate-500">Attendee: <span className="font-semibold">{status.attendee_name}</span></p>
                    )}
                    {status?.ticket_type && (
                        <p className="text-sm text-slate-500">Ticket Type: <span className="font-semibold">{status.ticket_type}</span></p>
                    )}
                    {status?.ticket_id && (
                        <p className="text-sm text-slate-500">Ticket ID: <span className="font-mono">{status.ticket_id}</span></p>
                    )}
                    {status?.checked_in_at && (
                        <p className="text-sm text-slate-500">Checked in at: <span className="font-semibold">{new Date(status.checked_in_at).toLocaleString()}</span></p>
                    )}
                    {status?.issued_at && (
                        <p className="text-sm text-slate-500">Issued: <span className="font-semibold">{new Date(status.issued_at).toLocaleString()}</span></p>
                    )}
                    {status?.expires_at && (
                        <p className="text-sm text-slate-500">Expires: <span className="font-semibold">{new Date(status.expires_at).toLocaleString()}</span></p>
                    )}
                </div>
            </div>
        </div>
    );
}