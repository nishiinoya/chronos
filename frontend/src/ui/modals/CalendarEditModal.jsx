// Simple modal to edit an existing calendar
import { useEffect, useState } from 'react';

export default function CalendarEditModal({ calendar, onClose, onSave, onDelete }) 
{
    const [name, setName] = useState(calendar?.name || '');
    const [color, setColor] = useState(calendar?.color || '#6c6cff');
    const [busy, setBusy] = useState(false);

    useEffect(() => 
    {
        const onEsc = (e) => 
        {
            if (e.key === 'Escape') onClose?.(); 
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [onClose]);

    async function save() 
    {
        setBusy(true);
        try 
        {
            await onSave?.({ name, color }); 
        }
        finally 
        {
            setBusy(false); 
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
                <h2>Edit calendar</h2>
                <label className="fld">
                    <span>Name</span>
                    <input value={name} onChange={(e)=>setName(e.target.value)} />
                </label>
                <label className="fld">
                    <span>Color</span>
                    <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} style={{ width: 60, padding: 0 }} />
                </label>
                <div className="actions">
                    <button className="btn danger" onClick={onDelete} disabled={busy}>Delete</button>
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost" onClick={onClose}>Cancel</button>
                    <button className="btn" onClick={save} disabled={!name.trim() || busy}>Save</button>
                </div>
            </div>
        </div>
    );
}
