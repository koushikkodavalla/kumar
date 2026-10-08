require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Placement Management Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
