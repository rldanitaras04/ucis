'use client';

import { useState, useEffect } from 'react';
import { fetchDocuments, createDocument, revokeDocument, verifyDocument } from './actions';
import PatientSearch from '@/components/PatientSearch';
import { PatientSearchResult } from '@/app/(app)/actions/patients';
import { Plus, FileText, Eye, Prohibit, CheckCircle, XCircle, Copy } from '@phosphor-icons/react';

const DOCUMENT_TYPES = [
  { value: 'medical_certificate', label: 'Medical Certificate' },
  { value: 'dental_certificate', label: 'Dental Certificate' },
  { value: 'clearance', label: 'Clearance' },
  { value: 'referral', label: 'Referral' },
  { value: 'prescription_record', label: 'Prescription Record' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [documentType, setDocumentType] = useState('medical_certificate');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [filters, setFilters] = useState({
    document_type: '',
    status: '',
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const result = await fetchDocuments(filters);
    if (result.success) {
      setDocuments(result.data);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    setCreating(true);
    setError(null);

    const result = await createDocument({
      patient_id: selectedPatient.id,
      document_type: documentType,
      notes: notes || undefined,
    });

    if (result.success) {
      setSuccess(`Document created: ${result.control_number}`);
      setShowCreate(false);
      setSelectedPatient(null);
      setDocumentType('medical_certificate');
      setNotes('');
      loadDocuments();
    } else {
      setError(result.error || 'Failed to create document');
    }
    setCreating(false);
  };

  const handleRevoke = async (documentId: string) => {
    if (!confirm('Are you sure you want to revoke this document?')) return;

    const result = await revokeDocument(documentId);
    if (result.success) {
      setSuccess('Document revoked successfully');
      loadDocuments();
    } else {
      setError(result.error || 'Failed to revoke document');
    }
  };

  const handleVerify = async () => {
    if (!verifyToken) {
      setError('Please enter a verification token');
      return;
    }

    setVerifying(true);
    setError(null);
    setVerifyResult(null);

    const result = await verifyDocument(verifyToken);
    if (result.success) {
      setVerifyResult(result.data);
    } else {
      setError(result.error || 'Verification failed');
    }
    setVerifying(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669]">Active</span>;
      case 'revoked':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF2F2] text-[#DC2626]">Revoked</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">Expired</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">{status}</span>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading text-[#0F172A]">Documents</h1>
          <p className="text-body text-[#64748B]">Manage certificates, clearances, and official documents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowVerify(true)} className="btn-secondary flex items-center gap-2">
            <Eye size={18} />
            Verify Document
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Create Document
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold" aria-label="Close">&times;</button>
        </div>
      )}

      {success && (
        <div className="alert-success mb-4" role="alert">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-subheading text-[#0F172A]">Create Document</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Patient *</label>
                <PatientSearch
                  id="document-patient-search"
                  label="Search Patient"
                  value={selectedPatient?.id || ''}
                  onChange={(id, patient) => patient && setSelectedPatient(patient)}
                  placeholder="Search by name or patient ID..."
                />
              </div>

              <div>
                <label className="label">Document Type *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="select-field"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !selectedPatient} className="btn-primary">
                {creating ? 'Creating...' : 'Create Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerify && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-subheading text-[#0F172A]">Verify Document</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Verification Token</label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Enter verification token"
                  className="input-field font-mono"
                />
              </div>

              {verifyResult && (
                <div className={`p-4 rounded-lg ${verifyResult.valid ? 'bg-[#ECFDF5] border border-[#059669]' : 'bg-[#FEF2F2] border border-[#DC2626]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verifyResult.valid ? (
                      <CheckCircle size={20} className="text-[#059669]" />
                    ) : (
                      <XCircle size={20} className="text-[#DC2626]" />
                    )}
                    <span className={`font-medium ${verifyResult.valid ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                      {verifyResult.valid ? 'Document Verified' : 'Document Invalid'}
                    </span>
                  </div>
                  {verifyResult.valid && (
                    <div className="text-sm text-[#065F46]">
                      <p>Type: {getDocumentTypeLabel(verifyResult.document_type)}</p>
                      <p>Issued: {new Date(verifyResult.issued_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E5E7EB] flex gap-2 justify-end">
              <button onClick={() => { setShowVerify(false); setVerifyResult(null); setVerifyToken(''); }} className="btn-secondary">Close</button>
              <button onClick={handleVerify} disabled={verifying || !verifyToken} className="btn-primary">
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Document Type</label>
            <select
              value={filters.document_type}
              onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}
              className="select-field"
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="select-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadDocuments} className="btn-primary">Apply Filters</button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#9CA3AF]">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Control Number</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Patient</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Issued</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#64748B] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-[#111827]">{doc.document_control_number}</span>
                        <button
                          onClick={() => copyToClipboard(doc.document_control_number)}
                          className="text-[#9CA3AF] hover:text-[#111827]"
                          title="Copy"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1E40AF] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {doc.patient?.first_name?.charAt(0)}{doc.patient?.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {doc.patient?.last_name}, {doc.patient?.first_name}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">{doc.patient?.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B]">
                      {getDocumentTypeLabel(doc.document_type)}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#64748B]">
                      {new Date(doc.issued_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(doc.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="text-[#1E40AF] hover:text-[#1D4ED8] text-sm font-medium"
                        >
                          <Eye size={18} />
                        </button>
                        {doc.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(doc.id)}
                            className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium"
                          >
                            <Prohibit size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <h2 className="text-subheading text-[#0F172A]">Document Details</h2>
                <button onClick={() => setSelectedDocument(null)} className="text-[#9CA3AF] hover:text-[#111827]" aria-label="Close">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Control Number</p>
                  <p className="text-sm font-mono font-medium text-[#111827]">{selectedDocument.document_control_number}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Status</p>
                  {getStatusBadge(selectedDocument.status)}
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Patient</p>
                  <p className="text-sm font-medium text-[#111827]">
                    {selectedDocument.patient?.last_name}, {selectedDocument.patient?.first_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Document Type</p>
                  <p className="text-sm text-[#111827]">{getDocumentTypeLabel(selectedDocument.document_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Issued At</p>
                  <p className="text-sm text-[#111827]">{new Date(selectedDocument.issued_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Verification Expires</p>
                  <p className="text-sm text-[#111827]">{new Date(selectedDocument.verification_expires_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedDocument.notes && (
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase">Notes</p>
                  <p className="text-sm text-[#111827]">{selectedDocument.notes}</p>
                </div>
              )}
              <div className="bg-[#F9FAFB] rounded-lg p-4">
                <p className="text-xs text-[#9CA3AF] uppercase mb-2">Verification Token</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-[#111827] bg-white px-2 py-1 rounded border border-[#E5E7EB] flex-1">
                    {selectedDocument.verification_token}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedDocument.verification_token)}
                    className="text-[#1E40AF] hover:text-[#1D4ED8]"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
