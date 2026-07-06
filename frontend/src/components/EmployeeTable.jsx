import React, { useState, useMemo } from 'react';
import { Search, Edit3, Trash2, ArrowUpDown, Filter, UserX } from 'lucide-react';

export default function EmployeeTable({ employees = [], onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [sortField, setSortField] = useState('first_name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Get list of unique departments for filter dropdown
  const departments = useMemo(() => {
    const depts = employees.map(emp => emp.department);
    return ['all', ...new Set(depts.filter(Boolean))];
  }, [employees]);

  // Handle header sort click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort employees
  const processedEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        const matchesSearch = 
          `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.department.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
        
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        let fieldA = a[sortField];
        let fieldB = b[sortField];

        // Handle numeric parsing if sorting by salary or id
        if (sortField === 'salary') {
          fieldA = parseFloat(fieldA) || 0;
          fieldB = parseFloat(fieldB) || 0;
        } else if (sortField === 'id') {
          fieldA = parseInt(fieldA) || 0;
          fieldB = parseInt(fieldB) || 0;
        } else {
          fieldA = String(fieldA || '').toLowerCase();
          fieldB = String(fieldB || '').toLowerCase();
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [employees, searchTerm, selectedDept, sortField, sortOrder]);

  const getDeptBadgeClass = (dept) => {
    const cleanDept = dept?.toLowerCase().trim();
    if (cleanDept?.includes('tech') || cleanDept?.includes('eng') || cleanDept?.includes('dev')) return 'badge-dept-tech';
    if (cleanDept?.includes('hr') || cleanDept?.includes('human')) return 'badge-dept-hr';
    if (cleanDept?.includes('finance') || cleanDept?.includes('account')) return 'badge-dept-finance';
    if (cleanDept?.includes('market') || cleanDept?.includes('sale') || cleanDept?.includes('growth')) return 'badge-dept-marketing';
    return 'badge-dept';
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Control bar */}
      <div className="action-bar">
        <div className="search-filter-group">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by name, email, department..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <select 
              className="filter-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table grid */}
      {processedEmployees.length > 0 ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', width: '80px' }}>
                  ID <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th onClick={() => handleSort('first_name')} style={{ cursor: 'pointer' }}>
                  Employee <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                  Email <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
                  Department <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th onClick={() => handleSort('hire_date')} style={{ cursor: 'pointer' }}>
                  Hire Date <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th onClick={() => handleSort('salary')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Salary <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    #{emp.id}
                  </td>
                  <td>
                    <div className="employee-name-cell">
                      <div className="avatar">
                        {getInitials(emp.first_name, emp.last_name)}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {emp.first_name} {emp.last_name}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                  <td>
                    <span className={`badge ${getDeptBadgeClass(emp.department)}`}>
                      {emp.department}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(emp.hire_date)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(emp.salary)}
                  </td>
                  <td>
                    <div className="actions-cell" style={{ justifyContent: 'center' }}>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => onEdit(emp)}
                        title="Edit Employee"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => onDelete(emp.id)}
                        title="Delete Employee"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <UserX size={48} className="empty-state-icon" />
          <h3>No Employees Found</h3>
          <p>Try adjusting your search query, selecting another department, or add a new employee to get started.</p>
        </div>
      )}
    </div>
  );
}
