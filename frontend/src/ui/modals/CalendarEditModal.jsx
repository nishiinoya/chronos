// Simple modal to view / edit an existing calendar
import { useEffect, useState, useMemo } from 'react';

export default function CalendarEditModal({ calendar, onClose, onSave, onDelete }) 
{
    const [name, setName] = useState(calendar?.name || '');
    const [color, setColor] = useState(calendar?.color || '#6c6cff');
    const [busy, setBusy] = useState(false);

    // role is injected on the calendar object by Sidebar ("myRole")
    const role = calendar?.myRole || null;

    // only owner/admin can edit; others (editor/viewer/unknown) see read-only
    const canEdit = useMemo(() => 
    {
        if (!role) return true; // fallback for old data
        return role === 'owner' || role === 'admin';
    }, [role]);

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
        if (!canEdit) return;
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
                <h2>
                    {canEdit ? 'Edit calendar' : 'Calendar details'}
                    {role && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                            ({role})
                        </span>
                    )}
                </h2>

                <label className="fld">
                    <span>Name</span>
                    <input
                        value={name}
                        onChange={(e)=>setName(e.target.value)}
                        disabled={!canEdit}
                    />
                </label>

                <label className="fld">
                    <span>Color</span>
                    <input
                        type="color"
                        value={color}
                        onChange={(e)=>setColor(e.target.value)}
                        style={{ width: 60, padding: 0 }}
                        disabled={!canEdit}
                    />
                </label>

                <div className="actions">
                    {canEdit && (
                        <button
                            className="btn danger"
                            onClick={onDelete}
                            disabled={busy}
                        >
                            Delete
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost" onClick={onClose}>
                        {canEdit ? 'Cancel' : 'Close'}
                    </button>
                    {canEdit && (
                        <button
                            className="btn"
                            onClick={save}
                            disabled={!name.trim() || busy}
                        >
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
