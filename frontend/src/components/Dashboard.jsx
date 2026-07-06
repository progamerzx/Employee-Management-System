import React from 'react';
import { Users, DollarSign, Briefcase } from 'lucide-react';

export default function Dashboard({ employees = [] }) {
  const totalEmployees = employees.length;
  
  const avgSalary = totalEmployees > 0 
    ? employees.reduce((sum, emp) => sum + parseFloat(emp.salary || 0), 0) / totalEmployees
    : 0;

  const departments = new Set(employees.map(emp => emp.department.trim().toLowerCase()));
  const totalDepartments = departments.size;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="metrics-grid">
      <div className="glass-card metric-card">
        <div className="metric-icon-wrapper primary">
          <Users size={24} />
        </div>
        <div className="metric-details">
          <span className="metric-label">Total Employees</span>
          <span className="metric-value">{totalEmployees}</span>
        </div>
      </div>

      <div className="glass-card metric-card">
        <div className="metric-icon-wrapper success">
          <DollarSign size={24} />
        </div>
        <div className="metric-details">
          <span className="metric-label">Average Salary</span>
          <span className="metric-value">{formatCurrency(avgSalary)}</span>
        </div>
      </div>

      <div className="glass-card metric-card">
        <div className="metric-icon-wrapper warning">
          <Briefcase size={24} />
        </div>
        <div className="metric-details">
          <span className="metric-label">Active Departments</span>
          <span className="metric-value">{totalDepartments}</span>
        </div>
      </div>
    </div>
  );
}
