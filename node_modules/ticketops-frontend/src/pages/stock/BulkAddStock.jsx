import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Upload, ArrowLeft, FileSpreadsheet, AlertCircle, Package, X, CheckCircle2, XCircle
} from 'lucide-react';
import { stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './StockCommon.css';
import './AddStock.css';
import './BulkAddStock.css';

export default function BulkAddStock() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const ext = selectedFile.name.split('.').pop().toLowerCase();
            if (['xlsx', 'xls', 'csv'].includes(ext)) {
                setFile(selectedFile);
                setResults(null); // Clear previous results
            } else {
                toast.error('Please select an Excel or CSV file');
                e.target.value = null;
            }
        }
    };

    const handleDownloadTemplate = async (format) => {
        try {
            const response = await stockApi.downloadTemplate(format);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `stock_import_template.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error(`Failed to download ${format.toUpperCase()} template`);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const response = await stockApi.bulkUpload(formData);
            setResults(response.data);
            if (response.data.success) {
                toast.success(`${response.data.successCount} items imported successfully`);
            } else {
                toast.error(`${response.data.failCount} rows failed. ${response.data.successCount} imported. See details below.`);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            const backendError = error.response?.data?.error;
            const message = error.response?.data?.message || 'Failed to upload and process file';
            // If the response has results data, show it
            if (error.response?.data?.errors) {
                setResults(error.response.data);
            }
            toast.error(backendError ? `${message}: ${backendError}` : message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stock-container">
            <div className="add-stock-page animate-fade-in">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="title-icon">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h1 className="page-title">Bulk Stock Import</h1>
                            <p className="page-subtitle">Upload Excel or CSV to add multiple spares</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Link to="/stock/add" className="btn btn-secondary btn-ghost">
                            <Package size={14} />
                            Single Add
                        </Link>
                        <Link to="/stock" className="btn btn-secondary">
                            <ArrowLeft size={18} />
                            Back to Stock
                        </Link>
                    </div>
                </div>

                <div className="stock-form">
                    <div className='asset-form-container'>
                        <div className="form-card">
                            <div className="section-header">
                                <div className="section-icon">
                                    <FileSpreadsheet size={16} />
                                </div>
                                <div>
                                    <h2>Upload File</h2>
                                    <p className="section-description">Drop or select your import file</p>
                                </div>
                            </div>

                            <div className="form-section">
                                <form onSubmit={handleUpload}>
                                    <div
                                        className="upload-dropzone-compact"
                                        onClick={() => document.getElementById('file-upload').click()}
                                    >
                                        {file ? (
                                            <div className="file-selected">
                                                <FileSpreadsheet size={24} className="text-success" />
                                                <div className="file-info">
                                                    <span className="file-name">{file.name}</span>
                                                    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-icon-remove"
                                                    onClick={(e) => { e.stopPropagation(); setFile(null); setResults(null); }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="dropzone-placeholder">
                                                <Upload size={20} className="text-muted" />
                                                <span>Click to select file (.xlsx, .xls, .csv)</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            id="file-upload"
                                            hidden
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    <div className="upload-actions">
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={!file || loading}
                                        >
                                            {loading ? 'Processing...' : 'Upload & Import Stock'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-ghost"
                                            onClick={() => handleDownloadTemplate('xlsx')}
                                        >
                                            <FileSpreadsheet size={16} />
                                            Download Template
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Import Results Panel */}
                            {results && (
                                <div className="import-results-panel">
                                    <div className="results-summary">
                                        <div className="results-title">
                                            {results.success ? (
                                                <CheckCircle2 size={18} className="text-success" />
                                            ) : (
                                                <AlertCircle size={18} className="text-warning" />
                                            )}
                                            <span>Import Results</span>
                                        </div>
                                        <div className="results-stats">
                                            <span className="stat-success">
                                                <CheckCircle2 size={14} /> {results.successCount || 0} Imported
                                            </span>
                                            <span className="stat-fail">
                                                <XCircle size={14} /> {results.failCount || 0} Failed
                                            </span>
                                        </div>
                                        {results.message && (
                                            <p className="results-message">{results.message}</p>
                                        )}
                                    </div>

                                    {results.errors && results.errors.length > 0 && (
                                        <div className="results-errors">
                                            <div className="errors-header">
                                                <XCircle size={14} className="text-danger" />
                                                <span>Row Errors ({results.errors.length})</span>
                                            </div>
                                            <div className="errors-list">
                                                {results.errors.map((err, idx) => (
                                                    <div key={idx} className="error-row">
                                                        <span className="error-row-num">Row {err.row}</span>
                                                        <span className="error-asset">{err.assetCode}</span>
                                                        <span className="error-message">{err.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="instructions-box">
                                <div className="instructions-header">
                                    <AlertCircle size={14} className="text-warning" />
                                    <span>Instructions</span>
                                </div>
                                <ul>
                                    <li>MAC Address must be unique (use NA if none)</li>
                                    <li><strong>Site Name</strong> and <strong>Asset Type</strong> are mandatory</li>
                                    <li>Serial Number is recommended</li>
                                    <li>Quantity: use a number or leave empty (defaults to 1). Rows with "NA" quantity are skipped.</li>
                                    <li>Unit and Remarks are optional</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
