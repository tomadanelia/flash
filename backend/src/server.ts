import app from './app';
const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ [server]: Server is running and listening on port ${PORT}`);
});