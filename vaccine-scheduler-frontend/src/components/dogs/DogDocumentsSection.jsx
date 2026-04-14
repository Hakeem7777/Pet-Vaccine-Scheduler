import { useState, useRef } from 'react';
import { uploadDogDocument, deleteDogDocument } from '../../api/dogs';
import { useAuth } from '../../context/AuthContext';
import UpgradePrompt from '../subscription/UpgradePrompt';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';

const MAX_DOCUMENTS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getFileIcon(contentType) {
  if (contentType === 'application/pdf') {
    return (
      <svg className="doc-icon doc-icon--pdf" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }
  return (
    <svg className="doc-icon doc-icon--image" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function DogDocumentsSection({ dogId, documents = [], onDocumentsChange }) {
  const { isPaid } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { id, filename, hasExtractionData }
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit.');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('File type not supported. Please upload an image or PDF.');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await uploadDogDocument(dogId, file);
      setIsOpen(true);
      onDocumentsChange();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to upload document.';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  }

  function openDeleteModal(doc) {
    setDeleteModal({
      id: doc.id,
      filename: doc.original_filename,
      hasExtractionData: doc.has_extraction_data,
    });
  }

  async function handleDelete(revertExtraction) {
    if (!deleteModal) return;

    setDeletingId(deleteModal.id);
    setDeleteModal(null);
    setError(null);
    try {
      await deleteDogDocument(dogId, deleteModal.id, revertExtraction);
      onDocumentsChange();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  const count = documents.length;
  const isFull = count >= MAX_DOCUMENTS;

  // If user is not paid, show a collapsed accordion with upgrade prompt inside
  if (!isPaid) {
    return (
      <div className="dog-documents-section">
        <button className="dog-documents-accordion-toggle" onClick={() => setIsOpen(!isOpen)}>
          <h3>Documents</h3>
          <svg className={`accordion-chevron ${isOpen ? 'accordion-chevron--open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {isOpen && (
          <div className="dog-documents-body">
            <UpgradePrompt feature="documents" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dog-documents-section">
      {/* Accordion Header */}
      <div className="dog-documents-accordion-toggle" onClick={() => setIsOpen(!isOpen)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}>
        <h3>Documents <span className="doc-count">({count}/{MAX_DOCUMENTS})</span></h3>
        <div className="dog-documents-header-actions">
          {/* <button
            className="btn btn-outline btn-pill btn-sm"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={isFull || isUploading}
            title={isFull ? 'Maximum documents reached' : 'Upload a document'}
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="small" /> Uploading...
              </>
            ) : (
              <>
                Upload
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </>
            )}
          </button> */}
          <svg className={`accordion-chevron ${isOpen ? 'accordion-chevron--open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Accordion Body */}
      {isOpen && (
        <div className="dog-documents-body">
          {error && <div className="error-message" style={{ marginBottom: 'var(--spacing-sm)' }}>{error}</div>}

          {count === 0 ? (
            <p className="dog-documents-empty">No documents uploaded yet. Upload vaccination records, health certificates, or other documents.</p>
          ) : (
            <div className="dog-documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="dog-document-item">
                  <div className="dog-document-icon">
                    {getFileIcon(doc.content_type)}
                  </div>
                  <div className="dog-document-info">
                    <span className="dog-document-name" title={doc.original_filename}>
                      {doc.original_filename}
                    </span>
                    <span className="dog-document-meta">
                      {formatFileSize(doc.file_size)} &middot; {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                  <div className="dog-document-actions">
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-pill btn-sm"
                      title="Download"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                    <button
                      className="btn btn-outline-danger btn-pill btn-sm"
                      onClick={() => openDeleteModal(doc)}
                      disabled={deletingId === doc.id}
                      title="Delete"
                    >
                      {deletingId === doc.id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isFull && (
            <p className="dog-documents-limit-note">Maximum of {MAX_DOCUMENTS} documents reached. Delete a document to upload a new one.</p>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Document"
      >
        {deleteModal && (
          <div className="doc-delete-modal">
            <p>
              Are you sure you want to delete <strong>{deleteModal.filename}</strong>?
            </p>

            {deleteModal.hasExtractionData ? (
              <>
                <p className="doc-delete-modal__note">
                  This document was used to extract information for your dog (profile fields and/or vaccination records). Would you also like to remove that data?
                </p>
                <div className="doc-delete-modal__actions">
                  <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={() => handleDelete(false)}>
                    Keep Data
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(true)}>
                    Remove Data
                  </button>
                </div>
              </>
            ) : (
              <div className="doc-delete-modal__actions">
                <button className="btn btn-outline" onClick={() => setDeleteModal(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(false)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DogDocumentsSection;
