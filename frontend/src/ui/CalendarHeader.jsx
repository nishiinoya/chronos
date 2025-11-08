export default function CalendarHeader({ title, view='month', onChangeView, onPrev, onNext, onToday }) 
{
    return (
        <header className="header">
            <div className="left">
                <button className="btn" onClick={onToday}>Today</button>
                <button className="btn" onClick={onPrev}>‹</button>
                <button className="btn" onClick={onNext}>›</button>
                <h1 className="title">{title}</h1>
            </div>
            <div className="right">
                <select className="input" value={view} onChange={(e)=>onChangeView?.(e.target.value)}>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                </select>
            </div>
        </header>
    );
}
