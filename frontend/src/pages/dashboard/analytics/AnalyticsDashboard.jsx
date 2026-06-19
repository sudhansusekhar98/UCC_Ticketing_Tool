import { useState, useEffect } from 'react';
import { ticketsApi } from '../../../services/api';
import MetricsRow from './MetricsRow';
import TicketTrendChart from './TicketTrendChart';
import TicketsByPriorityChart from './TicketsByPriorityChart';
import TicketsByCategoryChart from './TicketsByCategoryChart';
import SLAStatusChart from './SLAStatusChart';
import DateRangePicker from './DateRangePicker';
import './AnalyticsDashboard.css';

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return formatDate(d);
}

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: daysAgo(29),
        endDate: formatDate(new Date()),
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const [statsRes, trendsRes] = await Promise.all([
                    ticketsApi.getDashboardStats(),
                    ticketsApi.getTrends({
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate,
                    }),
                ]);
                setStats(statsRes.data.data || statsRes.data);
                setTrendsData(trendsRes.data.data || trendsRes.data);
            } catch (err) {
                console.error('Analytics fetch failed:', err);
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [dateRange.startDate, dateRange.endDate]);

    if (loading) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-loading">
                    <div className="analytics-loading-spinner" />
                    <span>Loading analytics…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-error">{error}</div>
            </div>
        );
    }

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="analytics-header">
                <h1 className="analytics-title">Analytics Dashboard</h1>
                <DateRangePicker
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={setDateRange}
                />
            </div>

            {/* Row 1: KPI Metrics */}
            <MetricsRow stats={stats} trendsData={trendsData} />

            {/* Row 2: Trend bar chart (2/3) + Category circle packing (1/3) */}
            <div className="analytics-row analytics-row-2col">
                <div className="analytics-col analytics-col-2">
                    <TicketTrendChart trends={trendsData?.trends || []} />
                </div>
                <div className="analytics-col analytics-col-1">
                    <TicketsByCategoryChart categories={stats?.ticketsByCategory || []} />
                </div>
            </div>

            {/* Row 3: Priority half-donut (1/2) + SLA progress bars (1/2) */}
            <div className="analytics-row analytics-row-equal">
                <div className="analytics-col">
                    <TicketsByPriorityChart priorities={stats?.ticketsByPriority || []} />
                </div>
                <div className="analytics-col">
                    <SLAStatusChart stats={stats} />
                </div>
            </div>
        </div>
    );
}
