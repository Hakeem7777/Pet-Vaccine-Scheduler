import { useState, useEffect } from 'react';
import { getAIStatus, getDogAIAnalysis } from '../../api/ai';
import LoadingSpinner from '../common/LoadingSpinner';
import './AIAnalysis.css';

function AIAnalysis({ dogId, selectedNoncore }) {
  const [status, setStatus] = useState({ available: false, initialized: false });
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const statusData = await getAIStatus();
      setStatus(statusData);
    } catch (err) {
      setStatus({ available: false, initialized: false });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAnalysis() {
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await getDogAIAnalysis(dogId, {
        includeSchedule: true,
        selectedNoncore: selectedNoncore || [],
      });
      setAnalysis(data);
    } catch (err) {
      setError('Failed to get AI analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="ai-analysis">
        <h3>AI Analysis</h3>
        <LoadingSpinner size="small" />
      </div>
    );
  }

  if (!status.available) {
    return (
      <div className="ai-analysis">
        <h3>AI Analysis</h3>
        <div className="ai-unavailable">
          <p>AI analysis is not available.</p>
          {status.error && <p className="ai-error-detail">{status.error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-analysis">
      <div className="ai-analysis-header">
        <h3>AI Analysis</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={fetchAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : analysis ? 'Refresh Analysis' : 'Get Analysis'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {isAnalyzing && (
        <div className="ai-loading">
          <LoadingSpinner size="small" />
          <p>Analyzing vaccination schedule...</p>
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="ai-analysis-content">
          <div className="ai-analysis-text">
            {analysis.analysis.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {analysis.schedule_summary && (
            <div className="ai-schedule-summary">
              <h4>Schedule Summary</h4>
              <div className="summary-stats">
                <span className="stat overdue">
                  Overdue: {analysis.schedule_summary.overdue_count}
                </span>
                <span className="stat upcoming">
                  Upcoming: {analysis.schedule_summary.upcoming_count}
                </span>
                <span className="stat future">
                  Future: {analysis.schedule_summary.future_count}
                </span>
              </div>
            </div>
          )}

          {analysis.sources && analysis.sources.length > 0 && (
            <details className="ai-sources">
              <summary>View Sources ({analysis.sources.length})</summary>
              <div className="sources-list">
                {analysis.sources.map((source, index) => (
                  <div key={index} className="source-item">
                    <strong>{source.document}</strong>
                    <blockquote>{source.excerpt}</blockquote>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default AIAnalysis;
