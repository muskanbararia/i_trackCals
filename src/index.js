const express = require('express');
const ifct2017 = require('ifct2017');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

const measurementToGrams = {
  spoon: 5,   
  tablespoon: 15, 
  cup: 240, 
  pinch: 0.36,
  kilogram: 1000,
  ounce: 28.35, 
  pound: 453.59,
  quart: 946,          // 1 quart = 946 grams (approx, varies by ingredient)
  pint: 473,           // 1 pint = 473 grams (approx, varies by ingredient)
  gallon: 3785,        // 1 gallon = 3785 grams (approx, varies by ingredient)
  dash: 0.6,           // 1 dash = 0.6 grams (approx)
  drop: 0.05,          // 1 drop = 0.05 grams (approx)
};

function convertToGrams(type, quantity) {
  const gramEquivalent = measurementToGrams[type.toLowerCase()];
  if (!gramEquivalent) {
    throw new Error(`Unknown measurement type: ${type}`);
  }
  return gramEquivalent * quantity;
}
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
function areSimilarStrings(str1, str2) {
  if(str1.includes(str2)) return true;
  // If the strings are the same, they are similar
  if (str1 === str2) return true;

  const len1 = str1.length;
  const len2 = str2.length;

  // If length difference is greater than 1, they cannot be similar
  if (Math.abs(len1 - len2) > 1) return false;

  let typoCount = 0;
  let i = 0, j = 0;

  while (i < len1 && j < len2) {
    if (str1[i] !== str2[j]) {
      // Increment typo count
      typoCount++;
      if (typoCount > 1) return false;

      if (len1 > len2) {
        // Deletion in str2
        i++;
      } else if (len1 < len2) {
        // Insertion in str2
        j++;
      } else {
        // Substitution in str2
        i++;
        j++;
      }
    } else {
      // Characters match; move to the next
      i++;
      j++;
    }
  }

  // If there's an extra character at the end of either string
  if (i < len1 || j < len2) typoCount++;

  return typoCount <= 1;
}




loadConversionData();

// Route: GET /ping (Health Check)
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Route: GET /getCals
app.get('/getCals', async (req, res) => {
  const { ingredient, quantity = 100, unit = "gram" } = req.query; 

  if (!ingredient) {
    return res.status(400).json({ error: 'Please provide an ingredient name.' });
  }

  try {
    let quantityInGrams = Number(quantity);
    if (unit.toLowerCase() !== "gram") {
      try {
        quantityInGrams = convertToGrams(unit, quantityInGrams);
      } catch (conversionError) {
        return res.status(400).json({ error: conversionError.message });
      }
    }
    // Fetch composition data for the ingredient
    const data = ifct2017.compositions(ingredient);

    if (!data.length) {
      return res.status(404).json({ error: `No composition data found for '${ingredient}'.` });
    }
    if (!areSimilarStrings(data[0].name,ingredient)){
      return res.status(404).json({ error: `No composition data found for '${ingredient}'. Did you mean ${data[0].name}` });
    }

    // Map the data and add "val" property from conversion data
    let updatedData = Object.keys(data[0]).map(key => {
      if (conversionData[key]) {
        const updatedItem = { ...conversionData[key] };
        updatedItem["val"] = data[0][key] * quantityInGrams/100;
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
