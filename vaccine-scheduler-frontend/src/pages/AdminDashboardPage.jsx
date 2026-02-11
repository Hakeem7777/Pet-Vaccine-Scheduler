import { useState, useEffect, useCallback, useRef } from 'react';
import * as adminApi from '../api/admin';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageTransition from '../components/common/PageTransition';
import {
  UserRegistrationsChart,
  VaccinationsOverTimeChart,
  DogAgeDistributionChart,
  VaccineTypeChart,
  TopBreedsChart,
  TokenUsageOverTimeChart,
  TokenUsageByUserChart,
  TokensByModelChart,
} from '../components/admin/AdminCharts';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import './AdminDashboardPage.css';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'dogs', label: 'Dogs' },
  { key: 'vaccinations', label: 'Vaccinations' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'tokens', label: 'Token Usage' },
  { key: 'model-tokens', label: 'Model Tokens' },
  { key: 'ai-analytics', label: 'AI Analytics' },
];

const AI_CHART_COLORS = ['#006D9C', '#2AB57F', '#FF9C3B', '#E53E3E', '#805AD5', '#DD6B20', '#319795', '#D53F8C'];

const AI_SUGGESTIONS = [
  'How many users are registered?',
  'Show me the top 10 dog breeds',
  'List users with more than 5 dogs',
  'Show monthly vaccination trends for the last year',
  'What is the distribution of vaccine types?',
  'Which users have used the most AI tokens?',
];

function SortableHeader({ label, field, currentOrdering, onSort }) {
  const isAsc = currentOrdering === field;
  const isDesc = currentOrdering === `-${field}`;
  const isActive = isAsc || isDesc;

  function handleClick() {
    if (isAsc) onSort(`-${field}`);
    else if (isDesc) onSort('');
    else onSort(field);
  }

  return (
    <th className={`sortable ${isActive ? 'sorted' : ''}`} onClick={handleClick}>
      {label}
      <span className="sort-indicator">
        {isAsc ? '\u25B2' : isDesc ? '\u25BC' : '\u25B4\u25BE'}
      </span>
    </th>
  );
}

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [tokenStats, setTokenStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [dogs, setDogs] = useState(null);
  const [vaccinations, setVaccinations] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [modelTokenData, setModelTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState('');
  const [filters, setFilters] = useState({
    users: {},
    dogs: {},
    vaccinations: {},
    contacts: {},
    tokens: {},
  });
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);

  // AI Analytics state
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModels, setAiModels] = useState([]);
  const [aiSelectedModel, setAiSelectedModel] = useState('');
  const aiMessagesEndRef = useRef(null);

  // Fetch available AI models on mount
  useEffect(() => {
    adminApi.getAdminAIModels().then((data) => {
      setAiModels(data.models || []);
      setAiSelectedModel(data.default || '');
    }).catch(() => {});
  }, []);

  const fetchTabData = useCallback(async (tab, searchQuery = '', pageNum = 1, filterParams = {}, orderingParam = '') => {
    setLoading(true);
    try {
      const params = { ...filterParams };
      if (searchQuery) params.search = searchQuery;
      if (pageNum > 1) params.page = pageNum;
      if (orderingParam) params.ordering = orderingParam;

      switch (tab) {
        case 'overview': {
          const [statsData, graphResult, tokenResult] = await Promise.all([
            adminApi.getAdminStats(),
            adminApi.getAdminGraphData(),
            adminApi.getAdminTokenUsageStats(),
          ]);
          setStats(statsData);
          setGraphData(graphResult);
          setTokenStats(tokenResult);
          break;
        }
        case 'users': {
          const usersData = await adminApi.getAdminUsers(params);
          setUsers(usersData);
          break;
        }
        case 'dogs': {
          const dogsData = await adminApi.getAdminDogs(params);
          setDogs(dogsData);
          break;
        }
        case 'vaccinations': {
          const vaxData = await adminApi.getAdminVaccinations(params);
          setVaccinations(vaxData);
          break;
        }
        case 'contacts': {
          const contactsData = await adminApi.getAdminContacts(params);
          setContacts(contactsData);
          break;
        }
        case 'tokens': {
          const tokenData = await adminApi.getAdminTokenUsage(params);
          setTokenUsage(tokenData);
          break;
        }
        case 'model-tokens': {
          const modelStats = await adminApi.getAdminTokenUsageStats();
          setModelTokenData(modelStats.per_model_over_time || []);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} data:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTabData(activeTab, search, page, filters[activeTab] || {}, ordering);
  }, [activeTab, fetchTabData]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSearch('');
    setPage(1);
    setOrdering('');
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchTabData(activeTab, search, 1, filters[activeTab] || {}, ordering);
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    fetchTabData(activeTab, search, newPage, filters[activeTab] || {}, ordering);
  }

  function handleSort(newOrdering) {
    setOrdering(newOrdering);
    setPage(1);
    fetchTabData(activeTab, search, 1, filters[activeTab] || {}, newOrdering);
  }

  function handleFilterChange(tab, key, value) {
    const updated = { ...filters[tab] };
    if (value) updated[key] = value;
    else delete updated[key];
    const newFilters = { ...filters, [tab]: updated };
    setFilters(newFilters);
    setPage(1);
    fetchTabData(activeTab, search, 1, updated, ordering);
  }

  function clearFilters(tab) {
    setFilters((prev) => ({ ...prev, [tab]: {} }));
    setPage(1);
    fetchTabData(activeTab, search, 1, {}, ordering);
  }

  async function handleToggleUserActive(id, email, isActive) {
    const action = isActive ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${action} user "${email}"?`)) return;
    try {
      await adminApi.toggleAdminUserActive(id);
      fetchTabData('users', search, page, filters.users, ordering);
    } catch (err) {
      const msg = err.response?.data?.detail || `Failed to ${action} user.`;
      alert(msg);
    }
  }

  async function handleDeleteUser(id, email) {
    if (!window.confirm(`Are you sure you want to delete user "${email}"? This will also delete all their dogs and vaccination records.`)) return;
    try {
      await adminApi.deleteAdminUser(id);
      fetchTabData('users', search, page, filters.users, ordering);
      if (stats) adminApi.getAdminStats().then(setStats).catch(() => {});
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete user.';
      alert(msg);
    }
  }

  async function handleExportCSV() {
    try {
      const params = { ...filters.users };
      if (search) params.search = search;
      if (ordering) params.ordering = ordering;
      await adminApi.exportAdminUsersCSV(params);
    } catch {
      alert('Failed to export CSV.');
    }
  }

  async function handleDeleteDog(id, name) {
    if (!window.confirm(`Are you sure you want to delete dog "${name}"? This will also delete all vaccination records for this dog.`)) return;
    try {
      await adminApi.deleteAdminDog(id);
      fetchTabData('dogs', search, page, filters.dogs, ordering);
      if (stats) adminApi.getAdminStats().then(setStats).catch(() => {});
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
      fetchTabData('contacts', search, page, filters.contacts, ordering);
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
        <button className="btn btn-outline btn-sm" disabled={!hasPrev} onClick={() => handlePageChange(page - 1)}>Previous</button>
        <span className="admin-pagination__info">Page {page}</span>
        <button className="btn btn-outline btn-sm" disabled={!hasNext} onClick={() => handlePageChange(page + 1)}>Next</button>
      </div>
    );
  }

  function renderSearchBar() {
    return (
      <form className="admin-search-form" onSubmit={handleSearch}>
        <input type="text" className="input admin-search-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>
    );
  }

  // ── Filter Bars ──────────────────────────────────────────────────

  function renderUserFilters() {
    const f = filters.users;
    return (
      <div className="admin-filter-bar">
        <div className="admin-filter-group">
          <label>Role</label>
          <select className="admin-filter-select" value={f.is_staff ?? ''} onChange={(e) => handleFilterChange('users', 'is_staff', e.target.value)}>
            <option value="">All</option>
            <option value="true">Staff</option>
            <option value="false">Non-Staff</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Status</label>
          <select className="admin-filter-select" value={f.is_active ?? ''} onChange={(e) => handleFilterChange('users', 'is_active', e.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Joined After</label>
          <input type="date" className="admin-filter-input" value={f.date_joined_after || ''} onChange={(e) => handleFilterChange('users', 'date_joined_after', e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label>Joined Before</label>
          <input type="date" className="admin-filter-input" value={f.date_joined_before || ''} onChange={(e) => handleFilterChange('users', 'date_joined_before', e.target.value)} />
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => clearFilters('users')}>Clear</button>
        )}
      </div>
    );
  }

  function renderDogFilters() {
    const f = filters.dogs;
    return (
      <div className="admin-filter-bar">
        <div className="admin-filter-group">
          <label>Sex</label>
          <select className="admin-filter-select" value={f.sex ?? ''} onChange={(e) => handleFilterChange('dogs', 'sex', e.target.value)}>
            <option value="">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="MN">Male (Neutered)</option>
            <option value="FS">Female (Spayed)</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Breed</label>
          <input type="text" className="admin-filter-input" placeholder="Filter by breed..." value={f.breed || ''} onChange={(e) => handleFilterChange('dogs', 'breed', e.target.value)} />
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => clearFilters('dogs')}>Clear</button>
        )}
      </div>
    );
  }

  function renderVaccinationFilters() {
    const f = filters.vaccinations;
    return (
      <div className="admin-filter-bar">
        <div className="admin-filter-group">
          <label>Vaccine Type</label>
          <select className="admin-filter-select" value={f.vaccine_type ?? ''} onChange={(e) => handleFilterChange('vaccinations', 'vaccine_type', e.target.value)}>
            <option value="">All</option>
            <option value="core">Core</option>
            <option value="core_conditional">Core Conditional</option>
            <option value="noncore">Non-Core</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Date After</label>
          <input type="date" className="admin-filter-input" value={f.date_after || ''} onChange={(e) => handleFilterChange('vaccinations', 'date_after', e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label>Date Before</label>
          <input type="date" className="admin-filter-input" value={f.date_before || ''} onChange={(e) => handleFilterChange('vaccinations', 'date_before', e.target.value)} />
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => clearFilters('vaccinations')}>Clear</button>
        )}
      </div>
    );
  }

  function renderContactFilters() {
    const f = filters.contacts;
    return (
      <div className="admin-filter-bar">
        <div className="admin-filter-group">
          <label>Status</label>
          <select className="admin-filter-select" value={f.is_read ?? ''} onChange={(e) => handleFilterChange('contacts', 'is_read', e.target.value)}>
            <option value="">All</option>
            <option value="false">New</option>
            <option value="true">Replied</option>
          </select>
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => clearFilters('contacts')}>Clear</button>
        )}
      </div>
    );
  }

  // ── Tab Renderers ────────────────────────────────────────────────

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
          <div className="admin-stat-card">
            <div className="admin-stat-card__number">{stats.total_ai_tokens ? stats.total_ai_tokens.toLocaleString() : '0'}</div>
            <div className="admin-stat-card__label">AI Tokens Used</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__number">{stats.total_ai_calls || 0}</div>
            <div className="admin-stat-card__label">AI Calls Made</div>
          </div>
        </div>

        {graphData && (
          <div className="admin-charts-grid">
            <UserRegistrationsChart data={graphData.user_registrations} />
            <VaccinationsOverTimeChart data={graphData.vaccinations_over_time} />
            <DogAgeDistributionChart data={graphData.age_distribution} />
            <VaccineTypeChart data={graphData.vaccine_type_distribution} />
            <TopBreedsChart data={graphData.top_breeds} />
          </div>
        )}

        {tokenStats && (tokenStats.over_time?.length > 0 || tokenStats.per_user?.length > 0) && (
          <>
            <h3 className="admin-section__title">AI Token Usage Analytics</h3>
            <div className="admin-charts-grid">
              <TokenUsageOverTimeChart data={tokenStats.over_time} />
              <TokenUsageByUserChart data={tokenStats.per_user} />
            </div>
          </>
        )}

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
        <div className="admin-users-toolbar">
          {renderSearchBar()}
          <button className="btn btn-outline btn-sm admin-export-btn" onClick={handleExportCSV}>Export CSV</button>
        </div>
        {renderUserFilters()}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="Username" field="username" currentOrdering={ordering} onSort={handleSort} />
                    <SortableHeader label="Email" field="email" currentOrdering={ordering} onSort={handleSort} />
                    <th>Clinic</th>
                    <th>Dogs</th>
                    <th>Vaccinations</th>
                    <SortableHeader label="Tokens Used" field="total_tokens_used" currentOrdering={ordering} onSort={handleSort} />
                    <th>Staff</th>
                    <th>Status</th>
                    <SortableHeader label="Joined" field="date_joined" currentOrdering={ordering} onSort={handleSort} />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="10" className="admin-table__empty">No users found.</td></tr>
                  ) : (
                    results.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.clinic_name || '-'}</td>
                        <td>{user.dog_count}</td>
                        <td>{user.vaccination_count}</td>
                        <td>{(user.total_tokens_used || 0).toLocaleString()} / {user.ai_call_count || 0} calls</td>
                        <td>{user.is_staff ? 'Yes' : 'No'}</td>
                        <td>
                          <span className={`admin-badge ${user.is_active ? 'admin-badge--active' : 'admin-badge--blocked'}`}>
                            {user.is_active ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                        <td className="admin-actions-cell">
                          <button
                            className={`btn btn-sm ${user.is_active ? 'admin-block-btn' : 'admin-unblock-btn'}`}
                            onClick={() => handleToggleUserActive(user.id, user.email, user.is_active)}
                          >
                            {user.is_active ? 'Block' : 'Unblock'}
                          </button>
                          <button
                            className="btn btn-sm admin-delete-btn"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            disabled={user.is_active}
                            title={user.is_active ? 'Block user before deleting' : 'Delete user'}
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
        {renderDogFilters()}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="Name" field="name" currentOrdering={ordering} onSort={handleSort} />
                    <th>Breed</th>
                    <th>Age</th>
                    <th>Owner</th>
                    <th>Vaccinations</th>
                    <SortableHeader label="Created" field="created_at" currentOrdering={ordering} onSort={handleSort} />
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
                          <button className="btn btn-sm admin-delete-btn" onClick={() => handleDeleteDog(dog.id, dog.name)}>Delete</button>
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
        {renderVaccinationFilters()}
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
                    <SortableHeader label="Date" field="date_administered" currentOrdering={ordering} onSort={handleSort} />
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
        {renderContactFilters()}
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
                    <SortableHeader label="Date" field="created_at" currentOrdering={ordering} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="6" className="admin-table__empty">No contact submissions yet.</td></tr>
                  ) : (
                    results.map((contact) => (
                      <tr key={contact.id} className="admin-table__clickable" onClick={() => handleContactClick(contact)}>
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

  function renderTokenUsage() {
    const results = tokenUsage?.results || [];
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
                    <th>User</th>
                    <th>Endpoint</th>
                    <th>Model</th>
                    <SortableHeader label="Input Tokens" field="input_tokens" currentOrdering={ordering} onSort={handleSort} />
                    <SortableHeader label="Output Tokens" field="output_tokens" currentOrdering={ordering} onSort={handleSort} />
                    <SortableHeader label="Total" field="total_tokens" currentOrdering={ordering} onSort={handleSort} />
                    <SortableHeader label="Date" field="created_at" currentOrdering={ordering} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="7" className="admin-table__empty">No token usage records yet.</td></tr>
                  ) : (
                    results.map((row) => (
                      <tr key={row.id}>
                        <td>{row.user_email}</td>
                        <td>{row.endpoint}</td>
                        <td>{row.model_name || '-'}</td>
                        <td>{row.input_tokens.toLocaleString()}</td>
                        <td>{row.output_tokens.toLocaleString()}</td>
                        <td>{row.total_tokens.toLocaleString()}</td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(tokenUsage)}
          </>
        )}
      </div>
    );
  }

  // ── Model Tokens ─────────────────────────────────────────────────
  function renderModelTokens() {
    return (
      <div>
        {loading ? (
          <LoadingSpinner />
        ) : modelTokenData && modelTokenData.length > 0 ? (
          <div className="admin-charts-grid">
            <TokensByModelChart data={modelTokenData} />
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-neutral-dark)', padding: '2rem' }}>No token usage data by model yet.</p>
        )}
      </div>
    );
  }

  // ── AI Analytics ──────────────────────────────────────────────────

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  async function handleAIAnalyticsSend(message) {
    const text = (message || aiInput).trim();
    if (!text || aiLoading) return;

    const userMsg = { role: 'user', content: text };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    try {
      // Build conversation history — only send the last 4 text-only pairs
      const history = [...aiMessages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await adminApi.sendAdminAIQuery(text, history, aiSelectedModel);

      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.summary,
          data: result.data,
          visualization: result.visualization,
          chartConfig: result.chart_config,
          error: result.error,
        },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  function renderAIVisualization(msg) {
    if (!msg.data || msg.error) return null;

    const { visualization, data, chartConfig = {} } = msg;
    const { x_key, y_key, title } = chartConfig;

    // Number visualization — single aggregate value
    if (visualization === 'number') {
      const value = typeof data === 'object' && !Array.isArray(data)
        ? Object.values(data)[0]
        : data;
      const label = typeof data === 'object' && !Array.isArray(data)
        ? Object.keys(data)[0]?.replace(/_/g, ' ')
        : '';
      return (
        <div className="ai-analytics__viz-card">
          {title && <div className="ai-analytics__viz-title">{title}</div>}
          <div className="ai-analytics__number-viz">
            <div className="ai-analytics__number-value">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {label && <div className="ai-analytics__number-label">{label}</div>}
          </div>
        </div>
      );
    }

    // Table visualization
    if (visualization === 'table') {
      if (!Array.isArray(data) || data.length === 0) return null;
      const columns = Object.keys(data[0]);
      return (
        <div className="ai-analytics__viz-card">
          {title && <div className="ai-analytics__viz-title">{title}</div>}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col}>
                        {row[col] != null
                          ? typeof row[col] === 'number'
                            ? row[col].toLocaleString()
                            : String(row[col])
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Chart visualizations require array data
    if (!Array.isArray(data) || data.length === 0) return null;

    if (visualization === 'pie') {
      const nameKey = x_key || Object.keys(data[0])[0];
      const valueKey = y_key || Object.keys(data[0])[1];
      return (
        <div className="ai-analytics__viz-card">
          {title && <div className="ai-analytics__viz-title">{title}</div>}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={AI_CHART_COLORS[idx % AI_CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (visualization === 'bar') {
      const xKey = x_key || Object.keys(data[0])[0];
      const yKey = y_key || Object.keys(data[0])[1];
      return (
        <div className="ai-analytics__viz-card">
          {title && <div className="ai-analytics__viz-title">{title}</div>}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={yKey} fill="#006D9C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (visualization === 'line') {
      const xKey = x_key || Object.keys(data[0])[0];
      const yKey = y_key || Object.keys(data[0])[1];
      return (
        <div className="ai-analytics__viz-card">
          {title && <div className="ai-analytics__viz-title">{title}</div>}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke="#006D9C" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (visualization === 'area') {
      const xKey = x_key || Object.keys(data[0])[0];
      const yKey = y_key || Object.keys(data[0])[1];
      return (
        <div className="ai-analytics__viz-card">
          {title && <div className="ai-analytics__viz-title">{title}</div>}
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey={yKey} stroke="#006D9C" fill="#006D9C" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  }

  function renderAIAnalytics() {
    return (
      <div className="ai-analytics">
        <div className="ai-analytics__header">
          <div className="ai-analytics__header-text">
            <h3>AI Database Analytics</h3>
            <p>Ask questions about your data in natural language</p>
          </div>
          <div className="ai-analytics__header-actions">
            {aiModels.length > 0 && (
              <select
                className="ai-analytics__model-select"
                value={aiSelectedModel}
                onChange={(e) => setAiSelectedModel(e.target.value)}
                disabled={aiLoading}
              >
                {aiModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.thinking ? ' (thinking)' : ''}
                  </option>
                ))}
              </select>
            )}
            {aiMessages.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setAiMessages([])}
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>

        <div className="ai-analytics__messages">
          {aiMessages.length === 0 && (
            <div className="ai-analytics__welcome">
              <div className="ai-analytics__welcome-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#006D9C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M8 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M16 10h.01" />
                </svg>
              </div>
              <h4>Ask anything about your database</h4>
              <p>I can query users, dogs, vaccinations, contacts, and token usage to generate insights, charts, and tables.</p>
              <div className="ai-analytics__suggestions">
                {AI_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    className="ai-analytics__chip"
                    onClick={() => handleAIAnalyticsSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {aiMessages.map((msg, idx) => (
            <div key={idx} className={`ai-analytics__message ai-analytics__message--${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="ai-analytics__avatar">AI</div>
              )}
              <div className="ai-analytics__bubble-wrap">
                <div className={`ai-analytics__bubble ai-analytics__bubble--${msg.role} ${msg.error ? 'ai-analytics__bubble--error' : ''}`}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && renderAIVisualization(msg)}
              </div>
            </div>
          ))}

          {aiLoading && (
            <div className="ai-analytics__message ai-analytics__message--assistant">
              <div className="ai-analytics__avatar">AI</div>
              <div className="ai-analytics__bubble-wrap">
                <div className="ai-analytics__bubble ai-analytics__bubble--assistant">
                  <div className="ai-analytics__typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={aiMessagesEndRef} />
        </div>

        <form
          className="ai-analytics__input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleAIAnalyticsSend();
          }}
        >
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="Ask about your data..."
            disabled={aiLoading}
          />
          <button type="submit" disabled={aiLoading || !aiInput.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  const tabRenderers = {
    overview: renderOverview,
    users: renderUsers,
    dogs: renderDogs,
    vaccinations: renderVaccinations,
    contacts: renderContacts,
    tokens: renderTokenUsage,
    'model-tokens': renderModelTokens,
    'ai-analytics': renderAIAnalytics,
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
      <Modal isOpen={!!selectedContact} onClose={handleContactModalClose} title="Contact Submission">
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
                <span className="contact-detail__value">{new Date(selectedContact.created_at).toLocaleString()}</span>
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
                  <button type="button" className="btn btn-outline" onClick={handleContactModalClose}>Close</button>
                  <button type="submit" className="btn btn-primary" disabled={replySending || !replyText.trim()}>
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
