const app = require('./src/app');

// VULNERABILITY #7 - Hardcoded config: port is a literal instead of coming
// from an environment variable.
const PORT = 43171;

app.listen(PORT, () => {
  console.log(`v1-inseguro listening on http://localhost:${PORT}`);
});
