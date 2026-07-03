import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { facultyApi } from '../api/facultyApi';
import '../styles/BulkAddStudents.css';

export function BulkAddStudents({ assignmentId, onSuccess }) {
  const [mode, setMode] = useState('manual');
  const [students, setStudents] = useState([
    { register_no: '', student_name: '', email: '' }
  ]);
  const [csvFile, setCsvFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadResults, setUploadResults] = useState(null);

  const CACHE_KEY = `bulk_students_${assignmentId}`;

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudents(parsed);
          setPreview(parsed.filter(s => s.register_no && s.student_name));
        }
      } catch (err) {
        console.error('Failed to restore cached data:', err);
      }
    }
  }, [CACHE_KEY]);

  useEffect(() => {
    const hasData = students.some(s => s.register_no || s.student_name || s.email);
    if (hasData) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(students));
    }
  }, [students, CACHE_KEY]);

  function addRow() {
    setStudents([...students, { register_no: '', student_name: '', email: '' }]);
  }

  function removeRow(index) {
    if (students.length > 1) {
      const updated = students.filter((_, i) => i !== index);
      setStudents(updated);
    }
  }

  function updateField(index, field, value) {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);

    const validStudents = updated.filter(s => s.register_no && s.student_name);
    setPreview(validStudents);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const parsed = [];
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            if (i === 0) {
              const firstCell = String(row[0] || '').toLowerCase();
              if (firstCell.includes('register') || firstCell.includes('name') || firstCell.includes('student')) {
                continue;
              }
            }

            if (row.length >= 2) {
              parsed.push({
                register_no: String(row[0] || '').trim(),
                student_name: String(row[1] || '').trim(),
                email: String(row[2] || '').trim()
              });
            }
          }

          if (parsed.length > 0) {
            setStudents(parsed);
            setPreview(parsed);
            setMessage({ type: 'success', text: `Parsed ${parsed.length} students from Excel file` });
          } else {
            setMessage({ type: 'error', text: 'No valid students found in Excel file' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Failed to parse Excel file: ' + err.message });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const parsed = parseCSV(text);
          if (parsed.length > 0) {
            setStudents(parsed);
            setPreview(parsed);
            setMessage({ type: 'success', text: `Parsed ${parsed.length} students from file` });
          } else {
            setMessage({ type: 'error', text: 'No valid students found in file' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Failed to parse file: ' + err.message });
        }
      };
      reader.readAsText(file);
    }
  }

  function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (i === 0 && (line.toLowerCase().includes('register') || line.toLowerCase().includes('name'))) {
        continue;
      }

      const parts = line.split(/[,\t]/).map(p => p.trim());

      if (parts.length >= 2) {
        result.push({
          register_no: parts[0] || '',
          student_name: parts[1] || '',
          email: parts[2] || ''
        });
      }
    }

    return result;
  }

  function clearAll() {
    setStudents([{ register_no: '', student_name: '', email: '' }]);
    setPreview([]);
    setCsvFile(null);
    setMessage({ type: '', text: '' });
    setUploadResults(null);
    localStorage.removeItem(CACHE_KEY);
  }

  async function handleSubmit() {
    const validStudents = preview.filter(s => s.register_no && s.student_name);

    if (validStudents.length === 0) {
      setMessage({ type: 'error', text: 'No valid students to add. Register No and Name are required.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    setUploadResults(null);

    try {
      const response = await facultyApi.addStudentsBulk(assignmentId, validStudents);
      setUploadResults(response.results);

      if (response.results.success.length > 0) {
        setMessage({
          type: 'success',
          text: `Successfully added ${response.results.success.length} student(s)`
        });

        if (response.results.errors.length === 0) {
          clearAll();
          if (onSuccess) onSuccess();
        }
      }

      if (response.results.errors.length > 0) {
        setMessage({
          type: 'warning',
          text: `${response.results.errors.length} student(s) failed. Review errors below.`
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add students: ' + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bulk-add-students">
      <div className="bulk-header">
        <h3>Bulk Add Students</h3>
        <p className="bulk-description">
          Add multiple students at once using manual entry or CSV/Excel upload.
          Data is saved automatically if you refresh the page.
        </p>
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
        >
          CSV/Excel Upload
        </button>
      </div>

      {message.text && (
        <div className={`bulk-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {mode === 'manual' && (
        <div className="manual-entry">
          <div className="manual-header">
            <h4>Enter Student Details</h4>
            <button onClick={addRow} className="btn-add-row">
              + Add Row
            </button>
          </div>

          <div className="manual-table-container">
            <table className="manual-table">
              <thead>
                <tr>
                  <th>Register No *</th>
                  <th>Student Name *</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={student.register_no}
                        onChange={(e) => updateField(index, 'register_no', e.target.value)}
                        placeholder="e.g., 23CSE001"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={student.student_name}
                        onChange={(e) => updateField(index, 'student_name', e.target.value)}
                        placeholder="Student name"
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={student.email}
                        onChange={(e) => updateField(index, 'email', e.target.value)}
                        placeholder="student@example.com"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => removeRow(index)}
                        className="btn-remove"
                        disabled={students.length === 1}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div className="upload-section">
          <h4>Upload CSV or Excel File</h4>
          <p className="upload-help">
            File should have columns: <strong>Register_No, Student_Name, Email</strong>
            <br />
            Supports both comma-separated (CSV) and tab-separated (Excel copy-paste) formats.
          </p>

          <div className="upload-input">
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileUpload}
              id="csv-file"
            />
            <label htmlFor="csv-file" className="file-label">
              {csvFile ? csvFile.name : 'Choose File'}
            </label>
          </div>

          <div className="upload-example">
            <strong>Example format:</strong>
            <pre>
              Register_No, Student_Name, Email{'\n'}
              23CSE001, John Doe, john@example.com{'\n'}
              23CSE002, Jane Smith, jane@example.com
            </pre>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="preview-section">
          <h4>Preview ({preview.length} student{preview.length !== 1 ? 's' : ''})</h4>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((student, index) => (
                  <tr key={index}>
                    <td>{student.register_no}</td>
                    <td>{student.student_name}</td>
                    <td>{student.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {uploadResults && (
        <div className="results-section">
          <h4>Upload Results</h4>

          {uploadResults.success.length > 0 && (
            <div className="results-success">
              <h5>✓ Successfully Added ({uploadResults.success.length})</h5>
              <ul>
                {uploadResults.success.map((item, idx) => (
                  <li key={idx}>
                    Row {item.row}: {item.register_no} - {item.student_name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploadResults.errors.length > 0 && (
            <div className="results-errors">
              <h5>✗ Failed ({uploadResults.errors.length})</h5>
              <ul>
                {uploadResults.errors.map((item, idx) => (
                  <li key={idx}>
                    Row {item.row}: {item.register_no} - {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bulk-actions">
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={loading || preview.length === 0}
        >
          {loading ? 'Adding Students...' : `Add ${preview.length} Student${preview.length !== 1 ? 's' : ''}`}
        </button>
        <button
          onClick={clearAll}
          className="btn-secondary"
          disabled={loading}
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
