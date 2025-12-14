import React, { useState, useEffect } from 'react';
import { Upload, Download, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const PaperScreeningApp = () => {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperUrl, setPaperUrl] = useState('');
  const [formData, setFormData] = useState({
    include_not_include: '',
    reason_for_exclusion: '',
    db_used_in_the_study: '',
    primary_task: [],
    model_type: [],
    input_regions: [],
    organism: [],
    comments: ''
  });
  const [criteriaChecks, setCriteriaChecks] = useState({
    has_mrna_focus: null,
    has_ai_dl_model: null,
    has_architecture: null,
    has_data_source: null,
    has_quantitative_eval: null,
    is_protein_structure_only: null,
    is_rna_binding_only: null,
    is_modification_only: null,
    is_duplicate: null,
    is_no_computational_model: null,
    is_other_exclusion: null
  });

  useEffect(() => {
    if (csvData.length > 0 && currentIndex < csvData.length) {
      loadPaperData(currentIndex);
    }
  }, [currentIndex, csvData]);

  useEffect(() => {
    const {
      has_mrna_focus,
      has_ai_dl_model,
      has_architecture,
      has_data_source,
      has_quantitative_eval,
      is_protein_structure_only,
      is_rna_binding_only,
      is_modification_only,
      is_duplicate,
      is_no_computational_model,
      is_other_exclusion
    } = criteriaChecks;

    const nothingChecked = Object.values(criteriaChecks).every(val => val === null);
    if (nothingChecked) return;

    const hasExclusionFlag = is_protein_structure_only === true || 
                             is_rna_binding_only === true || 
                             is_modification_only === true || 
                             is_duplicate === true || 
                             is_no_computational_model === true ||
                             is_other_exclusion === true ||
                             has_mrna_focus === false ||
                             has_ai_dl_model === false ||
                             has_quantitative_eval === false;

    const allInclusionMet = has_mrna_focus === true && 
                           has_ai_dl_model === true && 
                           has_architecture === true && 
                           has_data_source === true && 
                           has_quantitative_eval === true;

    let status = '';
    let reasons = [];

    if (hasExclusionFlag) {
      status = 'exclude';
      
      if (has_mrna_focus === false) {
        reasons.push('no_mrna_stability_or_translation');
      }
      if (has_ai_dl_model === false || is_no_computational_model === true) {
        reasons.push('no_ai_dl_model');
      }
      if (has_quantitative_eval === false) {
        reasons.push('no_quantitative_evaluation');
      }
      if (is_protein_structure_only === true) {
        reasons.push('protein_structure_only');
      }
      if (is_rna_binding_only === true) {
        reasons.push('rna_binding_only');
      }
      if (is_modification_only === true) {
        reasons.push('modification_only');
      }
      if (is_duplicate === true) {
        reasons.push('duplicate_or_derivative');
      }
      if (is_other_exclusion === true) {
        reasons.push('other');
      }
    } else if (allInclusionMet) {
      status = 'include';
    } else {
      status = 'maybe';
    }

    setFormData(prev => ({
      ...prev, 
      include_not_include: status, 
      reason_for_exclusion: reasons.join(';')
    }));
  }, [criteriaChecks]);

  const loadPaperData = (index) => {
    const row = csvData[index];
    setPaperTitle(row.title || row.Title || row.paper_title || '');
    setPaperUrl(row.url || row.URL || row.link || row.paper_url || row.doi || '');
    
    setFormData({
      include_not_include: row.include_not_include || '',
      reason_for_exclusion: row.reason_for_exclusion || '',
      db_used_in_the_study: row.db_used_in_the_study || '',
      primary_task: row.primary_task ? row.primary_task.split(';').map(s => s.trim()) : [],
      model_type: row.model_type ? row.model_type.split(';').map(s => s.trim()) : [],
      input_regions: row.input_regions ? row.input_regions.split(';').map(s => s.trim()) : [],
      organism: row.organism ? row.organism.split(';').map(s => s.trim()) : [],
      comments: row.comments || ''
    });

    setCriteriaChecks({
      has_mrna_focus: null,
      has_ai_dl_model: null,
      has_architecture: null,
      has_data_source: null,
      has_quantitative_eval: null,
      is_protein_structure_only: null,
      is_rna_binding_only: null,
      is_modification_only: null,
      is_duplicate: null,
      is_no_computational_model: null,
      is_other_exclusion: null
    });
  };

  const isPaperLabeled = (row) => {
    const status = row.include_not_include || '';
    const reason = row.reason_for_exclusion || '';
    const dataset = row.db_used_in_the_study || '';
    const primaryTask = row.primary_task || '';
    const modelType = row.model_type || '';
    const inputRegions = row.input_regions || '';
    const organism = row.organism || '';
    
    // All annotation fields must be filled for any status
    const hasAnnotations = primaryTask.trim() && modelType.trim() && inputRegions.trim() && organism.trim();
    
    if (!hasAnnotations) return false;
    
    if (status === 'maybe') return true;
    if (status === 'exclude' && reason.trim()) return true;
    if (status === 'include' && dataset.trim()) return true;
    
    return false;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return;
      
      const headerLine = lines[0];
      const parsedHeaders = parseCSVLine(headerLine);
      setHeaders(parsedHeaders);
      
      const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        parsedHeaders.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });
      
      setCsvData(rows);
      
      // Find first unlabeled paper
      const firstUnlabeledIndex = rows.findIndex(row => !isPaperLabeled(row));
      setCurrentIndex(firstUnlabeledIndex >= 0 ? firstUnlabeledIndex : 0);
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result.map(value => value.trim());
  };

  const saveCurrentPaper = () => {
    const updatedData = [...csvData];
    const currentRow = updatedData[currentIndex];
    // Preserve the original title/url field name used in CSV
    const titleField = currentRow.title !== undefined ? 'title' : currentRow.Title !== undefined ? 'Title' : currentRow.paper_title !== undefined ? 'paper_title' : 'title';
    const urlField = currentRow.url !== undefined ? 'url' : currentRow.URL !== undefined ? 'URL' : currentRow.link !== undefined ? 'link' : currentRow.paper_url !== undefined ? 'paper_url' : currentRow.doi !== undefined ? 'doi' : 'url';
    
    updatedData[currentIndex] = {
      ...currentRow,
      [titleField]: paperTitle,
      [urlField]: paperUrl,
      include_not_include: formData.include_not_include,
      reason_for_exclusion: formData.reason_for_exclusion,
      db_used_in_the_study: formData.db_used_in_the_study,
      primary_task: formData.primary_task.join(';'),
      model_type: formData.model_type.join(';'),
      input_regions: formData.input_regions.join(';'),
      organism: formData.organism.join(';'),
      comments: formData.comments
    };
    setCsvData(updatedData);
  };

  const handleNext = () => {
    saveCurrentPaper();
    if (currentIndex < csvData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    saveCurrentPaper();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const exportCSV = () => {
    // Save current paper directly to the data array
    const updatedData = [...csvData];
    const currentRow = updatedData[currentIndex];
    // Preserve the original title/url field name used in CSV
    const titleField = currentRow.title !== undefined ? 'title' : currentRow.Title !== undefined ? 'Title' : currentRow.paper_title !== undefined ? 'paper_title' : 'title';
    const urlField = currentRow.url !== undefined ? 'url' : currentRow.URL !== undefined ? 'URL' : currentRow.link !== undefined ? 'link' : currentRow.paper_url !== undefined ? 'paper_url' : currentRow.doi !== undefined ? 'doi' : 'url';
    
    updatedData[currentIndex] = {
      ...currentRow,
      [titleField]: paperTitle,
      [urlField]: paperUrl,
      include_not_include: formData.include_not_include,
      reason_for_exclusion: formData.reason_for_exclusion,
      db_used_in_the_study: formData.db_used_in_the_study,
      primary_task: formData.primary_task.join(';'),
      model_type: formData.model_type.join(';'),
      input_regions: formData.input_regions.join(';'),
      organism: formData.organism.join(';'),
      comments: formData.comments
    };
    
    const allHeaders = [...new Set([...headers, 'include_not_include', 'reason_for_exclusion', 'db_used_in_the_study', 'primary_task', 'model_type', 'input_regions', 'organism', 'comments'])];
    
    const escapeCSV = (value) => {
      const str = String(value || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      allHeaders.map(escapeCSV).join(','),
      ...updatedData.map(row => 
        allHeaders.map(header => escapeCSV(row[header] || '')).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotated_papers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleArrayValue = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const CheckboxGroup = ({ field, options, label, required = false }) => {
    const [customValue, setCustomValue] = useState('');
    const isEmpty = formData[field].length === 0;
    const showRequired = required && isEmpty;
    const showFilled = required && !isEmpty;
    
    const addCustomValue = () => {
      if (customValue.trim() && !formData[field].includes(customValue.trim())) {
        setFormData(prev => ({
          ...prev,
          [field]: [...prev[field], customValue.trim()]
        }));
        setCustomValue('');
      }
    };

    const removeValue = (value) => {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter(v => v !== value)
      }));
    };

    return (
      <div className={`mb-4 p-3 rounded-lg ${showRequired ? 'bg-red-50 border-2 border-red-400' : showFilled ? 'bg-green-50 border border-green-300' : ''}`}>
        <label className="block font-semibold mb-2 flex items-center">
          <span>{label}</span>
          {required && <span className="text-red-600 ml-1">*</span>}
          {showRequired && (
            <span className="ml-2 text-sm font-normal text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Required!
            </span>
          )}
          {showFilled && (
            <span className="ml-2 text-sm font-normal text-green-600 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Filled
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {options.map(opt => (
            <label key={opt} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData[field].includes(opt)}
                onChange={() => toggleArrayValue(field, opt)}
                className="w-4 h-4"
              />
              <span className="text-sm">{opt.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
        
        {formData[field].length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {formData[field].map(val => (
              <span key={val} className="inline-flex items-center bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                {val}
                <button
                  onClick={() => removeValue(val)}
                  className="ml-1 text-indigo-600 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomValue()}
            placeholder="Add custom value..."
            className={`flex-1 text-sm rounded px-2 py-1 ${showRequired ? 'border-2 border-red-400' : 'border border-gray-300'}`}
          />
          <button
            onClick={addCustomValue}
            className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
          >
            Add
          </button>
        </div>
      </div>
    );
  };

  if (csvData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Paper Screening Tool</h1>
          <p className="text-gray-600 mb-8">Upload your CSV file to start screening papers</p>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-indigo-500 transition">
              <Upload className="w-16 h-16 text-gray-400 mb-4" />
              <span className="text-lg font-medium text-gray-700">Upload CSV File</span>
              <span className="text-sm text-gray-500 mt-2">Click to browse</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  const statusIcon = formData.include_not_include === 'include' ? 
    <CheckCircle className="w-5 h-5 text-green-600" /> :
    formData.include_not_include === 'exclude' ?
    <XCircle className="w-5 h-5 text-red-600" /> :
    formData.include_not_include === 'maybe' ?
    <AlertCircle className="w-5 h-5 text-yellow-600" /> : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Paper Screening</h1>
            <button
              onClick={exportCSV}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>
            
            <div className="flex items-center space-x-3">
              {statusIcon}
              <span className="text-lg font-semibold">
                Paper {currentIndex + 1} of {csvData.length}
              </span>
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentIndex === csvData.length - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Paper Information</h2>
            
            <div className="mb-4">
              <label className="block font-semibold mb-2">Paper Title</label>
              <input
                type="text"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter paper title"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2">Paper URL/DOI</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={paperUrl}
                  onChange={(e) => setPaperUrl(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter paper URL or DOI"
                />
                {paperUrl && (
                  <a
                    href={paperUrl.startsWith('http') ? paperUrl : `https://doi.org/${paperUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    <span>Open</span>
                  </a>
                )}
              </div>
            </div>

            <div className="mb-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-gray-800">Screening Checklist</h3>
              
              <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase">Inclusion Requirements (ALL must be checked):</p>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_ai_dl_model === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_ai_dl_model: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Uses AI/Deep Learning model (not traditional ML)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_mrna_focus === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_mrna_focus: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Develops/applies AI/DL for mRNA stability, degradation, or translation efficiency</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_architecture === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_architecture: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Describes model architecture</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_data_source === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_data_source: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Clear data source provided</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_quantitative_eval === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_quantitative_eval: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Quantitative evaluation with performance metrics</span>
                </label>
              </div>

              <div className="space-y-2 pt-3 border-t">
                <p className="text-xs font-semibold text-gray-600 uppercase">Exclusion Flags:</p>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_mrna_focus === false}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_mrna_focus: e.target.checked ? false : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">No mRNA stability/translation focus</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_ai_dl_model === false || criteriaChecks.is_no_computational_model === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCriteriaChecks({...criteriaChecks, has_ai_dl_model: false, is_no_computational_model: true});
                      } else {
                        setCriteriaChecks({...criteriaChecks, has_ai_dl_model: null, is_no_computational_model: null});
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">No AI/DL model (traditional ML or purely experimental/theoretical)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.has_quantitative_eval === false}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, has_quantitative_eval: e.target.checked ? false : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">No quantitative evaluation</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.is_protein_structure_only === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, is_protein_structure_only: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Protein structure prediction only</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.is_rna_binding_only === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, is_rna_binding_only: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">RNA-protein binding only</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.is_modification_only === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, is_modification_only: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Modification site detection only (no link to stability/translation)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.is_duplicate === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, is_duplicate: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Duplicate or derivative version (specify in comments)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaChecks.is_other_exclusion === true}
                    onChange={(e) => setCriteriaChecks({...criteriaChecks, is_other_exclusion: e.target.checked ? true : null})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Other (specify in comments)</span>
                </label>
              </div>

              {formData.include_not_include && (
                <div className={`mt-3 p-2 rounded text-sm font-semibold ${
                  formData.include_not_include === 'include' ? 'bg-green-100 text-green-800' :
                  formData.include_not_include === 'exclude' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  Decision: {formData.include_not_include.toUpperCase()}
                  {formData.reason_for_exclusion && ` (${formData.reason_for_exclusion})`}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2">Inclusion Status</label>
              <select
                value={formData.include_not_include}
                onChange={(e) => setFormData({...formData, include_not_include: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                <option value="include">Include</option>
                <option value="exclude">Exclude</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>

            {formData.include_not_include === 'exclude' && (
              <div className="mb-4">
                <label className="block font-semibold mb-2">Reason for Exclusion (auto-filled from checklist)</label>
                <input
                  type="text"
                  value={formData.reason_for_exclusion}
                  onChange={(e) => setFormData({...formData, reason_for_exclusion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Multiple reasons separated by semicolons"
                />
              </div>
            )}

            <div className={`mb-4 p-4 rounded-lg ${
              formData.include_not_include === 'include' 
                ? (!formData.db_used_in_the_study.trim() ? 'bg-red-50 border-2 border-red-400' : 'bg-green-50 border border-green-300')
                : ''
            }`}>
              <label className="block font-semibold mb-2 flex items-center">
                <span>Datasets Used</span>
                {formData.include_not_include === 'include' && <span className="text-red-600 ml-1">*</span>}
                {formData.include_not_include === 'include' && !formData.db_used_in_the_study.trim() && (
                  <span className="ml-2 text-sm font-normal text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Required field!
                  </span>
                )}
                {formData.include_not_include === 'include' && formData.db_used_in_the_study.trim() && (
                  <span className="ml-2 text-sm font-normal text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Filled
                  </span>
                )}
              </label>
              <textarea
                value={formData.db_used_in_the_study}
                onChange={(e) => setFormData({...formData, db_used_in_the_study: e.target.value})}
                className={`w-full rounded-lg px-3 py-2 ${
                  formData.include_not_include === 'include'
                    ? (!formData.db_used_in_the_study.trim() ? 'border-2 border-red-400 bg-white' : 'border border-green-400 bg-white')
                    : 'border border-gray-300'
                }`}
                rows="3"
                placeholder="Enter dataset names separated by semicolons"
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-2">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({...formData, comments: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows="3"
                placeholder="Add any notes or uncertainties"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Annotation Details</h2>
            
            <CheckboxGroup
              field="primary_task"
              label="Primary Task"
              options={['mrna_half_life_prediction', 'translation_efficiency', 'ribosome_density', 'mrna_degradation_sites', 'utr_design']}
              required={true}
            />

            <CheckboxGroup
              field="model_type"
              label="Model Type"
              options={['cnn', 'rnn', 'transformer', 'graph_nn', 'mlp', 'diffusion', 'hybrid']}
              required={true}
            />

            <CheckboxGroup
              field="input_regions"
              label="Input Regions"
              options={['5utr', 'cds', '3utr', 'full_mrna', 'sequence_plus_structure']}
              required={true}
            />

            <CheckboxGroup
              field="organism"
              label="Organism"
              options={['human', 'mouse', 'yeast']}
              required={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperScreeningApp;