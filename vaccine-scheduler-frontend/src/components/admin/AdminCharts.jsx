import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  primary: '#006D9C',
  secondary: '#2AB57F',
  accent: '#FF9C3B',
  danger: '#E53E3E',
};

const PIE_COLORS = ['#006D9C', '#2AB57F', '#FF9C3B', '#E53E3E', '#805AD5', '#DD6B20'];

function formatMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function UserRegistrationsChart({ data }) {
  if (!data || data.length === 0) return null;
  const formatted = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">User Registrations (Last 12 Months)</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2} name="Users" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VaccinationsOverTimeChart({ data }) {
  if (!data || data.length === 0) return null;
  const formatted = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Vaccinations Per Month</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill={COLORS.secondary} name="Vaccinations" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DogAgeDistributionChart({ data }) {
  if (!data || data.every((d) => d.count === 0)) return null;
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
            outerRadius={90}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VaccineTypeChart({ data }) {
  if (!data || data.length === 0) return null;
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
            cx="50%"
            cy="50%"
            outerRadius={90}
          >
            {formatted.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopBreedsChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Top Breeds</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="breed" width={120} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill={COLORS.accent} name="Dogs" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TokenUsageOverTimeChart({ data }) {
  if (!data || data.length === 0) return null;
  const formatted = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">AI Token Usage Over Time</h4>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area
            type="monotone" dataKey="total_input" stackId="1"
            stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.4} name="Input Tokens"
          />
          <Area
            type="monotone" dataKey="total_output" stackId="1"
            stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.4} name="Output Tokens"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TokensByModelChart({ data }) {
  if (!data || data.length === 0) return null;

  // Group data by model, each model gets its own time-series chart
  const modelMap = {};
  data.forEach((d) => {
    if (!modelMap[d.model_name]) modelMap[d.model_name] = [];
    modelMap[d.model_name].push({
      label: formatMonth(d.month),
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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="input_tokens"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Input Tokens"
          />
          <Line
            type="monotone"
            dataKey="output_tokens"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Output Tokens"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ));
}

export function TokenUsageByUserChart({ data }) {
  if (!data || data.length === 0) return null;
  const formatted = data.map((d) => ({
    email: d.user__email,
    total_tokens: d.total_tokens,
  }));
  return (
    <div className="admin-chart-card">
      <h4 className="admin-chart-card__title">Top Token Consumers</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="email" width={180} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="total_tokens" fill={COLORS.danger} name="Total Tokens" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
