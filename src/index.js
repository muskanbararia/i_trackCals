const express = require('express');
const ifct2017 = require('ifct2017');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Load the IFCT2017 corpus on server startup
(async function loadCorpus() {
  try {
    await ifct2017.compositions.load();
    console.log('IFCT2017 corpus loaded');
  } catch (error) {
    console.error('Error loading IFCT2017 corpus:', error);
  }
})();

// Load conversion data on server startup
let conversionData = {};

async function loadConversionData() {
  try {
    const fileContent = await fs.readFile('./src/conversion.json', 'utf8');
    conversionData = JSON.parse(fileContent);
    console.log('Conversion data loaded successfully.');
  } catch (error) {
    console.error('Error loading conversion.json:', error);
  }
}

loadConversionData();

// Route: GET /ping (Health Check)
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Route: GET /getCals
app.get('/getCals', async (req, res) => {
  const { ingredient } = req.query; // Extract query parameter: ingredient name

  if (!ingredient) {
    return res.status(400).json({ error: 'Please provide an ingredient name.' });
  }

  try {
    // Fetch composition data for the ingredient
    const data = ifct2017.compositions(ingredient);

    if (!data.length) {
      return res.status(404).json({ error: `No composition data found for '${ingredient}'.` });
    }

    // Map the data and add "val" property from conversion data
    let updatedData = Object.keys(data[0]).map(key => {
      if (conversionData[key]) {
        const updatedItem = { ...conversionData[key] };
        updatedItem["val"] = data[0][key];
        return updatedItem;
      }
      return null; // Exclude keys not found in conversionData
    });

    // Filter out null values
    updatedData = updatedData.filter(item => item !== null);

    // Send the updated data
    res.json(updatedData);
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
