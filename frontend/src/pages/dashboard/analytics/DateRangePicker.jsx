export default function DateRangePicker({ startDate, endDate, onChange }) {
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="date-range-picker">
            <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={e => onChange({ startDate: e.target.value, endDate })}
                className="date-input"
                aria-label="Start date"
            />
            <span className="date-sep">–</span>
            <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={e => onChange({ startDate, endDate: e.target.value })}
                className="date-input"
                aria-label="End date"
            />
        </div>
    );
}
