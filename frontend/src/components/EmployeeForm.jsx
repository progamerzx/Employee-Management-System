import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export default function EmployeeForm({ employee, isOpen, onClose, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    hire_date: '',
    salary: ''
  });

  const [errors, setErrors] = useState({});

  // Reset or set initial form data on edit mode change or open
  useEffect(() => {
    if (employee) {
      // Format date to YYYY-MM-DD for HTML5 date input
      let formattedDate = '';
      if (employee.hire_date) {
        try {
          formattedDate = new Date(employee.hire_date).toISOString().split('T')[0];
        } catch {
          formattedDate = employee.hire_date;
        }
      }
      
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        department: employee.department || '',
        hire_date: formattedDate || '',
        salary: employee.salary || ''
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        hire_date: new Date().toISOString().split('T')[0], // default to today
        salary: ''
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.hire_date) newErrors.hire_date = 'Hire date is required';
    
    if (!formData.salary) {
      newErrors.salary = 'Salary is required';
    } else {
      const salaryNum = parseFloat(formData.salary);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        newErrors.salary = 'Salary must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {employee ? 'Edit Employee Profile' : 'Register New Employee'}
          </h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input 
                  type="text" 
                  name="first_name"
                  className="form-input" 
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  disabled={isSaving}
                />
                {errors.first_name && <span className="form-error">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input 
                  type="text" 
                  name="last_name"
                  className="form-input" 
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  disabled={isSaving}
                />
                {errors.last_name && <span className="form-error">{errors.last_name}</span>}
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  className="form-input" 
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@company.com"
                  disabled={isSaving}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input 
                  type="text" 
                  name="department"
                  className="form-input" 
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Technology"
                  list="departments-list"
                  disabled={isSaving}
                />
                <datalist id="departments-list">
                  <option value="Technology" />
                  <option value="Human Resources" />
                  <option value="Finance" />
                  <option value="Marketing" />
                  <option value="Sales" />
                </datalist>
                {errors.department && <span className="form-error">{errors.department}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Salary (USD)</label>
                <input 
                  type="number" 
                  name="salary"
                  className="form-input" 
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="85000"
                  step="0.01"
                  min="0"
                  disabled={isSaving}
                />
                {errors.salary && <span className="form-error">{errors.salary}</span>}
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Hire Date</label>
                <input 
                  type="date" 
                  name="hire_date"
                  className="form-input" 
                  value={formData.hire_date}
                  onChange={handleChange}
                  disabled={isSaving}
                />
                {errors.hire_date && <span className="form-error">{errors.hire_date}</span>}
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Check size={16} /> Save Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
