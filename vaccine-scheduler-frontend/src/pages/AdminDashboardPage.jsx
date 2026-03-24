import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as adminApi from '../api/admin';
import { useAuth } from '../context/AuthContext';
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
import ChartCard from '../components/admin/ChartCard';
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
  { key: 'blogs', label: 'Blogs' },
  { key: 'ads', label: 'Ads' },
  { key: 'help-videos', label: 'Help Videos' },
  { key: 'landing-videos', label: 'Landing Videos' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'promo-codes', label: 'Promo Codes' },
  { key: 'tokens', label: 'Token Usage' },
  { key: 'model-tokens', label: 'Model Tokens' },
  { key: 'ai-analytics', label: 'AI Analytics' },
];

const AI_CHART_COLORS = ['#006D9C', '#2AB57F', '#F4A261', '#E53E3E', '#805AD5', '#DD6B20', '#319795', '#D53F8C'];

const AI_SUGGESTIONS = [
  'How many users are registered?',
  'Show me the top 10 dog breeds',
  'List users with more than 5 dogs',
  'Show monthly vaccination trends for the last year',
  'What is the distribution of vaccine types?',
  'Which users have used the most AI tokens?',
];

const GRAPH_CHARTS = ['user_registrations', 'vaccinations_over_time', 'vaccine_type_distribution', 'top_breeds', 'age_distribution'];
const TOKEN_CHART_MAP = { token_over_time: 'over_time', token_per_user: 'per_user', per_model_over_time: 'per_model_over_time' };
const PAGE_SIZE = 20;
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

function validateFileSize(file, maxSize) {
  if (!file) return true;
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    alert(`File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${maxMB} MB.`);
    return false;
  }
  return true;
}

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [dogs, setDogs] = useState(null);
  const [vaccinations, setVaccinations] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [blogs, setBlogs] = useState(null);
  const [blogFormOpen, setBlogFormOpen] = useState(false);
  const [blogFormData, setBlogFormData] = useState(null);
  const [blogFormLoading, setBlogFormLoading] = useState(false);
  const [openKebabBlogId, setOpenKebabBlogId] = useState(null);
  const [adsList, setAdsList] = useState([]);
  const [adFormOpen, setAdFormOpen] = useState(false);
  const [adFormData, setAdFormData] = useState(null);
  const [adFormLoading, setAdFormLoading] = useState(false);
  const [openKebabAdId, setOpenKebabAdId] = useState(null);
  const [adAnalytics, setAdAnalytics] = useState(null);
  const [adAnalyticsLoading, setAdAnalyticsLoading] = useState(false);
  const [helpVideos, setHelpVideos] = useState(null);
  const [helpVideoFormOpen, setHelpVideoFormOpen] = useState(false);
  const [helpVideoFormData, setHelpVideoFormData] = useState(null);
  const [helpVideoFormLoading, setHelpVideoFormLoading] = useState(false);
  const [openKebabHelpVideoId, setOpenKebabHelpVideoId] = useState(null);
  const [landingVideos, setLandingVideos] = useState(null);
  const [landingVideoFormOpen, setLandingVideoFormOpen] = useState(false);
  const [landingVideoFormData, setLandingVideoFormData] = useState(null);
  const [landingVideoFormLoading, setLandingVideoFormLoading] = useState(false);
  const [openKebabLandingVideoId, setOpenKebabLandingVideoId] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [promoCodes, setPromoCodes] = useState(null);
  const [promoFormOpen, setPromoFormOpen] = useState(false);
  const [promoFormData, setPromoFormData] = useState(null);
  const [promoFormLoading, setPromoFormLoading] = useState(false);
  const [openKebabPromoId, setOpenKebabPromoId] = useState(null);
  const [promoRedemptions, setPromoRedemptions] = useState(null);
  const [promoRedemptionsOpen, setPromoRedemptionsOpen] = useState(false);
  const quillRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState('');
  const [filters, setFilters] = useState({
    users: {},
    dogs: {},
    vaccinations: {},
    contacts: {},
    blogs: {},
    ads: {},
    'help-videos': {},
    referrals: {},
    'promo-codes': {},
    tokens: {},
  });
  // Per-chart data and loading state
  const [chartData, setChartData] = useState({});
  const [chartLoading, setChartLoading] = useState({});

  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);

  // Kebab menu state
  const [openKebabUserId, setOpenKebabUserId] = useState(null);
  const [openKebabDogId, setOpenKebabDogId] = useState(null);
  const kebabMenuRef = useRef(null);

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

  // Close kebab menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (kebabMenuRef.current && !kebabMenuRef.current.contains(e.target)) {
        setOpenKebabUserId(null);
        setOpenKebabDogId(null);
        setOpenKebabBlogId(null);
        setOpenKebabAdId(null);
        setOpenKebabHelpVideoId(null);
        setOpenKebabLandingVideoId(null);
        setOpenKebabPromoId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Distribute bulk API results into per-chart state
  function distributeChartData(graphResult, tokenResult) {
    setChartData({
      user_registrations: { data: graphResult.user_registrations, granularity: graphResult.user_registrations_granularity },
      vaccinations_over_time: { data: graphResult.vaccinations_over_time, granularity: graphResult.vaccinations_granularity },
      vaccine_type_distribution: { data: graphResult.vaccine_type_distribution },
      top_breeds: { data: graphResult.top_breeds },
      age_distribution: { data: graphResult.age_distribution },
      token_over_time: { data: tokenResult.over_time, granularity: tokenResult.token_granularity },
      token_per_user: { data: tokenResult.per_user },
      per_model_over_time: { data: tokenResult.per_model_over_time, granularity: tokenResult.token_granularity },
    });
  }

  // Per-chart filter change handler
  const handleChartFilterChange = useCallback(async (chartKey, filterParams) => {
    setChartLoading((prev) => ({ ...prev, [chartKey]: true }));
    try {
      const apiParams = {};
      if (filterParams.date_from) {
        apiParams.date_from = filterParams.date_from;
        if (filterParams.date_to) apiParams.date_to = filterParams.date_to;
      } else {
        apiParams.range = filterParams.range;
      }
      if (filterParams.granularity && filterParams.granularity !== 'auto') {
        apiParams.granularity = filterParams.granularity;
      }

      let result;
      if (GRAPH_CHARTS.includes(chartKey)) {
        result = await adminApi.getAdminChartData(chartKey, apiParams);
        const granKey = chartKey === 'user_registrations' ? 'user_registrations_granularity'
          : chartKey === 'vaccinations_over_time' ? 'vaccinations_granularity'
          : null;
        setChartData((prev) => ({
          ...prev,
          [chartKey]: {
            data: result[chartKey],
            ...(granKey ? { granularity: result[granKey] } : {}),
          },
        }));
      } else if (TOKEN_CHART_MAP[chartKey]) {
        const apiChartKey = TOKEN_CHART_MAP[chartKey];
        result = await adminApi.getAdminTokenChartData(apiChartKey, apiParams);
        setChartData((prev) => ({
          ...prev,
          [chartKey]: {
            data: result[apiChartKey],
            ...(result.token_granularity ? { granularity: result.token_granularity } : {}),
          },
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch ${chartKey} data:`, err);
    } finally {
      setChartLoading((prev) => ({ ...prev, [chartKey]: false }));
    }
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
            adminApi.getAdminGraphData({ range: '12m' }),
            adminApi.getAdminTokenUsageStats({ range: '12m' }),
          ]);
          setStats(statsData);
          distributeChartData(graphResult, tokenResult);
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
        case 'blogs': {
          const blogsData = await adminApi.getAdminBlogs(params);
          setBlogs(blogsData);
          break;
        }
        case 'ads': {
          const adsData = await adminApi.getAdminAds(params);
          setAdsList(adsData);
          break;
        }
        case 'help-videos': {
          const helpData = await adminApi.getAdminHelpVideos(params);
          setHelpVideos(helpData);
          break;
        }
        case 'landing-videos': {
          const landingData = await adminApi.getAdminLandingVideos();
          setLandingVideos(landingData);
          break;
        }
        case 'referrals': {
          const referralData = await adminApi.getAdminReferralStats(params);
          setReferrals(referralData);
          break;
        }
        case 'promo-codes': {
          const promoData = await adminApi.getAdminPromoCodes(params);
          setPromoCodes(promoData);
          break;
        }
        case 'tokens': {
          const tokenData = await adminApi.getAdminTokenUsage(params);
          setTokenUsage(tokenData);
          break;
        }
        case 'model-tokens': {
          const modelStats = await adminApi.getAdminTokenUsageStats({ range: '12m' });
          setChartData((prev) => ({
            ...prev,
            per_model_over_time: { data: modelStats.per_model_over_time || [], granularity: modelStats.token_granularity || 'day' },
          }));
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


  function renderTabPagination(data, totalPages) {
    if (!data) return null;
    const hasNext = !!data.next;
    const hasPrev = !!data.previous;
    if (!hasNext && !hasPrev) return null;
    return (
      <div className="admin-tab-pagination">
        <span className="admin-tab-pagination__info">Page {page} of {totalPages}</span>
        <div className="admin-tab-pagination__buttons">
          <button className="btn btn-outline btn-sm admin-tab-pagination__btn" disabled={!hasPrev} onClick={() => handlePageChange(page - 1)}>Previous</button>
          <button className="btn btn-outline btn-sm admin-tab-pagination__btn" disabled={!hasNext} onClick={() => handlePageChange(page + 1)}>Next</button>
        </div>
      </div>
    );
  }

  // ── Filter Bars ──────────────────────────────────────────────────

  function renderUsersFilterBar() {
    const f = filters.users;
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="admin-tab-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Role</label>
          <select className="admin-filter-select" value={f.is_staff ?? ''} onChange={(e) => handleFilterChange('users', 'is_staff', e.target.value)}>
            <option value="">All</option>
            <option value="true">Staff</option>
            <option value="false">Non-Staff</option>
          </select>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Status</label>
          <select className="admin-filter-select" value={f.is_active ?? ''} onChange={(e) => handleFilterChange('users', 'is_active', e.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Joined After</label>
          <input type="date" className="admin-filter-input" value={f.date_joined_after || ''} onChange={(e) => handleFilterChange('users', 'date_joined_after', e.target.value)} />
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Joined Before</label>
          <input type="date" className="admin-filter-input" value={f.date_joined_before || ''} onChange={(e) => handleFilterChange('users', 'date_joined_before', e.target.value)} />
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => clearFilters('users')}>Clear</button>
        )}
      </div>
    );
  }

  function renderDogFilters() {
    const f = filters.dogs;
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="admin-tab-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Sex</label>
          <select className="admin-filter-select" value={f.sex ?? ''} onChange={(e) => handleFilterChange('dogs', 'sex', e.target.value)}>
            <option value="">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="MN">Male (Neutered)</option>
            <option value="FS">Female (Spayed)</option>
          </select>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Breed</label>
          <input type="text" className="admin-filter-input" placeholder="Filter by breed..." value={f.breed || ''} onChange={(e) => handleFilterChange('dogs', 'breed', e.target.value)} />
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => clearFilters('dogs')}>Clear</button>
        )}
      </div>
    );
  }

  function renderVaccinationFilters() {
    const f = filters.vaccinations;
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="admin-tab-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Vaccine Type</label>
          <select className="admin-filter-select" value={f.vaccine_type ?? ''} onChange={(e) => handleFilterChange('vaccinations', 'vaccine_type', e.target.value)}>
            <option value="">All</option>
            <option value="core">Core</option>
            <option value="core_conditional">Core Conditional</option>
            <option value="noncore">Non-Core</option>
          </select>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Date After</label>
          <input type="date" className="admin-filter-input" value={f.date_after || ''} onChange={(e) => handleFilterChange('vaccinations', 'date_after', e.target.value)} />
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Date Before</label>
          <input type="date" className="admin-filter-input" value={f.date_before || ''} onChange={(e) => handleFilterChange('vaccinations', 'date_before', e.target.value)} />
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => clearFilters('vaccinations')}>Clear</button>
        )}
      </div>
    );
  }

  function renderContactFilters() {
    const f = filters.contacts;
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Status</label>
          <select className="admin-filter-select" value={f.is_read ?? ''} onChange={(e) => handleFilterChange('contacts', 'is_read', e.target.value)}>
            <option value="">All</option>
            <option value="false">New</option>
            <option value="true">Replied</option>
          </select>
        </div>
        {Object.keys(f).length > 0 && (
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => clearFilters('contacts')}>Clear</button>
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
            <div className="admin-stat-card__icon">
              <img src="/Images/generic_icons/profile-2user.svg" alt="" />
            </div>
            <div className="admin-stat-card__number">{stats.total_users}</div>
            <div className="admin-stat-card__label">Total Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon">
              <img src="/Images/generic_icons/dog-icon.svg" alt="" />
            </div>
            <div className="admin-stat-card__number">{stats.total_dogs}</div>
            <div className="admin-stat-card__label">Total Dogs</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon">
              <img src="/Images/generic_icons/syringe_icon.svg" alt="" />
            </div>
            <div className="admin-stat-card__number">{stats.total_vaccinations}</div>
            <div className="admin-stat-card__label">Total Vaccinations</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon">
              <img src="/Images/generic_icons/note-icon.svg" alt="" />
            </div>
            <div className="admin-stat-card__number">{stats.total_contacts}</div>
            <div className="admin-stat-card__label">Contact Submissions</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon">
              <img src="/Images/generic_icons/flash-circle.svg" alt="" />
            </div>
            <div className="admin-stat-card__number">{stats.total_ai_tokens ? stats.total_ai_tokens.toLocaleString() : '0'}</div>
            <div className="admin-stat-card__label">AI Token Used</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__icon">
              <img src="/Images/generic_icons/bot-icon.svg" alt="" />
            </div>
            <div className="admin-stat-card__number">{stats.total_ai_calls || 0}</div>
            <div className="admin-stat-card__label">AI Calls Made</div>
          </div>
        </div>

        <h3 className="admin-section__title">Charts</h3>
        <div className="admin-charts-grid">
          <ChartCard chartKey="user_registrations" showGranularity showNavigation onFilterChange={handleChartFilterChange} loading={chartLoading.user_registrations}>
            <UserRegistrationsChart data={chartData.user_registrations?.data} granularity={chartData.user_registrations?.granularity} />
          </ChartCard>

          <ChartCard chartKey="vaccinations_over_time" showGranularity showNavigation onFilterChange={handleChartFilterChange} loading={chartLoading.vaccinations_over_time}>
            <VaccinationsOverTimeChart data={chartData.vaccinations_over_time?.data} granularity={chartData.vaccinations_over_time?.granularity} />
          </ChartCard>

          <ChartCard chartKey="age_distribution" onFilterChange={handleChartFilterChange} loading={chartLoading.age_distribution}>
            <DogAgeDistributionChart data={chartData.age_distribution?.data} />
          </ChartCard>

          <ChartCard chartKey="vaccine_type_distribution" showNavigation onFilterChange={handleChartFilterChange} loading={chartLoading.vaccine_type_distribution}>
            <VaccineTypeChart data={chartData.vaccine_type_distribution?.data} />
          </ChartCard>

          <ChartCard chartKey="top_breeds" onFilterChange={handleChartFilterChange} loading={chartLoading.top_breeds}>
            <TopBreedsChart data={chartData.top_breeds?.data} />
          </ChartCard>
        </div>

        <h3 className="admin-section__title">AI Token Usage Analytics</h3>
        <div className="admin-charts-grid">
          <ChartCard chartKey="token_over_time" showGranularity showNavigation onFilterChange={handleChartFilterChange} loading={chartLoading.token_over_time}>
            <TokenUsageOverTimeChart data={chartData.token_over_time?.data} granularity={chartData.token_over_time?.granularity} />
          </ChartCard>

          <ChartCard chartKey="token_per_user" showNavigation onFilterChange={handleChartFilterChange} loading={chartLoading.token_per_user}>
            <TokenUsageByUserChart data={chartData.token_per_user?.data} />
          </ChartCard>
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
    const totalCount = users?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        {/* Header */}
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Total Users</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'User' : 'Users'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Keep the track of all the users</p>
          </div>
          <button className="admin-tab-card__export-btn" onClick={handleExportCSV}>
            <img src="/Images/generic_icons/export-icon.svg" alt="" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        {renderUsersFilterBar()}

        {/* Table */}
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
                    <SortableHeader label="Token Used" field="total_tokens_used" currentOrdering={ordering} onSort={handleSort} />
                    <th>Staff</th>
                    <th>Status</th>
                    <SortableHeader label="Joined" field="date_joined" currentOrdering={ordering} onSort={handleSort} />
                    <th></th>
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
                        <td>{(user.total_tokens_used || 0).toLocaleString()}/{user.ai_call_count || 0} Calls</td>
                        <td>{user.is_staff ? 'Yes' : 'No'}</td>
                        <td>
                          <span className={`admin-badge ${user.is_active ? 'admin-badge--active' : 'admin-badge--blocked'}`}>
                            {user.is_active ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                        <td className="admin-kebab-cell">
                          <button
                            className="admin-kebab-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenKebabUserId(openKebabUserId === user.id ? null : user.id);
                            }}
                            aria-label="User actions"
                          >
                            &#8942;
                          </button>
                          {openKebabUserId === user.id && (
                            <div className="admin-kebab-menu" ref={kebabMenuRef}>
                              <button
                                className="admin-kebab-menu__item"
                                onClick={() => {
                                  setOpenKebabUserId(null);
                                  handleToggleUserActive(user.id, user.email, user.is_active);
                                }}
                              >
                                {user.is_active ? 'Block' : 'Unblock'}
                              </button>
                              <button
                                className={`admin-kebab-menu__item admin-kebab-menu__item--danger`}
                                onClick={() => {
                                  if (user.is_active) return;
                                  setOpenKebabUserId(null);
                                  handleDeleteUser(user.id, user.email);
                                }}
                                disabled={user.is_active}
                                title={user.is_active ? 'Block user before deleting' : 'Delete user'}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderTabPagination(users, totalPages)}
          </>
        )}
      </div>
    );
  }

  function renderDogs() {
    const results = dogs?.results || [];
    const totalCount = dogs?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        {/* Header */}
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Total Dogs</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Dog' : 'Dogs'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Manage all registered dogs</p>
          </div>
        </div>

        {/* Filters */}
        {renderDogFilters()}

        {/* Table */}
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
                    <th></th>
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
                        <td className="admin-kebab-cell">
                          <button
                            className="admin-kebab-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenKebabDogId(openKebabDogId === dog.id ? null : dog.id);
                            }}
                            aria-label="Dog actions"
                          >
                            &#8942;
                          </button>
                          {openKebabDogId === dog.id && (
                            <div className="admin-kebab-menu" ref={kebabMenuRef}>
                              <button
                                className="admin-kebab-menu__item admin-kebab-menu__item--danger"
                                onClick={() => {
                                  setOpenKebabDogId(null);
                                  handleDeleteDog(dog.id, dog.name);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderTabPagination(dogs, totalPages)}
          </>
        )}
      </div>
    );
  }

  function renderVaccinations() {
    const results = vaccinations?.results || [];
    const totalCount = vaccinations?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        {/* Header */}
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Vaccination Records</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Track all vaccination records</p>
          </div>
        </div>

        {/* Filters */}
        {renderVaccinationFilters()}

        {/* Table */}
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
            {renderTabPagination(vaccinations, totalPages)}
          </>
        )}
      </div>
    );
  }

  function renderContacts() {
    const results = contacts?.results || [];
    const totalCount = contacts?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        {/* Header */}
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Contact Submissions</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Submission' : 'Submissions'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Manage contact form submissions</p>
          </div>
        </div>

        {/* Filters */}
        {renderContactFilters()}

        {/* Table */}
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
            {renderTabPagination(contacts, totalPages)}
          </>
        )}
      </div>
    );
  }

  function renderTokenUsage() {
    const results = tokenUsage?.results || [];
    const totalCount = tokenUsage?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        {/* Header */}
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Token Usage</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Monitor AI token consumption</p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-tab-filter-bar">
          <div className="admin-tab-filter-group">
            <label className="admin-tab-filter-label">Search</label>
            <div className="admin-tab-search-wrapper">
              <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="admin-tab-search-input"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
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
            {renderTabPagination(tokenUsage, totalPages)}
          </>
        )}
      </div>
    );
  }

  // ── Model Tokens ─────────────────────────────────────────────────
  function renderModelTokens() {
    const mtData = chartData.per_model_over_time;
    return (
      <div>
        {loading ? (
          <LoadingSpinner />
        ) : mtData && mtData.data && mtData.data.length > 0 ? (
          <ChartCard chartKey="per_model_over_time" showGranularity showNavigation onFilterChange={handleChartFilterChange} loading={chartLoading.per_model_over_time}>
            <div className="admin-charts-grid">
              <TokensByModelChart data={mtData.data} granularity={mtData.granularity} />
            </div>
          </ChartCard>
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
      // Build conversation history - only send the last 4 text-only pairs
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

    // Number visualization - single aggregate value
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

  // ── Blog Handlers & Renderers ──────────────────────────────────

  async function handleDeleteBlog(id, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await adminApi.deleteAdminBlog(id);
      fetchTabData('blogs', search, page, filters.blogs || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete blog post.');
    }
  }

  async function handleEditBlog(id) {
    try {
      const post = await adminApi.getAdminBlog(id);
      setBlogFormData({
        id: post.id,
        title: post.title,
        author_display_name: post.author_display_name || '',
        excerpt: post.excerpt || '',
        content: post.content || '',
        status: post.status,
        featured_image: null,
        existing_image_url: post.featured_image_url,
      });
      setBlogFormOpen(true);
    } catch {
      alert('Failed to load blog post.');
    }
  }

  function handleNewBlog() {
    setBlogFormData({
      title: '',
      author_display_name: user?.username || '',
      excerpt: '',
      content: '',
      status: 'draft',
      featured_image: null,
      existing_image_url: null,
    });
    setBlogFormOpen(true);
  }

  async function handleBlogFormSubmit(e) {
    e.preventDefault();
    setBlogFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', blogFormData.title);
      formData.append('author_display_name', blogFormData.author_display_name);
      formData.append('excerpt', blogFormData.excerpt);
      formData.append('content', blogFormData.content);
      formData.append('status', blogFormData.status);
      if (blogFormData.featured_image instanceof File) {
        formData.append('featured_image', blogFormData.featured_image);
      }

      if (blogFormData.id) {
        await adminApi.updateAdminBlog(blogFormData.id, formData);
      } else {
        await adminApi.createAdminBlog(formData);
      }
      setBlogFormOpen(false);
      setBlogFormData(null);
      fetchTabData('blogs', search, 1, filters.blogs || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save blog post.');
    } finally {
      setBlogFormLoading(false);
    }
  }

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        [{ align: [] }],
        ['clean'],
      ],
      handlers: {
        image: function () {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          input.onchange = async () => {
            const file = input.files[0];
            if (file) {
              if (!validateFileSize(file, MAX_IMAGE_SIZE)) return;
              try {
                const result = await adminApi.uploadBlogMedia(file);
                const quill = this.quill;
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', result.url);
              } catch {
                alert('Failed to upload image.');
              }
            }
          };
        },
        video: function () {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'video/*,audio/*');
          input.click();
          input.onchange = async () => {
            const file = input.files[0];
            if (file) {
              if (!validateFileSize(file, MAX_VIDEO_SIZE)) return;
              try {
                const result = await adminApi.uploadBlogMedia(file);
                const quill = this.quill;
                const range = quill.getSelection(true);
                if (file.type.startsWith('audio/')) {
                  quill.clipboard.dangerouslyPasteHTML(
                    range.index,
                    `<audio controls src="${result.url}"></audio>`
                  );
                } else {
                  quill.insertEmbed(range.index, 'video', result.url);
                }
              } catch {
                alert('Failed to upload media.');
              }
            }
          };
        },
      },
    },
  }), []);

  function renderBlogFilterBar() {
    const f = filters.blogs || {};
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="admin-tab-search-input"
              type="text"
              placeholder="Search blogs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Status</label>
          <select
            className="admin-filter-select"
            value={f.status || ''}
            onChange={(e) => handleFilterChange('blogs', 'status', e.target.value)}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        {Object.keys(f).length > 0 && (
          <button className="admin-tab-filter-clear" onClick={() => clearFilters('blogs')}>
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  function renderBlogForm() {
    const fd = blogFormData || { title: '', author_display_name: '', excerpt: '', content: '', status: 'draft', featured_image: null, existing_image_url: null };
    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <button className="btn btn-outline btn-sm" onClick={() => { setBlogFormOpen(false); setBlogFormData(null); }}>
              &larr; Back to List
            </button>
            <h2 className="admin-tab-card__title" style={{ marginLeft: '1rem' }}>
              {fd.id ? 'Edit Post' : 'New Post'}
            </h2>
          </div>
        </div>

        <form className="blog-form" onSubmit={handleBlogFormSubmit}>
          <div className="blog-form__field">
            <label className="blog-form__label">Title</label>
            <input
              className="blog-form__input"
              type="text"
              value={fd.title}
              onChange={(e) => setBlogFormData({ ...fd, title: e.target.value })}
              required
              placeholder="Enter blog post title..."
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Author Name</label>
            <input
              className="blog-form__input"
              type="text"
              value={fd.author_display_name}
              onChange={(e) => setBlogFormData({ ...fd, author_display_name: e.target.value })}
              placeholder="Display name for the author"
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Excerpt</label>
            <textarea
              className="blog-form__textarea"
              value={fd.excerpt}
              onChange={(e) => setBlogFormData({ ...fd, excerpt: e.target.value })}
              placeholder="Short summary for listing cards..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Featured Image</label>
            <input
              className="blog-form__input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                if (file && !validateFileSize(file, MAX_IMAGE_SIZE)) { e.target.value = ''; return; }
                setBlogFormData({ ...fd, featured_image: file });
              }}
            />
            {(fd.featured_image || fd.existing_image_url) && (
              <img
                className="blog-form__image-preview"
                src={fd.featured_image instanceof File ? URL.createObjectURL(fd.featured_image) : fd.existing_image_url}
                alt="Preview"
              />
            )}
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Status</label>
            <select
              className="blog-form__select"
              value={fd.status}
              onChange={(e) => setBlogFormData({ ...fd, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Content</label>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={fd.content}
              onChange={(value) => setBlogFormData((prev) => ({ ...prev, content: value }))}
              modules={quillModules}
              placeholder="Write your blog post content..."
            />
          </div>

          <div className="blog-form__actions">
            <button type="button" className="btn btn-outline" onClick={() => { setBlogFormOpen(false); setBlogFormData(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={blogFormLoading || !fd.title.trim()}>
              {blogFormLoading ? 'Saving...' : (fd.id ? 'Update Post' : 'Create Post')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderBlogs() {
    if (blogFormOpen) return renderBlogForm();

    const results = blogs?.results || [];
    const totalCount = blogs?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Blog Posts</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Post' : 'Posts'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Manage blog content</p>
          </div>
          <button className="btn btn-primary" onClick={handleNewBlog}>
            + New Post
          </button>
        </div>

        {renderBlogFilterBar()}

        {loading ? <LoadingSpinner /> : (
          <>
            <div className="admin-table-container admin-table-container--blogs">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="Title" field="title" currentOrdering={ordering} onSort={handleSort} />
                    <th>Status</th>
                    <th>Author</th>
                    <SortableHeader label="Published" field="published_at" currentOrdering={ordering} onSort={handleSort} />
                    <SortableHeader label="Created" field="created_at" currentOrdering={ordering} onSort={handleSort} />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="6" className="admin-table__empty">No blog posts found.</td></tr>
                  ) : results.map((post) => (
                    <tr key={post.id}>
                      <td className="admin-table__title-cell">{post.title}</td>
                      <td>
                        <span className={`admin-badge ${post.status === 'published' ? 'admin-badge--active' : 'admin-badge--draft'}`}>
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>{post.author_email}</td>
                      <td>{post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}</td>
                      <td>{new Date(post.created_at).toLocaleDateString()}</td>
                      <td className="admin-kebab-cell">
                          <button
                            className="admin-kebab-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenKebabBlogId(openKebabBlogId === post.id ? null : post.id);
                            }}
                            aria-label="Blog actions"
                          >
                            &#8942;
                          </button>
                          {openKebabBlogId === post.id && (
                            <div className="admin-kebab-menu" ref={kebabMenuRef}>
                              <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabBlogId(null); handleEditBlog(post.id); }}>
                                Edit
                              </button>
                              <button className="admin-kebab-menu__item admin-kebab-menu__item--danger" onClick={() => { setOpenKebabBlogId(null); handleDeleteBlog(post.id, post.title); }}>
                                Delete
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderTabPagination(blogs, totalPages)}
          </>
        )}
      </div>
    );
  }

  // ── Ad Handlers & Renderers ─────────────────────────────────────

  // ── Help Video Handlers & Renderers ───────────────────────────────

  async function handleDeleteHelpVideo(id, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await adminApi.deleteAdminHelpVideo(id);
      fetchTabData('help-videos', search, page, filters['help-videos'] || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete help video.');
    }
  }

  async function handleEditHelpVideo(id) {
    try {
      const video = await adminApi.getAdminHelpVideo(id);
      setHelpVideoFormData({
        id: video.id,
        title: video.title,
        description: video.description || '',
        video_url: video.video_url || '',
        video_file: null,
        existing_video_file_url: video.video_file_url,
        thumbnail: null,
        existing_thumbnail_url: video.thumbnail_url,
        status: video.status,
        ordering: video.ordering ?? 0,
      });
      setHelpVideoFormOpen(true);
    } catch {
      alert('Failed to load help video.');
    }
  }

  function handleNewHelpVideo() {
    setHelpVideoFormData({
      title: '',
      description: '',
      video_url: '',
      video_file: null,
      existing_video_file_url: null,
      thumbnail: null,
      existing_thumbnail_url: null,
      status: 'draft',
      ordering: 0,
    });
    setHelpVideoFormOpen(true);
  }

  async function handleHelpVideoFormSubmit(e) {
    e.preventDefault();
    setHelpVideoFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', helpVideoFormData.title);
      formData.append('description', helpVideoFormData.description);
      formData.append('video_url', helpVideoFormData.video_url);
      formData.append('status', helpVideoFormData.status);
      formData.append('ordering', helpVideoFormData.ordering);
      if (helpVideoFormData.video_file instanceof File) {
        formData.append('video_file', helpVideoFormData.video_file);
      }
      if (helpVideoFormData.thumbnail instanceof File) {
        formData.append('thumbnail', helpVideoFormData.thumbnail);
      }

      if (helpVideoFormData.id) {
        await adminApi.updateAdminHelpVideo(helpVideoFormData.id, formData);
      } else {
        await adminApi.createAdminHelpVideo(formData);
      }
      setHelpVideoFormOpen(false);
      setHelpVideoFormData(null);
      fetchTabData('help-videos', search, 1, filters['help-videos'] || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save help video.');
    } finally {
      setHelpVideoFormLoading(false);
    }
  }

  function renderHelpVideoFilterBar() {
    const f = filters['help-videos'] || {};
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="admin-tab-search-input"
              type="text"
              placeholder="Search help videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Status</label>
          <select
            className="admin-filter-select"
            value={f.status || ''}
            onChange={(e) => handleFilterChange('help-videos', 'status', e.target.value)}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        {Object.keys(f).length > 0 && (
          <button className="admin-tab-filter-clear" onClick={() => clearFilters('help-videos')}>
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  function renderHelpVideoForm() {
    const fd = helpVideoFormData || { title: '', description: '', video_url: '', video_file: null, existing_video_file_url: null, thumbnail: null, existing_thumbnail_url: null, status: 'draft', ordering: 0 };
    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <button className="btn btn-outline btn-sm" onClick={() => { setHelpVideoFormOpen(false); setHelpVideoFormData(null); }}>
              &larr; Back to List
            </button>
            <h2 className="admin-tab-card__title" style={{ marginLeft: '1rem' }}>
              {fd.id ? 'Edit Help Video' : 'New Help Video'}
            </h2>
          </div>
        </div>

        <form className="blog-form" onSubmit={handleHelpVideoFormSubmit}>
          <div className="blog-form__field">
            <label className="blog-form__label">Title</label>
            <input
              className="blog-form__input"
              type="text"
              value={fd.title}
              onChange={(e) => setHelpVideoFormData({ ...fd, title: e.target.value })}
              required
              placeholder="Enter video title..."
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Description</label>
            <textarea
              className="blog-form__textarea"
              value={fd.description}
              onChange={(e) => setHelpVideoFormData({ ...fd, description: e.target.value })}
              placeholder="Short summary for listing cards..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Video File</label>
            <input
              className="blog-form__input"
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                if (file && !validateFileSize(file, MAX_VIDEO_SIZE)) { e.target.value = ''; return; }
                setHelpVideoFormData({ ...fd, video_file: file });
              }}
            />
            {fd.existing_video_file_url && !fd.video_file && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Current video file uploaded. Upload a new file to replace it.</p>
            )}
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Video URL (YouTube or external)</label>
            <input
              className="blog-form__input"
              type="url"
              value={fd.video_url}
              onChange={(e) => setHelpVideoFormData({ ...fd, video_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Thumbnail</label>
            <input
              className="blog-form__input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                if (file && !validateFileSize(file, MAX_IMAGE_SIZE)) { e.target.value = ''; return; }
                setHelpVideoFormData({ ...fd, thumbnail: file });
              }}
            />
            {(fd.thumbnail || fd.existing_thumbnail_url) && (
              <img
                className="blog-form__image-preview"
                src={fd.thumbnail instanceof File ? URL.createObjectURL(fd.thumbnail) : fd.existing_thumbnail_url}
                alt="Thumbnail preview"
              />
            )}
          </div>

          <div className="blog-form__row">
            <div className="blog-form__field" style={{ flex: 1 }}>
              <label className="blog-form__label">Status</label>
              <select
                className="blog-form__select"
                value={fd.status}
                onChange={(e) => setHelpVideoFormData({ ...fd, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="blog-form__field" style={{ flex: 1 }}>
              <label className="blog-form__label">Display Order</label>
              <input
                className="blog-form__input"
                type="number"
                min="0"
                value={fd.ordering}
                onChange={(e) => setHelpVideoFormData({ ...fd, ordering: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <div className="blog-form__actions">
            <button type="button" className="btn btn-outline" onClick={() => { setHelpVideoFormOpen(false); setHelpVideoFormData(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={helpVideoFormLoading || !fd.title.trim()}>
              {helpVideoFormLoading ? 'Saving...' : (fd.id ? 'Update Video' : 'Create Video')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderHelpVideos() {
    if (helpVideoFormOpen) return renderHelpVideoForm();

    const results = helpVideos?.results || [];
    const totalCount = helpVideos?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Help Videos</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Video' : 'Videos'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Manage tutorial videos</p>
          </div>
          <button className="btn btn-primary" onClick={handleNewHelpVideo}>
            + New Video
          </button>
        </div>

        {renderHelpVideoFilterBar()}

        {loading ? <LoadingSpinner /> : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="Title" field="title" currentOrdering={ordering} onSort={handleSort} />
                    <th>Status</th>
                    <th>Source</th>
                    <th>Order</th>
                    <SortableHeader label="Published" field="published_at" currentOrdering={ordering} onSort={handleSort} />
                    <SortableHeader label="Created" field="created_at" currentOrdering={ordering} onSort={handleSort} />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="7" className="admin-table__empty">No help videos found.</td></tr>
                  ) : results.map((video) => (
                    <tr key={video.id}>
                      <td className="admin-table__title-cell">{video.title}</td>
                      <td>
                        <span className={`admin-badge ${video.status === 'published' ? 'admin-badge--active' : 'admin-badge--draft'}`}>
                          {video.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>{video.has_video_file ? 'File' : ''}{video.has_video_file && video.video_url ? ' + ' : ''}{video.video_url ? 'URL' : ''}{!video.has_video_file && !video.video_url ? '-' : ''}</td>
                      <td>{video.ordering}</td>
                      <td>{video.published_at ? new Date(video.published_at).toLocaleDateString() : '-'}</td>
                      <td>{new Date(video.created_at).toLocaleDateString()}</td>
                      <td className="admin-kebab-cell">
                          <button
                            className="admin-kebab-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenKebabHelpVideoId(openKebabHelpVideoId === video.id ? null : video.id);
                            }}
                            aria-label="Help video actions"
                          >
                            &#8942;
                          </button>
                          {openKebabHelpVideoId === video.id && (
                            <div className="admin-kebab-menu" ref={kebabMenuRef}>
                              <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabHelpVideoId(null); handleEditHelpVideo(video.id); }}>
                                Edit
                              </button>
                              <button className="admin-kebab-menu__item admin-kebab-menu__item--danger" onClick={() => { setOpenKebabHelpVideoId(null); handleDeleteHelpVideo(video.id, video.title); }}>
                                Delete
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderTabPagination(helpVideos, totalPages)}
          </>
        )}
      </div>
    );
  }

  // ── Landing Page Video Handlers ─────────────────────────────────

  async function handleDeleteLandingVideo(id, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await adminApi.deleteAdminLandingVideo(id);
      fetchTabData('landing-videos', search, page, {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete landing video.');
    }
  }

  async function handleEditLandingVideo(id) {
    try {
      const video = await adminApi.getAdminLandingVideo(id);
      setLandingVideoFormData({
        id: video.id,
        title: video.title,
        page_type: video.page_type,
        video_file: null,
        existing_video_file: video.video_file,
        is_active: video.is_active,
      });
      setLandingVideoFormOpen(true);
    } catch {
      alert('Failed to load landing video.');
    }
  }

  function handleNewLandingVideo() {
    setLandingVideoFormData({
      title: '',
      page_type: 'b2c',
      video_file: null,
      existing_video_file: null,
      is_active: true,
    });
    setLandingVideoFormOpen(true);
  }

  async function handleLandingVideoFormSubmit(e) {
    e.preventDefault();
    setLandingVideoFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', landingVideoFormData.title);
      formData.append('page_type', landingVideoFormData.page_type);
      formData.append('is_active', landingVideoFormData.is_active);
      if (landingVideoFormData.video_file instanceof File) {
        if (!validateFileSize(landingVideoFormData.video_file, MAX_VIDEO_SIZE)) return;
        formData.append('video_file', landingVideoFormData.video_file);
      }

      if (landingVideoFormData.id) {
        await adminApi.updateAdminLandingVideo(landingVideoFormData.id, formData);
      } else {
        await adminApi.createAdminLandingVideo(formData);
      }
      setLandingVideoFormOpen(false);
      setLandingVideoFormData(null);
      fetchTabData('landing-videos', search, 1, {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save landing video.');
    } finally {
      setLandingVideoFormLoading(false);
    }
  }

  function renderLandingVideoForm() {
    const fd = landingVideoFormData || { title: '', page_type: 'b2c', video_file: null, existing_video_file: null, is_active: true };
    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <button className="btn btn-outline btn-sm" onClick={() => { setLandingVideoFormOpen(false); setLandingVideoFormData(null); }}>
              &larr; Back to List
            </button>
            <h2 className="admin-tab-card__title" style={{ marginLeft: '1rem' }}>
              {fd.id ? 'Edit Landing Video' : 'New Landing Video'}
            </h2>
          </div>
        </div>

        <form className="blog-form" onSubmit={handleLandingVideoFormSubmit}>
          <div className="blog-form__field">
            <label className="blog-form__label">Title</label>
            <input
              className="blog-form__input"
              type="text"
              value={fd.title}
              onChange={(e) => setLandingVideoFormData({ ...fd, title: e.target.value })}
              required
              placeholder="e.g. Homepage Demo Video"
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Landing Page</label>
            <select
              className="blog-form__select"
              value={fd.page_type}
              onChange={(e) => setLandingVideoFormData({ ...fd, page_type: e.target.value })}
            >
              <option value="b2c">B2C (Pet Owners)</option>
              <option value="b2b">B2B (Clinics)</option>
            </select>
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Video File</label>
            <input
              className="blog-form__input"
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                if (file && !validateFileSize(file, MAX_VIDEO_SIZE)) { e.target.value = ''; return; }
                setLandingVideoFormData({ ...fd, video_file: file });
              }}
            />
            {fd.existing_video_file && !fd.video_file && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Current video uploaded. Upload a new file to replace it.</p>
            )}
            {!fd.id && !fd.video_file && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Upload an MP4, WebM, or Ogg video (max 100 MB). This will be shown on the landing pages.</p>
            )}
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={fd.is_active}
                onChange={(e) => setLandingVideoFormData({ ...fd, is_active: e.target.checked })}
              />
              Active (shown on landing pages as demo video)
            </label>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Only one video can be active per page type. Activating this will deactivate other videos for the same page.</p>
          </div>

          <div className="blog-form__actions">
            <button type="button" className="btn btn-outline" onClick={() => { setLandingVideoFormOpen(false); setLandingVideoFormData(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={landingVideoFormLoading || !fd.title.trim() || (!fd.id && !fd.video_file)}>
              {landingVideoFormLoading ? 'Saving...' : (fd.id ? 'Update Video' : 'Upload Video')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderLandingVideos() {
    if (landingVideoFormOpen) return renderLandingVideoForm();

    const results = landingVideos?.results || [];
    const totalCount = landingVideos?.count || 0;

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Landing Page Videos</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Video' : 'Videos'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Demo videos for B2B and B2C landing pages. One active video per page type.</p>
          </div>
          <button className="btn btn-primary" onClick={handleNewLandingVideo}>
            + Upload Video
          </button>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="admin-table-container" style={{ overflow: 'visible' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Page</th>
                  <th>Status</th>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan="6" className="admin-table__empty">No landing videos uploaded yet.</td></tr>
                ) : results.map((video) => (
                  <tr key={video.id}>
                    <td className="admin-table__title-cell">{video.title}</td>
                    <td>
                      <span className="admin-badge" style={{ background: video.page_type === 'b2b' ? '#006D9C' : '#2AB57F', color: '#fff' }}>
                        {video.page_type === 'b2b' ? 'B2B' : 'B2C'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${video.is_active ? 'admin-badge--active' : 'admin-badge--draft'}`}>
                        {video.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {video.video_file ? video.video_file.split('/').pop() : '-'}
                    </td>
                    <td>{new Date(video.uploaded_at).toLocaleDateString()}</td>
                    <td className="admin-kebab-cell">
                      <button
                        className="admin-kebab-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKebabLandingVideoId(openKebabLandingVideoId === video.id ? null : video.id);
                        }}
                        aria-label="Landing video actions"
                      >
                        &#8942;
                      </button>
                      {openKebabLandingVideoId === video.id && (
                        <div className="admin-kebab-menu" ref={kebabMenuRef}>
                          <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabLandingVideoId(null); handleEditLandingVideo(video.id); }}>
                            Edit
                          </button>
                          <button className="admin-kebab-menu__item admin-kebab-menu__item--danger" onClick={() => { setOpenKebabLandingVideoId(null); handleDeleteLandingVideo(video.id, video.title); }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Promo Code Handlers ──────────────────────────────────────────

  function handleNewPromo() {
    setPromoFormData({
      code: '',
      duration_days: 30,
      max_uses: '',
      is_active: true,
      expires_at: '',
    });
    setPromoFormOpen(true);
  }

  async function handleEditPromo(id) {
    try {
      const promo = await adminApi.getAdminPromoCode(id);
      setPromoFormData({
        id: promo.id,
        code: promo.code,
        duration_days: promo.duration_days,
        max_uses: promo.max_uses ?? '',
        is_active: promo.is_active,
        expires_at: promo.expires_at ? promo.expires_at.slice(0, 16) : '',
      });
      setPromoFormOpen(true);
    } catch {
      alert('Failed to load promo code.');
    }
  }

  async function handleDeletePromo(id, code) {
    if (!window.confirm(`Are you sure you want to delete promo code "${code}"?`)) return;
    try {
      await adminApi.deleteAdminPromoCode(id);
      fetchTabData('promo-codes', search, page, filters['promo-codes'] || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete promo code.');
    }
  }

  async function handleViewRedemptions(id) {
    try {
      const data = await adminApi.getAdminPromoCodeRedemptions(id);
      setPromoRedemptions(data);
      setPromoRedemptionsOpen(true);
    } catch {
      alert('Failed to load redemptions.');
    }
  }

  async function handlePromoFormSubmit(e) {
    e.preventDefault();
    setPromoFormLoading(true);
    try {
      const payload = {
        code: promoFormData.code,
        duration_days: parseInt(promoFormData.duration_days) || 1,
        max_uses: promoFormData.max_uses !== '' ? parseInt(promoFormData.max_uses) : null,
        is_active: promoFormData.is_active,
        expires_at: promoFormData.expires_at ? new Date(promoFormData.expires_at).toISOString() : null,
      };

      if (promoFormData.id) {
        await adminApi.updateAdminPromoCode(promoFormData.id, payload);
      } else {
        await adminApi.createAdminPromoCode(payload);
      }
      setPromoFormOpen(false);
      setPromoFormData(null);
      fetchTabData('promo-codes', search, 1, filters['promo-codes'] || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.code?.[0] || 'Failed to save promo code.');
    } finally {
      setPromoFormLoading(false);
    }
  }

  function renderPromoFilterBar() {
    const f = filters['promo-codes'] || {};
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="admin-tab-search-input"
              type="text"
              placeholder="Search promo codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Status</label>
          <select
            className="admin-filter-select"
            value={f.is_active || ''}
            onChange={(e) => handleFilterChange('promo-codes', 'is_active', e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        {Object.keys(f).length > 0 && (
          <button className="admin-tab-filter-clear" onClick={() => clearFilters('promo-codes')}>
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  function renderPromoForm() {
    const fd = promoFormData || { code: '', duration_days: 30, max_uses: '', is_active: true, expires_at: '' };
    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <button className="btn btn-outline btn-sm" onClick={() => { setPromoFormOpen(false); setPromoFormData(null); }}>
              &larr; Back to List
            </button>
            <h2 className="admin-tab-card__title" style={{ marginLeft: '1rem' }}>
              {fd.id ? 'Edit Promo Code' : 'New Promo Code'}
            </h2>
          </div>
        </div>

        <form className="blog-form" onSubmit={handlePromoFormSubmit}>
          <div className="blog-form__field">
            <label className="blog-form__label">Code</label>
            <input
              className="blog-form__input"
              type="text"
              value={fd.code}
              onChange={(e) => setPromoFormData({ ...fd, code: e.target.value.toUpperCase() })}
              required
              placeholder="e.g. FREEMONTH"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
          </div>

          <div className="blog-form__row">
            <div className="blog-form__field">
              <label className="blog-form__label">Free subscription duration (days)</label>
              <input
                className="blog-form__input"
                type="number"
                min="1"
                value={fd.duration_days}
                onChange={(e) => setPromoFormData({ ...fd, duration_days: e.target.value })}
                required
              />
            </div>

            <div className="blog-form__field">
              <label className="blog-form__label">Max uses</label>
              <input
                className="blog-form__input"
                type="number"
                min="1"
                value={fd.max_uses}
                onChange={(e) => setPromoFormData({ ...fd, max_uses: e.target.value })}
                placeholder="Leave blank for unlimited"
              />
            </div>
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Code expiration date (optional)</label>
            <input
              className="blog-form__input"
              type="datetime-local"
              value={fd.expires_at}
              onChange={(e) => setPromoFormData({ ...fd, expires_at: e.target.value })}
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__checkbox-label">
              <input
                type="checkbox"
                checked={fd.is_active}
                onChange={(e) => setPromoFormData({ ...fd, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="blog-form__actions">
            <button type="button" className="btn btn-outline" onClick={() => { setPromoFormOpen(false); setPromoFormData(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={promoFormLoading || !fd.code.trim()}>
              {promoFormLoading ? 'Saving...' : (fd.id ? 'Update Promo Code' : 'Create Promo Code')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderPromoCodes() {
    if (promoFormOpen) return renderPromoForm();

    const results = promoCodes?.results || [];
    const totalCount = promoCodes?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Promo Codes</h2>
              <span className="admin-tab-card__count-badge">
                {totalCount} {totalCount === 1 ? 'Code' : 'Codes'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Create and manage promo codes for free subscriptions</p>
          </div>
          <button className="btn btn-primary" onClick={handleNewPromo}>
            + New Promo Code
          </button>
        </div>

        {renderPromoFilterBar()}

        {loading ? <LoadingSpinner /> : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <SortableHeader label="Code" field="code" currentOrdering={ordering} onSort={handleSort} />
                  <SortableHeader label="Duration (days)" field="duration_days" currentOrdering={ordering} onSort={handleSort} />
                  <th>Max Uses</th>
                  <SortableHeader label="Times Used" field="times_used" currentOrdering={ordering} onSort={handleSort} />
                  <th>Status</th>
                  <th>Expires</th>
                  <SortableHeader label="Created" field="created_at" currentOrdering={ordering} onSort={handleSort} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan="8" className="admin-table__empty">No promo codes found.</td></tr>
                ) : results.map((promo) => (
                  <tr key={promo.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{promo.code}</td>
                    <td>{promo.duration_days}</td>
                    <td>{promo.max_uses ?? 'Unlimited'}</td>
                    <td>{promo.times_used}</td>
                    <td>
                      <span className={`admin-badge ${promo.is_active && promo.is_valid ? 'admin-badge--active' : 'admin-badge--draft'}`}>
                        {!promo.is_active ? 'Inactive' : !promo.is_valid ? 'Expired/Full' : 'Active'}
                      </span>
                    </td>
                    <td>{promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}</td>
                    <td>{new Date(promo.created_at).toLocaleDateString()}</td>
                    <td className="admin-kebab-cell">
                      <button
                        className="admin-kebab-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKebabPromoId(openKebabPromoId === promo.id ? null : promo.id);
                        }}
                        aria-label="Promo code actions"
                      >
                        &#8942;
                      </button>
                      {openKebabPromoId === promo.id && (
                        <div className="admin-kebab-menu" ref={kebabMenuRef}>
                          <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabPromoId(null); handleEditPromo(promo.id); }}>
                            Edit
                          </button>
                          <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabPromoId(null); handleViewRedemptions(promo.id); }}>
                            View Redemptions
                          </button>
                          <button className="admin-kebab-menu__item admin-kebab-menu__item--danger" onClick={() => { setOpenKebabPromoId(null); handleDeletePromo(promo.id, promo.code); }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {promoCodes && totalPages > 1 && (
              <div className="admin-tab-pagination">
                <span className="admin-tab-pagination__info">Page {page} of {totalPages}</span>
                <div className="admin-tab-pagination__buttons">
                  <button className="btn btn-outline btn-sm admin-tab-pagination__btn" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Previous</button>
                  <button className="btn btn-outline btn-sm admin-tab-pagination__btn" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Redemptions Modal */}
        <Modal isOpen={promoRedemptionsOpen} onClose={() => { setPromoRedemptionsOpen(false); setPromoRedemptions(null); }} title={`Redemptions for ${promoRedemptions?.code || ''}`}>
          {promoRedemptions && (
            <div>
              {promoRedemptions.results.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No redemptions yet.</p>
              ) : (
                <table className="admin-table" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>User Email</th>
                      <th>Username</th>
                      <th>Redeemed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoRedemptions.results.map((r) => (
                      <tr key={r.id}>
                        <td>{r.user_email}</td>
                        <td>{r.user_username}</td>
                        <td>{new Date(r.redeemed_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Modal>
      </div>
    );
  }

  async function handleViewAdAnalytics(id) {
    setAdAnalyticsLoading(true);
    try {
      const data = await adminApi.getAdminAdAnalytics(id);
      setAdAnalytics(data);
    } catch {
      alert('Failed to load ad analytics.');
    } finally {
      setAdAnalyticsLoading(false);
    }
  }

  async function handleDeleteAd(id, title) {
    if (!window.confirm(`Are you sure you want to delete ad "${title}"?`)) return;
    try {
      await adminApi.deleteAdminAd(id);
      fetchTabData('ads', search, page, filters.ads || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete advertisement.');
    }
  }

  async function handleEditAd(id) {
    try {
      const ad = await adminApi.getAdminAd(id);
      setAdFormData({
        id: ad.id,
        title: ad.title,
        link_url: ad.link_url || '',
        position: ad.position,
        is_active: ad.is_active,
        start_date: ad.start_date ? ad.start_date.slice(0, 16) : '',
        end_date: ad.end_date ? ad.end_date.slice(0, 16) : '',
        order: ad.order || 0,
        image: null,
        existing_image_url: ad.image_url,
      });
      setAdFormOpen(true);
    } catch {
      alert('Failed to load advertisement.');
    }
  }

  function handleNewAd() {
    setAdFormData({
      title: '',
      link_url: '',
      position: 'top',
      is_active: true,
      start_date: '',
      end_date: '',
      order: 0,
      image: null,
      existing_image_url: null,
    });
    setAdFormOpen(true);
  }

  async function handleAdFormSubmit(e) {
    e.preventDefault();
    setAdFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', adFormData.title);
      formData.append('link_url', adFormData.link_url);
      formData.append('position', adFormData.position);
      formData.append('is_active', adFormData.is_active);
      formData.append('order', adFormData.order);
      if (adFormData.start_date) formData.append('start_date', new Date(adFormData.start_date).toISOString());
      if (adFormData.end_date) formData.append('end_date', new Date(adFormData.end_date).toISOString());
      if (adFormData.image instanceof File) {
        formData.append('image', adFormData.image);
      }

      if (adFormData.id) {
        await adminApi.updateAdminAd(adFormData.id, formData);
      } else {
        await adminApi.createAdminAd(formData);
      }
      setAdFormOpen(false);
      setAdFormData(null);
      fetchTabData('ads', search, 1, filters.ads || {}, ordering);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save advertisement.');
    } finally {
      setAdFormLoading(false);
    }
  }

  function renderAdFilterBar() {
    const f = filters.ads || {};
    return (
      <div className="admin-tab-filter-bar">
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Search</label>
          <div className="admin-tab-search-wrapper">
            <svg className="admin-tab-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="admin-tab-search-input"
              type="text"
              placeholder="Search ads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
          </div>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Position</label>
          <select
            className="admin-filter-select"
            value={f.position || ''}
            onChange={(e) => handleFilterChange('ads', 'position', e.target.value)}
          >
            <option value="">All</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className="admin-tab-filter-group">
          <label className="admin-tab-filter-label">Status</label>
          <select
            className="admin-filter-select"
            value={f.is_active || ''}
            onChange={(e) => handleFilterChange('ads', 'is_active', e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        {Object.keys(f).length > 0 && (
          <button className="admin-tab-filter-clear" onClick={() => clearFilters('ads')}>
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  function renderAdForm() {
    const fd = adFormData || { title: '', link_url: '', position: 'top', is_active: true, start_date: '', end_date: '', order: 0, image: null, existing_image_url: null };
    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <button className="btn btn-outline btn-sm" onClick={() => { setAdFormOpen(false); setAdFormData(null); }}>
              &larr; Back to List
            </button>
            <h2 className="admin-tab-card__title" style={{ marginLeft: '1rem' }}>
              {fd.id ? 'Edit Advertisement' : 'New Advertisement'}
            </h2>
          </div>
        </div>

        <form className="blog-form" onSubmit={handleAdFormSubmit}>
          <div className="blog-form__field">
            <label className="blog-form__label">Title</label>
            <input
              className="blog-form__input"
              type="text"
              value={fd.title}
              onChange={(e) => setAdFormData({ ...fd, title: e.target.value })}
              required
              placeholder="Ad title for identification..."
            />
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Ad Image</label>
            <input
              className="blog-form__input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                if (file && !validateFileSize(file, MAX_IMAGE_SIZE)) { e.target.value = ''; return; }
                setAdFormData({ ...fd, image: file });
              }}
              required={!fd.id}
            />
            {(fd.image || fd.existing_image_url) && (
              <img
                className="blog-form__image-preview"
                src={fd.image instanceof File ? URL.createObjectURL(fd.image) : fd.existing_image_url}
                alt="Preview"
              />
            )}
          </div>

          <div className="blog-form__field">
            <label className="blog-form__label">Link URL</label>
            <input
              className="blog-form__input"
              type="url"
              value={fd.link_url}
              onChange={(e) => setAdFormData({ ...fd, link_url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="blog-form__row">
            <div className="blog-form__field">
              <label className="blog-form__label">Position</label>
              <select
                className="blog-form__select"
                value={fd.position}
                onChange={(e) => setAdFormData({ ...fd, position: e.target.value })}
              >
                <option value="top">Top Banner</option>
                <option value="bottom">Bottom Banner</option>
                <option value="left">Left Sidebar</option>
                <option value="right">Right Sidebar</option>
              </select>
            </div>

            <div className="blog-form__field">
              <label className="blog-form__label">Order</label>
              <input
                className="blog-form__input"
                type="number"
                min="0"
                value={fd.order}
                onChange={(e) => setAdFormData({ ...fd, order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="blog-form__row">
            <div className="blog-form__field">
              <label className="blog-form__label">Start Date (optional)</label>
              <input
                className="blog-form__input"
                type="datetime-local"
                value={fd.start_date}
                onChange={(e) => setAdFormData({ ...fd, start_date: e.target.value })}
              />
            </div>

            <div className="blog-form__field">
              <label className="blog-form__label">End Date (optional)</label>
              <input
                className="blog-form__input"
                type="datetime-local"
                value={fd.end_date}
                onChange={(e) => setAdFormData({ ...fd, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="blog-form__field">
            <label className="blog-form__checkbox-label">
              <input
                type="checkbox"
                checked={fd.is_active}
                onChange={(e) => setAdFormData({ ...fd, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="blog-form__actions">
            <button type="button" className="btn btn-outline" onClick={() => { setAdFormOpen(false); setAdFormData(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={adFormLoading || !fd.title.trim()}>
              {adFormLoading ? 'Saving...' : (fd.id ? 'Update Ad' : 'Create Ad')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderAdAnalytics() {
    if (!adAnalytics) return null;
    const maxCount = Math.max(...adAnalytics.daily_clicks.map((d) => d.count), 1);

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <button className="btn btn-outline btn-sm" onClick={() => setAdAnalytics(null)}>
              &larr; Back to List
            </button>
            <h2 className="admin-tab-card__title" style={{ marginLeft: '1rem' }}>
              Analytics: {adAnalytics.ad_title}
            </h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
          {[
            { label: 'Total Clicks', value: adAnalytics.total_clicks },
            { label: 'Last 7 Days', value: adAnalytics.last_7_days },
            { label: 'Last 30 Days', value: adAnalytics.last_30_days },
            { label: 'Unique Users', value: adAnalytics.unique_users },
            { label: 'Unique IPs', value: adAnalytics.unique_ips },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary, #4f46e5)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {adAnalytics.daily_clicks.length > 0 && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Clicks (Last 30 Days)</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
              {adAnalytics.daily_clicks.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count} click${d.count !== 1 ? 's' : ''}`}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    height: `${Math.max((d.count / maxCount) * 100, 4)}%`,
                    background: 'var(--color-primary, #4f46e5)',
                    borderRadius: '2px 2px 0 0',
                    cursor: 'default',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>
              <span>{adAnalytics.daily_clicks[0]?.date}</span>
              <span>{adAnalytics.daily_clicks[adAnalytics.daily_clicks.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAds() {
    if (adFormOpen) return renderAdForm();
    if (adAnalytics) return renderAdAnalytics();
    if (adAnalyticsLoading) return <LoadingSpinner />;

    const positionLabels = { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' };

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Advertisements</h2>
              <span className="admin-tab-card__count-badge">
                {adsList.length} {adsList.length === 1 ? 'Ad' : 'Ads'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Manage ad placements across the site</p>
          </div>
          <button className="btn btn-primary" onClick={handleNewAd}>
            + New Ad
          </button>
        </div>

        {renderAdFilterBar()}

        {loading ? <LoadingSpinner /> : (
          <div className="admin-table-container admin-table-container--blogs">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Clicks</th>
                  <th>Order</th>
                  <th>Date Range</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {adsList.length === 0 ? (
                  <tr><td colSpan="8" className="admin-table__empty">No advertisements found.</td></tr>
                ) : adsList.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      {ad.image_url && (
                        <img src={ad.image_url} alt={ad.title} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      )}
                    </td>
                    <td className="admin-table__title-cell">{ad.title}</td>
                    <td>{positionLabels[ad.position] || ad.position}</td>
                    <td>
                      <span className={`admin-badge ${ad.is_active ? 'admin-badge--active' : 'admin-badge--draft'}`}>
                        {ad.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleViewAdAnalytics(ad.id)}
                        title="View analytics"
                        style={{ minWidth: 48 }}
                      >
                        {ad.click_count || 0}
                      </button>
                    </td>
                    <td>{ad.order}</td>
                    <td>
                      {ad.start_date || ad.end_date ? (
                        <>
                          {ad.start_date ? new Date(ad.start_date).toLocaleDateString() : 'No start'}
                          {' - '}
                          {ad.end_date ? new Date(ad.end_date).toLocaleDateString() : 'No end'}
                        </>
                      ) : 'Always'}
                    </td>
                    <td className="admin-kebab-cell">
                      <button
                        className="admin-kebab-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKebabAdId(openKebabAdId === ad.id ? null : ad.id);
                        }}
                        aria-label="Ad actions"
                      >
                        &#8942;
                      </button>
                      {openKebabAdId === ad.id && (
                        <div className="admin-kebab-menu" ref={kebabMenuRef}>
                          <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabAdId(null); handleViewAdAnalytics(ad.id); }}>
                            Analytics
                          </button>
                          <button className="admin-kebab-menu__item" onClick={() => { setOpenKebabAdId(null); handleEditAd(ad.id); }}>
                            Edit
                          </button>
                          <button className="admin-kebab-menu__item admin-kebab-menu__item--danger" onClick={() => { setOpenKebabAdId(null); handleDeleteAd(ad.id, ad.title); }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderReferrals() {
    const results = referrals?.results || [];
    const totalReferrals = referrals?.total_referrals || 0;
    const totalCount = referrals?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return (
      <div className="admin-tab-card">
        <div className="admin-tab-card__header">
          <div className="admin-tab-card__header-left">
            <div className="admin-tab-card__title-row">
              <h2 className="admin-tab-card__title">Referrals</h2>
              <span className="admin-tab-card__count-badge">
                {totalReferrals} Total {totalReferrals === 1 ? 'Referral' : 'Referrals'}
              </span>
            </div>
            <p className="admin-tab-card__subtitle">Users who have referred others to PetVaxCalendar</p>
          </div>
        </div>

        <form className="admin-filter-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="admin-filter-bar__search"
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        {loading ? <LoadingSpinner /> : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Referral Code</th>
                  <th>Referrals</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan="5" className="admin-table__empty">No referrers found.</td></tr>
                ) : results.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{u.referral_code}</td>
                    <td>
                      <span className="admin-badge admin-badge--active">{u.referral_count}</span>
                    </td>
                    <td>{new Date(u.date_joined).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {referrals && totalPages > 1 && (
              <div className="admin-tab-pagination">
                <span className="admin-tab-pagination__info">Page {page} of {totalPages}</span>
                <div className="admin-tab-pagination__buttons">
                  <button className="btn btn-outline btn-sm admin-tab-pagination__btn" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Previous</button>
                  <button className="btn btn-outline btn-sm admin-tab-pagination__btn" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
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
    blogs: renderBlogs,
    ads: renderAds,
    'help-videos': renderHelpVideos,
    'landing-videos': renderLandingVideos,
    referrals: renderReferrals,
    'promo-codes': renderPromoCodes,
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
