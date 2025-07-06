function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏛️ CivicStream Admin Dashboard</h1>
      <p>Welcome to the CivicStream administrative interface!</p>
      <div style={{ background: '#f5f5f5', padding: '15px', marginTop: '20px' }}>
        <h2>✅ Frontend Container Running</h2>
        <p>React application is loading successfully.</p>
        <p>Backend API: <a href="http://localhost:8000" target="_blank">http://localhost:8000</a></p>
        <p>API Docs: <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a></p>
      </div>
    </div>
  );
}

export default App;