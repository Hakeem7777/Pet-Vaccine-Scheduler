import { useState, useEffect, useCallback } from 'react';
import * as adminApi from '../api/admin';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageTransition from '../components/common/PageTransition';
import './AdminDashboardPage.css';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'dogs', label: 'Dogs' },
  { key: 'vaccinations', label: 'Vaccinations' },
  { key: 'contacts', label: 'Contacts' },
];

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [dogs, setDogs] = useState(null);
  const [vaccinations, setVaccinations] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);

  // Fetch data based on active tab
  const fetchTabData = useCallback(async (tab, searchQuery = '', pageNum = 1) => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (pageNum > 1) params.page = pageNum;

      switch (tab) {
        case 'overview':
          const statsData = await adminApi.getAdminStats();
          setStats(statsData);
          break;
        case 'users':
          const usersData = await adminApi.getAdminUsers(params);
          setUsers(usersData);
          break;
        case 'dogs':
          const dogsData = await adminApi.getAdminDogs(params);
          setDogs(dogsData);
          break;
        case 'vaccinations':
          const vaxData = await adminApi.getAdminVaccinations(params);
          setVaccinations(vaxData);
          break;
        case 'contacts':
          const contactsData = await adminApi.getAdminContacts(params);
          setContacts(contactsData);
          break;
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} data:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTabData(activeTab, search, page);
  }, [activeTab, fetchTabData]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSearch('');
    setPage(1);
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchTabData(activeTab, search, 1);
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    fetchTabData(activeTab, search, newPage);
  }

  async function handleDeleteUser(id, email) {
    if (!window.confirm(`Are you sure you want to delete user "${email}"? This will also delete all their dogs and vaccination records.`)) {
      return;
    }
    try {
      await adminApi.deleteAdminUser(id);
      fetchTabData('users', search, page);
      // Refresh stats if on overview
      if (stats) {
        adminApi.getAdminStats().then(setStats).catch(() => {});
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete user.';
      alert(msg);
    }
  }

  async function handleDeleteDog(id, name) {
    if (!window.confirm(`Are you sure you want to delete dog "${name}"? This will also delete all vaccination records for this dog.`)) {
      return;
    }
    try {
      await adminApi.deleteAdminDog(id);
      fetchTabData('dogs', search, page);
      if (stats) {
        adminApi.getAdminStats().then(setStats).catch(() => {});
      }
    } catch (err) {
      alert('Failed to delete dog.');
    }
  }

  function handleContactClick(contact) {
    setSelectedContact(contact);
    setReplyText('');
    setReplyStatus(null);
  }

  function handleContactModalClose() {
    setSelectedContact(null);
    setReplyText('');
    setReplyStatus(null);
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !selectedContact) return;

    setReplySending(true);
    setReplyStatus(null);
    try {
      await adminApi.replyToContact(selectedContact.id, replyText.trim());
      setReplyStatus({ type: 'success', message: 'Reply sent successfully!' });
      setReplyText('');
      // Refresh contacts to update is_read status
      fetchTabData('contacts', search, page);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send reply.';
      setReplyStatus({ type: 'error', message: msg });
    } finally {
      setReplySending(false);
    }
  }

  function renderPagination(data) {
    if (!data) return null;
    const hasNext = !!data.next;
    const hasPrev = !!data.previous;
    if (!hasNext && !hasPrev) return null;

    return (
      <div className="admin-pagination">
        <button
          className="btn btn-outline btn-sm"
          disabled={!hasPrev}
          onClick={() => handlePageChange(page - 1)}
        >
          Previous
        </button>
        <span className="admin-pagination__info">Page {page}</span>
        <button
          className="btn btn-outline btn-sm"
          disabled={!hasNext}
          onClick={() => handlePageChange(page + 1)}
        >
          Next
        </button>
      </div>
    );
  }

  function renderSearchBar() {
    return (
      <form className="admin-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          className="input admin-search-input"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Search
        </button>
      </form>
    );
  }

  function renderOverview() {
    if (!stats) return <LoadingSpinner />;

    return (
      <div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-card__number">{stats.total_users}</div>
            <div className="admin-stat-card__label">Total Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__number">{stats.total_dogs}</div>
            <div className="admin-stat-card__label">Total Dogs</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__number">{stats.total_vaccinations}</div>
            <div className="admin-stat-card__label">Total Vaccinations</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__number">{stats.total_contacts}</div>
            <div className="admin-stat-card__label">Contact Submissions</div>
          </div>
        </div>

        {stats.recent_registrations && stats.recent_registrations.length > 0 && (
          <div className="admin-section">
            <h3 className="admin-section__title">Recent Registrations</h3>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Clinic</th>
                    <th>Dogs</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_registrations.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.clinic_name || '-'}</td>
                      <td>{user.dog_count}</td>
                      <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderUsers() {
    const results = users?.results || [];

    return (
      <div>
        {renderSearchBar()}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Clinic</th>
                    <th>Dogs</th>
                    <th>Vaccinations</th>
                    <th>Staff</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="8" className="admin-table__empty">No users found.</td></tr>
                  ) : (
                    results.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.clinic_name || '-'}</td>
                        <td>{user.dog_count}</td>
                        <td>{user.vaccination_count}</td>
                        <td>{user.is_staff ? 'Yes' : 'No'}</td>
                        <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm admin-delete-btn"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(users)}
          </>
        )}
      </div>
    );
  }

  function renderDogs() {
    const results = dogs?.results || [];

    return (
      <div>
        {renderSearchBar()}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Breed</th>
                    <th>Age</th>
                    <th>Owner</th>
                    <th>Vaccinations</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="7" className="admin-table__empty">No dogs found.</td></tr>
                  ) : (
                    results.map((dog) => (
                      <tr key={dog.id}>
                        <td>{dog.name}</td>
                        <td>{dog.breed || '-'}</td>
                        <td>{dog.age_classification}</td>
                        <td>{dog.owner_email}</td>
                        <td>{dog.vaccination_count}</td>
                        <td>{new Date(dog.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm admin-delete-btn"
                            onClick={() => handleDeleteDog(dog.id, dog.name)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(dogs)}
          </>
        )}
      </div>
    );
  }

  function renderVaccinations() {
    const results = vaccinations?.results || [];

    return (
      <div>
        {renderSearchBar()}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Dog</th>
                    <th>Owner</th>
                    <th>Vaccine</th>
                    <th>Date</th>
                    <th>Dose</th>
                    <th>Administered By</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="6" className="admin-table__empty">No vaccination records found.</td></tr>
                  ) : (
                    results.map((vax) => (
                      <tr key={vax.id}>
                        <td>{vax.dog_name}</td>
                        <td>{vax.owner_email}</td>
                        <td>{vax.vaccine_name}</td>
                        <td>{new Date(vax.date_administered).toLocaleDateString()}</td>
                        <td>{vax.dose_number || '-'}</td>
                        <td>{vax.administered_by || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(vaccinations)}
          </>
        )}
      </div>
    );
  }

  function renderContacts() {
    const results = contacts?.results || [];

    return (
      <div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="6" className="admin-table__empty">No contact submissions yet.</td></tr>
                  ) : (
                    results.map((contact) => (
                      <tr
                        key={contact.id}
                        className="admin-table__clickable"
                        onClick={() => handleContactClick(contact)}
                      >
                        <td>{contact.name}</td>
                        <td>{contact.email}</td>
                        <td>{contact.subject}</td>
                        <td className="admin-table__message">{contact.message}</td>
                        <td>
                          <span className={`admin-badge ${contact.is_read ? 'admin-badge--read' : 'admin-badge--new'}`}>
                            {contact.is_read ? 'Replied' : 'New'}
                          </span>
                        </td>
                        <td>{new Date(contact.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(contacts)}
          </>
        )}
      </div>
    );
  }

  const tabRenderers = {
    overview: renderOverview,
    users: renderUsers,
    dogs: renderDogs,
    vaccinations: renderVaccinations,
    contacts: renderContacts,
  };

  return (
    <PageTransition className="admin-dashboard">
      <div className="page-header">
        <h2>Admin Panel</h2>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-tab-content">
        {tabRenderers[activeTab]()}
      </div>

      {/* Contact Detail Modal */}
      <Modal
        isOpen={!!selectedContact}
        onClose={handleContactModalClose}
        title="Contact Submission"
      >
        {selectedContact && (
          <div className="contact-detail">
            <div className="contact-detail__meta">
              <div className="contact-detail__row">
                <span className="contact-detail__label">From</span>
                <span className="contact-detail__value">{selectedContact.name}</span>
              </div>
              <div className="contact-detail__row">
                <span className="contact-detail__label">Email</span>
                <span className="contact-detail__value">{selectedContact.email}</span>
              </div>
              <div className="contact-detail__row">
                <span className="contact-detail__label">Subject</span>
                <span className="contact-detail__value">{selectedContact.subject}</span>
              </div>
              <div className="contact-detail__row">
                <span className="contact-detail__label">Date</span>
                <span className="contact-detail__value">
                  {new Date(selectedContact.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="contact-detail__message-section">
              <h4 className="contact-detail__section-title">Message</h4>
              <div className="contact-detail__message">{selectedContact.message}</div>
            </div>

            <div className="contact-detail__reply-section">
              <h4 className="contact-detail__section-title">Reply via Email</h4>
              {replyStatus && (
                <div className={`contact-detail__status contact-detail__status--${replyStatus.type}`}>
                  {replyStatus.message}
                </div>
              )}
              <form onSubmit={handleSendReply}>
                <textarea
                  className="contact-detail__reply-input"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  required
                />
                <div className="contact-detail__reply-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleContactModalClose}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={replySending || !replyText.trim()}
                  >
                    {replySending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}

export default AdminDashboardPage;
