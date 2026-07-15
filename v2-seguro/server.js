const app = require('./src/app');
const env = require('./src/config/env');

// Mitigation #7 (hardcoded config): port comes from process.env.PORT (see
// src/config/env.js), not a literal.
app.listen(env.PORT, () => {
  console.log(`v2-seguro listening on http://localhost:${env.PORT}`);
});
