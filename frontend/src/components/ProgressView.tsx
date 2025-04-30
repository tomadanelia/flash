// frontend/src/components/ProgressView.tsx
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
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0' }}>
      <h2>Your Learning Progress</h2>

      {/* Section for Date Inputs */}
      <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
        <h4>Filter Recall Accuracy by Date (Optional)</h4>
        <div>
          <label htmlFor="startDate" style={{ marginRight: '10px' }}>Start Date:</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={startDate}
            onChange={handleStartDateChange}
            style={{ marginRight: '20px' }}
          />
          <label htmlFor="endDate" style={{ marginRight: '10px' }}>End Date:</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={endDate}
            onChange={handleEndDateChange}
            style={{ marginRight: '20px' }}
          />
          {/* Button now triggers specific handler */}
          <button
            onClick={handleFetchProgressClick}
            disabled={isLoading}
          >
            {isLoading ? 'Fetching...' : 'Fetch Progress'}
          </button>
        </div>
      </div>

      {/* Section for Displaying Stats */}
      <div>
        <h4>Statistics Overview</h4>

        {/* Loading Indicator */}
        {isLoading && <p>Loading progress...</p>}

        {/* Error Display */}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        {/* --- Display Stats Area --- */}
        {/* This entire block renders the statistics *from* the API response (via 'progressData' state) */}
        {!isLoading && !error && progressData && (
          <>
            {/* Display general stats directly from progressData */}
            <p><strong>Total Cards:</strong> {progressData.totalCards}</p>
            <p><strong>Cards Due Today:</strong> {progressData.cardsDueToday}</p>

            {/* Render bucket stats using helper which reads from progressData */}
            <div style={{ marginTop: '15px' }}>
              <strong>Cards per Bucket:</strong>
              {renderBucketStats()}
            </div>

            {/* Render recall accuracy using helper which reads from progressData */}
            <div style={{ marginTop: '15px' }}>
              <strong>Recall Accuracy:</strong>
              {renderRecallAccuracy(progressData.recallAccuracy)}
            </div>
          </>
        )}

        {/* Message when no data loaded yet */}
        {!isLoading && !error && !progressData && (
          <p>No progress data loaded yet. Fetching initial data...</p>
        )}
      </div>
    </div>
  );
};

// Export the component
export default ProgressView;