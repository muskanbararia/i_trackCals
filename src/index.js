const express = require('express');
const ifct2017 = require('ifct2017');
const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

(async function loadCorpus() {
    await ifct2017.compositions.load();
    console.log('IFCT2017 corpus loaded');
  })();

// Sample route: Home
app.get('/ping', (req, res) => {
  res.send('pong');
});


// Route: GET /getCals
app.get('/getCals', async (req, res) => {
    const { ingredient } = req.query; // Query parameter: ingredient name
    if (!ingredient) {
      return res.status(400).json({ error: 'Please provide an ingredient name.' });
    }
    try {
      const data = ifct2017.compositions(ingredient);
  
      if (!data.length) {
        return res.status(404).json({ error: `No composition data found for '${ingredient}'.` });
      }
  
      res.json(data);
    } catch (error) {
      console.error('Error fetching composition data:', error);
      res.status(500).json({ error: 'Failed to fetch composition data.' });
    }
  });
  
// 404 Route: Handle unknown routes
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
