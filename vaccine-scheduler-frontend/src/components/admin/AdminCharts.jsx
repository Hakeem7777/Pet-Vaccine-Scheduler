import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart,
} from 'recharts';

const COLORS = {
  primary: '#006D9C',
  secondary: '#2AB57F',
  accent: '#FF9C3B',
  danger: '#E53E3E',
};

const PIE_COLORS = ['#4EC89F', '#F08080', '#5B9BD5', '#F5A86C', '#805AD5', '#DD6B20'];

const RADIAN = Math.PI / 180;
function renderOuterLabel({ cx, cy, midAngle, outerRadius, name }) {
  const x = cx + (outerRadius + 22) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 22) * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#4a5568" fontSize={12} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {name}
    </text>
  );
}

const AXIS_TICK = { fill: '#8a94a6', fontSize: 12 };
const GRID_STYLE = { stroke: '#f0f0f0' };

function formatChartDate(dateStr, granularity = 'day') {
  if (!dateStr) return '';
  // TruncDate returns "YYYY-MM-DD", TruncWeek/TruncMonth return "YYYY-MM-DDT00:00:00Z"
  const raw = String(dateStr).split('T')[0];
  const d = new Date(raw + 'T00:00:00');
  if (granularity === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const GRANULARITY_LABEL = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

function formatKValue(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value;
}

function ChartEmptyState({ title }) {
  return (
    <div className="admin-chart-card admin-chart-card--empty">
      <h4 className="admin-chart-card__title">{title}</h4>
      <div className="admin-chart-card__empty-msg">No data for this period</div>
    </div>
  );
}

/* ── Filter Components ────────────────────────────────────────── */

const TIME_RANGE_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'all', label: 'All' },
];

export function ChartTimeRangeBar({ value, onChange }) {
  return (
    <div className="chart-time-range-bar">
      {TIME_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`chart-time-range-bar__btn ${value === opt.value ? 'chart-time-range-bar__btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const GRANULARITY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function GranularityToggle({ value, onChange }) {
  return (
    <div className="chart-granularity-toggle">
      {GRANULARITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`chart-granularity-toggle__btn ${value === opt.value ? 'chart-granularity-toggle__btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Chart Components ─────────────────────────────────────────── */

export function UserRegistrationsChart({ data, granularity = 'day' }) {
  if (!data || data.length === 0) return <ChartEmptyState title="User Registrations" />;
  const formatted = data.map((d) => ({ ...d, label: formatChartDate(d.date, granularity) }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">User Registrations ({GRANULARITY_LABEL[granularity]})</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted}>
          <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <Tooltip />
          <Line type="natural" dataKey="count" stroke={COLORS.primary} strokeWidth={3} name="Users" dot={false} activeDot={{ r: 5, fill: 'white', stroke: COLORS.primary, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VaccinationsOverTimeChart({ data, granularity = 'day' }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Vaccinations" />;
  const formatted = data.map((d) => ({ ...d, label: formatChartDate(d.date, granularity) }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Vaccinations ({GRANULARITY_LABEL[granularity]})</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={formatted}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6BAED6" stopOpacity={1} />
              <stop offset="100%" stopColor="#6BAED6" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} strokeDasharray="4 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <Tooltip />
          <Bar dataKey="count" fill="url(#barGradient)" name="Vaccinations" radius={[4, 4, 0, 0]} barSize={28} />
          <Line type="natural" dataKey="count" stroke="#A8D4F0" strokeWidth={2} dot={{ r: 4, fill: '#5B9BD5', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#5B9BD5', stroke: '#fff', strokeWidth: 2 }} name="Trend" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DogAgeDistributionChart({ data }) {
  if (!data || data.every((d) => d.count === 0)) return <ChartEmptyState title="Dog Age Distribution" />;
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Dog Age Distribution</h4>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="classification"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={renderOuterLabel}
            labelLine={{ stroke: '#a0aec0', strokeWidth: 1 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VaccineTypeChart({ data }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Vaccine Type Breakdown" />;
  const formatted = data.map((d) => ({
    type: d.vaccine__vaccine_type || 'unknown',
    count: d.count,
  }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Vaccine Type Breakdown</h4>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={formatted}
            dataKey="count"
            nameKey="type"
            cx="40%"
            cy="50%"
            innerRadius={55}
            outerRadius={100}
          >
            {formatted.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopBreedsChart({ data }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Top Breeds" />;
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Top Breeds</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid horizontal={false} stroke={GRID_STYLE.stroke} />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis type="category" dataKey="breed" width={120} axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill={COLORS.accent} name="Dogs" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TokenUsageOverTimeChart({ data, granularity = 'day' }) {
  if (!data || data.length === 0) return <ChartEmptyState title="AI Token Usage Over Time" />;
  const formatted = data.map((d) => ({ ...d, label: formatChartDate(d.date, granularity) }));
  return (
    <div className="admin-chart-card admin-chart-card--token-usage">
      <div className="admin-chart-card__header">
        <h4 className="admin-chart-card__title">AI Token Usage Over Time</h4>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted}>
          <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} strokeDasharray="4 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={formatKValue} />
          <Tooltip formatter={(value) => [value.toLocaleString(), undefined]} />
          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={10} wrapperStyle={{ top: -8, right: 0 }} />
          <Line
            type="natural" dataKey="total_input"
            stroke={COLORS.primary} strokeWidth={3} name="Input Tokens"
            dot={false} activeDot={{ r: 5, fill: 'white', stroke: COLORS.primary, strokeWidth: 2 }}
          />
          <Line
            type="natural" dataKey="total_output"
            stroke={COLORS.secondary} strokeWidth={3} name="Output Tokens"
            dot={false} activeDot={{ r: 5, fill: 'white', stroke: COLORS.secondary, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TokensByModelChart({ data, granularity = 'day' }) {
  if (!data || data.length === 0) return null;

  // Group data by model, each model gets its own time-series chart
  const modelMap = {};
  data.forEach((d) => {
    if (!modelMap[d.model_name]) modelMap[d.model_name] = [];
    modelMap[d.model_name].push({
      label: formatChartDate(d.date, granularity),
      input_tokens: d.input_tokens,
      output_tokens: d.output_tokens,
    });
  });
  const models = Object.keys(modelMap);

  return models.map((model, i) => (
    <div className="admin-chart-card" key={model}>
      <h4 className="admin-chart-card__title">{model}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={modelMap[model]}>
          <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <Tooltip />
          <Legend />
          <Line
            type="natural"
            dataKey="input_tokens"
            stroke={COLORS.primary}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: 'white', stroke: COLORS.primary, strokeWidth: 2 }}
            name="Input Tokens"
          />
          <Line
            type="natural"
            dataKey="output_tokens"
            stroke={COLORS.secondary}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: 'white', stroke: COLORS.secondary, strokeWidth: 2 }}
            name="Output Tokens"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ));
}

export function TokenUsageByUserChart({ data }) {
  if (!data || data.length === 0) return <ChartEmptyState title="Top Token Consumers" />;
  const formatted = data.map((d) => ({
    email: d.user__email,
    total_tokens: d.total_tokens,
  }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Top Token Consumers</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} layout="vertical">
          <CartesianGrid horizontal={false} stroke={GRID_STYLE.stroke} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis type="category" dataKey="email" width={180} axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="total_tokens" fill={COLORS.danger} name="Total Tokens" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
