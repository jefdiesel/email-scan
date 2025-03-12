import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [url, setUrl] = useState('');
    const [results, setResults] = useState(null);
    const [pastCrawls, setPastCrawls] = useState([]);
    const [loading, setLoading] = useState(false);

    // Backend API base URL
    const API_BASE = 'http://localhost:3030';

    useEffect(() => {
        axios.get(`${API_BASE}/crawls`)
            .then(res => setPastCrawls(res.data))
            .catch(err => console.error('Fetch error:', err));
    }, []);

    const handleCrawl = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/crawl`, { url });
            setResults(res.data);
            const pastRes = await axios.get(`${API_BASE}/crawls`);
            setPastCrawls(pastRes.data);
        } catch (error) {
            console.error('Crawl error:', error);
            setResults({ error: 'Crawl failed' });
        }
        setLoading(false);
    };

    return (
        <div className="App">
            <h1>Email Crawler</h1>
            <form onSubmit={handleCrawl}>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL (e.g., https://example.com)"
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Crawling...' : 'Crawl'}
                </button>
            </form>

            {results && (
                <div>
                    <h2>Results</h2>
                    <h3>Emails:</h3>
                    <ul>{results.emails.map((email, i) => <li key={i}>{email}</li>)}</ul>
                    <h3>Trackers:</h3>
                    <ul>{results.trackers.map((tracker, i) => <li key={i}>{tracker}</li>)}</ul>
                    {results.error && <p>Error: {results.error}</p>}
                </div>
            )}

            <h2>Past Crawls</h2>
            <table>
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>Emails</th>
                        <th>Trackers</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {pastCrawls.map(crawl => (
                        <tr key={crawl.id}>
                            <td>{crawl.url}</td>
                            <td>{crawl.emails.join(', ')}</td>
                            <td>{crawl.trackers.join(', ')}</td>
                            <td>{new Date(crawl.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default App;
