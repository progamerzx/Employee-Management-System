import React from 'react';
import { Database, AlertTriangle, CheckCircle, Terminal, HelpCircle } from 'lucide-react';

export default function DbStatus({ status, onSetupDb, isSettingUp }) {
  if (!status) return null;

  const { connected, error, details } = status;

  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className={`metric-icon-wrapper ${connected ? 'success' : 'warning'}`}>
            <Database size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Database Storage</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className={`badge ${connected ? 'badge-connected' : 'badge-disconnected'}`}>
                {connected ? (
                  <>
                    <CheckCircle size={12} /> Connected
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> Setup Required
                  </>
                )}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {details?.driver || 'ODBC Driver'}
              </span>
            </div>
          </div>
        </div>

        {connected && details?.table_exists === false && (
          <button 
            className="btn btn-secondary" 
            onClick={onSetupDb} 
            disabled={isSettingUp}
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
          >
            {isSettingUp ? 'Checking/Creating Table...' : 'Initialize Schema'}
          </button>
        )}
      </div>

      {!connected && (
        <div style={{ marginTop: '1.25rem' }}>
          <div className="db-guide-banner">
            <HelpCircle className="db-guide-icon" size={18} />
            <div>
              <p className="db-guide-title">Azure SQL ODBC Configuration Guide</p>
              <p className="db-guide-desc">
                The application is running in <strong>mock database mode</strong>. To connect your Azure SQL Database, set the following Environment Variables in your local <code>.env</code> file or inside your <strong>Azure Web App Configuration</strong>:
              </p>
            </div>
          </div>

          <div className="code-block-container">
            <pre className="code-block">
{`# Connection Variables
DB_SERVER=your-server.database.windows.net
DB_DATABASE=your-database-name
DB_USERNAME=your-username
DB_PASSWORD=your-password

# Optional (Defaults to msodbcsql18 inside Docker)
DB_DRIVER={ODBC Driver 18 for SQL Server}`}
            </pre>
          </div>
          
          {error && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.8rem', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              <strong>Connection Error:</strong> {error}
            </div>
          )}
        </div>
      )}
      
      {connected && details?.table_exists === false && (
        <div className="db-guide-banner" style={{ marginTop: '1rem', border: '1px dashed var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
          <AlertTriangle className="db-guide-icon" size={18} />
          <div style={{ flexGrow: 1 }}>
            <p className="db-guide-title" style={{ color: 'var(--warning)' }}>Database Connected, but Table is Missing</p>
            <p className="db-guide-desc">
              The <code>Employees</code> table does not exist in your database. Click the "Initialize Schema" button above to automatically create the table.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
