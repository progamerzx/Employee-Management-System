import React, { useState, useEffect } from 'react';
import { Plus, Users, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EmployeeTable from './components/EmployeeTable';
import EmployeeForm from './components/EmployeeForm';
import DbStatus from './components/DbStatus';
import './App.css';

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [dbStatus, setDbStatus] = useState({ connected: false, details: {}, error: null });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [toast, setToast] = useState(null);

  const API_BASE = '/api';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setDbStatus(data);
      return data.connected;
    } catch (err) {
      console.error('Error fetching database status:', err);
      setDbStatus({ 
        connected: false, 
        error: 'Backend API is offline or unreachable.', 
        details: { mode: 'offline' } 
      });
      return false;
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (!res.ok) throw new Error('Failed to load employee records');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
      showToast('Could not load employees. Running in mock/offline mode.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchStatus();
    await fetchEmployees();
    showToast('Dashboard data refreshed', 'success');
  };

  const handleSetupDb = async () => {
    setIsSettingUp(true);
    try {
      const res = await fetch(`${API_BASE}/setup-db`, { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'success') {
        showToast(data.message || 'Database tables initialized successfully!', 'success');
        await fetchStatus();
        await fetchEmployees();
      } else {
        showToast(data.message || 'Failed to setup database', 'danger');
      }
    } catch (err) {
      console.error('Error during DB setup:', err);
      showToast('API error initializing database schema.', 'danger');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSaveEmployee = async (formData) => {
    setIsSaving(true);
    const isEdit = !!selectedEmployee;
    const url = isEdit 
      ? `${API_BASE}/employees/${selectedEmployee.id}` 
      : `${API_BASE}/employees`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok && data.status !== 'error') {
        showToast(
          isEdit 
            ? `Successfully updated ${formData.first_name}'s record.` 
            : `Registered ${formData.first_name} ${formData.last_name} successfully.`,
          'success'
        );
        setIsFormOpen(false);
        setSelectedEmployee(null);
        await fetchEmployees();
      } else {
        showToast(data.message || 'Failed to save employee record.', 'danger');
      }
    } catch (err) {
      console.error('Error saving employee:', err);
      showToast('Network error saving employee record.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee record? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.status !== 'error') {
        showToast('Employee record successfully removed.', 'success');
        await fetchEmployees();
      } else {
        showToast(data.message || 'Failed to delete employee record.', 'danger');
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      showToast('Network error deleting employee record.', 'danger');
    }
  };

  const handleOpenAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await fetchStatus();
      await fetchEmployees();
    };
    initialize();
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="brand-section">
          <div className="logo-container">
            <Users size={22} />
          </div>
          <div>
            <h1>TalentFlow</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
              Employee Management Workspace
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-icon" 
            onClick={handleRefresh} 
            disabled={isLoading}
            title="Refresh Dashboard"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
          
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </header>

      {/* Database Connection Panel */}
      <DbStatus 
        status={dbStatus} 
        onSetupDb={handleSetupDb}
        isSettingUp={isSettingUp}
      />

      {/* KPI Metrics Dashboard */}
      <Dashboard employees={employees} />

      {/* Main Employee Grid Table */}
      {isLoading ? (
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', padding: '4rem 2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <RefreshCw size={36} className="spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading employee roster...</p>
          </div>
        </div>
      ) : (
        <EmployeeTable 
          employees={employees} 
          onEdit={handleOpenEdit} 
          onDelete={handleDeleteEmployee} 
        />
      )}

      {/* Modal Dialog Form */}
      <EmployeeForm 
        employee={selectedEmployee}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEmployee(null);
        }}
        onSave={handleSaveEmployee}
        isSaving={isSaving}
      />

      {/* Toast Popups */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="toast-icon success" />
            ) : (
              <AlertCircle size={16} className="toast-icon danger" />
            )}
            <div>{toast.message}</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-light)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <p>TalentFlow Employee Directory. Connected via Microsoft ODBC Driver for Azure SQL Database.</p>
      </footer>

      {/* Add spin CSS style for refresh icon */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
