import React, { useState, useEffect } from 'react';
import { sitesApi } from '../../services/api';
import { Filter, X, Calendar } from 'lucide-react';
import './ReportFilters.css';

const ReportFilters = ({ filters, onFilterChange }) => {
    const [sites, setSites] = useState([]);
    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            const response = await sitesApi.getDropdown();
            // Handle different response structures if needed
            const siteData = response.data.data || response.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));
        } catch (error) {
            console.error('Failed to load sites', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        onFilterChange({ ...filters, [name]: value });
    };

    return (
        <div className="report-filters glass-card">
            <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
                <div className="flex items-center gap-2">
                    <Filter size={18} />
                    <h3>Filters</h3>
                </div>
                {/* Toggle icon if needed */}
            </div>

            {showFilters && (
                <div className="filters-body">
                    <div className="filter-group">
                        <label>DATE RANGE</label>
                        <div className="date-inputs">
                            <div className="date-field">
                                <span className="label-text">From</span>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={filters.startDate || ''}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="date-field">
                                <span className="label-text">To</span>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={filters.endDate || ''}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>SITE</label>
                        <div className="site-input-wrapper">
                            <span className="label-text">Select Site</span>
                            <select
                                name="siteId"
                                value={filters.siteId || ''}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="">All Sites</option>
                                {sites.map(site => (
                                    <option key={site.value} value={site.value}>
                                        {site.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportFilters;
