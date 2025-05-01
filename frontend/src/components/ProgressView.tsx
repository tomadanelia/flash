// frontend/src/components/ProgressView.tsx
import './ProgressView.css';

import React, { useState, useEffect } from 'react';

// Import the API service (make sure fetchProgress exists and is correctly defined there)
import apiService from '../services/api';

// Import the types we'll need
import { ProgressStats, RecallAccuracyStats } from '../types';

// Define the functional component
const ProgressView: React.FC = () => {
  // --- State for Date Inputs ---
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- State for Progress Data ---
  const [progressData, setProgressData] = useState<ProgressStats | null>(null); // Holds the API response
  const [isLoading, setIsLoading] = useState<boolean>(false); // Start as false, true during fetch
  const [error, setError] = useState<string | null>(null);   // For error messages
  const [isVisible, setIsVisible] = useState(false);


  // --- Fetch Progress Function ---
  // Renamed fetchAndSetProgress for clarity, used by both useEffect and button handler
  const fetchAndSetProgress = async (sDate?: string, eDate?: string) => {
    setIsLoading(true);
    setError(null);
    // Consider clearing progressData here if desired behaviour is to always clear before fetch
    // setProgressData(null);

    try {
      // Prepare parameters for the API call
      const params: { startDate?: string; endDate?: string } = {};
      if (sDate) params.startDate = sDate;
      if (eDate) params.endDate = eDate;

      // Call the API service function
      const data: ProgressStats = await apiService.fetchProgress(params);
      setProgressData(data); // <-- API Response stored in state

    } catch (err: any) {
      console.error("Error fetching progress data:", err);
      setError("Failed to fetch progress statistics. Please try again.");
      setProgressData(null); // Clear data on error
    } finally {
      setIsLoading(false); // Ensure loading is set to false after fetch completes or fails
    }
  };
  const handleClick = () => {
    setIsVisible(prev => !prev);
  };
  // --- useEffect Hook for Initial Fetch ---
  // Runs once when the component mounts to get overall progress
  useEffect(() => {
    console.log("ProgressView mounted. Fetching initial overall progress...");
    fetchAndSetProgress(); // Call fetch without date parameters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures it runs only on mount

  // --- Event Handlers for Date Inputs ---
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  // --- Handler for the "Fetch Progress" Button ---
  // Fetches progress specifically for the selected date range
  const handleFetchProgressClick = () => {
    console.log("Fetching progress with dates:", startDate, endDate);
    // Basic validation: check if start date is after end date? (Optional client-side check)
    if (startDate && endDate && startDate > endDate) {
        setError("Start date cannot be after end date.");
        return;
    }
    fetchAndSetProgress(startDate || undefined, endDate || undefined); // Pass current dates
  };

  // --- Helper function to render bucket stats ---
  // This renders stats using the 'progressData' state
  const renderBucketStats = () => {
    if (!progressData || !progressData.cardsPerBucket) {
      return <p>Bucket data not available.</p>;
    }
    const buckets = Object.entries(progressData.cardsPerBucket)
      .map(([bucket, count]) => ({ bucket: parseInt(bucket, 10), count }))
      .sort((a, b) => a.bucket - b.bucket);
    if (buckets.length === 0) {
      return <p>No cards found in any buckets.</p>;
    }
    return (
      <ul style={{ listStyle: 'none', paddingLeft: '20px' }}>
        {buckets.map(({ bucket, count }) => (
          <li key={bucket}>
            Bucket {bucket}: {count} card{count !== 1 ? 's' : ''}
          </li>
        ))}
      </ul>
    );
  };

  // --- Helper function to render recall accuracy ---
  // This renders stats using the 'progressData' state
  const renderRecallAccuracy = (accuracy: RecallAccuracyStats | null) => {
    if (!accuracy) {
      return (
        <p style={{ paddingLeft: '20px', fontStyle: 'italic' }}>
          {startDate || endDate
            ? "Recall accuracy data not available for the selected period."
            : 'Select a date range and click "Fetch Progress" to view recall accuracy.'}
        </p>
      );
    }
    const percentage = accuracy.correctPercentage.toFixed(1);
    return (
      <div style={{ paddingLeft: '20px' }}>
        <p>
          <em>
            Period: {accuracy.startDate} to {accuracy.endDate}
          </em>
        </p>
        <ul>
          <li>Total Attempts: {accuracy.totalAttempts}</li>
          <li>Correct (Easy/Hard): {accuracy.correctCount}</li>
          <li>Wrong: {accuracy.wrongCount}</li>
          <li>Accuracy: {percentage}%</li>
        </ul>
      </div>
    );
  };

  // --- Render the Component UI ---
  return (
    <>
      <div style={{ marginTop: '20px' }}>
        <button onClick={handleClick} className="progress-button">
          {isVisible ? 'Hide Progress' : 'Show Progress'}
        </button>
      </div>
  
      <div className={`progress-container ${isVisible ? 'progress-visible' : 'progress-hidden'}`}>
        <h2 className="progress-heading">📊 Your Learning Progress</h2>
  
        <div className="date-filter">
          <label>
            Start Date:
            <input type="date" value={startDate} onChange={handleStartDateChange} />
          </label>
          <label>
            End Date:
            <input type="date" value={endDate} onChange={handleEndDateChange} />
          </label>
          <button onClick={handleFetchProgressClick} disabled={isLoading} className="fetch-btn">
            {isLoading ? 'Fetching...' : 'Fetch Progress'}
          </button>
        </div>
  
        {isLoading && <p className="text-blue">Loading progress...</p>}
        {error && <p className="text-red">Error: {error}</p>}
  
        {!isLoading && !error && progressData && (
          <>
            <p><strong>Total Cards:</strong> {progressData.totalCards}</p>
            <p><strong>Cards Due Today:</strong> {progressData.cardsDueToday}</p>
  
            <div>
              <strong>Cards per Bucket:</strong>
              <ul className="bucket-list">
                {Object.entries(progressData.cardsPerBucket)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([bucket, count]) => (
                    <li key={bucket} className="bucket-item">
                      <div className="bucket-label">Bucket {bucket}</div>
                      <div className="bucket-count">{count}</div>
                    </li>
                  ))}
              </ul>
            </div>
  
            <div>
              <strong>Recall Accuracy:</strong>
              {progressData.recallAccuracy ? (
                <div className="recall-box">
                  <p><em>Period: {progressData.recallAccuracy.startDate} to {progressData.recallAccuracy.endDate}</em></p>
                  <ul className="recall-stats">
                    <li><strong>Total Attempts:</strong> {progressData.recallAccuracy.totalAttempts}</li>
                    <li><strong>Correct (Easy/Hard):</strong> <span className="text-green">{progressData.recallAccuracy.correctCount}</span></li>
                    <li><strong>Wrong:</strong> <span className="text-red">{progressData.recallAccuracy.wrongCount}</span></li>
                    <li><strong>Accuracy:</strong> <span className="text-blue">{progressData.recallAccuracy.correctPercentage.toFixed(1)}%</span></li>
                  </ul>
                </div>
              ) : (
                <p><em>No accuracy data for selected range.</em></p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
  
};

// Export the component
export default ProgressView;