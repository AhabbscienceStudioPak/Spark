/**
 * Payone Transaction Density Simulator
 * Simulates DSV's Payone payment data per merchant.
 * Returns realistic transaction density patterns based on time-of-day.
 */
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Seed merchants with realistic hourly transaction patterns
// Index = hour of day (0-23), value = typical transactions per hour
const MERCHANT_PROFILES = {
  'merchant-001': {
    name: 'Café Müller',
    category: 'cafe',
    // Quiet mornings, busy lunch, slow afternoon
    typicalHourly: [0,0,0,0,0,1,3,8,12,10,9,14,18,15,10,8,7,9,11,8,5,3,1,0],
  },
  'merchant-002': {
    name: 'Bäckerei Schmidt',
    category: 'bakery',
    // Very busy mornings, drops off by noon
    typicalHourly: [0,0,0,0,0,2,8,20,25,18,12,8,5,3,2,2,2,2,1,1,0,0,0,0],
  },
  'merchant-003': {
    name: 'Weinbar Alte Stadt',
    category: 'bar',
    // Evening-focused
    typicalHourly: [0,0,0,0,0,0,0,0,0,0,1,2,3,4,3,3,5,8,14,18,20,16,10,4],
  },
  'merchant-berlin-001': {
    name: 'Café am Prenzlauer Berg',
    category: 'cafe',
    typicalHourly: [0,0,0,0,0,1,4,10,14,12,10,16,20,17,12,9,8,10,12,9,6,4,2,0],
  },
  'merchant-berlin-002': {
    name: 'Markthalle Neun',
    category: 'retail',
    // Busy weekday lunch and weekend all day
    typicalHourly: [0,0,0,0,0,0,0,2,5,8,12,15,18,16,14,12,10,8,6,4,2,1,0,0],
  },
};

// Add some variance to simulate real-world fluctuation
function addVariance(typical, variancePct = 0.3) {
  const variance = 1 + (Math.random() * 2 - 1) * variancePct;
  return Math.max(0, Math.round(typical * variance));
}

// Simulate "quiet period" — randomly make some merchants low-demand
const LOW_DEMAND_MERCHANTS = new Set();
function refreshLowDemandMerchants() {
  LOW_DEMAND_MERCHANTS.clear();
  const ids = Object.keys(MERCHANT_PROFILES);
  // Randomly pick 1-2 merchants to be in a quiet period
  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    LOW_DEMAND_MERCHANTS.add(ids[Math.floor(Math.random() * ids.length)]);
  }
}
refreshLowDemandMerchants();
setInterval(refreshLowDemandMerchants, 10 * 60 * 1000); // refresh every 10 min

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payone-simulator', timestamp: new Date().toISOString() });
});

app.get('/api/merchants', (req, res) => {
  const merchants = Object.entries(MERCHANT_PROFILES).map(([id, profile]) => ({
    id,
    name: profile.name,
    category: profile.category,
  }));
  res.json({ merchants });
});

app.get('/api/merchants/:merchantId/transaction-density', (req, res) => {
  const { merchantId } = req.params;
  const profile = MERCHANT_PROFILES[merchantId];

  if (!profile) {
    // Unknown merchant — return city-wide average
    const hour = new Date().getHours();
    const typical = 8; // city-wide average
    const current = LOW_DEMAND_MERCHANTS.has(merchantId)
      ? Math.round(typical * 0.3)
      : addVariance(typical);
    return res.json({
      merchantId,
      currentHourCount: current,
      typicalHourCount: typical,
      densityRatio: current / typical,
      isLowDemand: current / typical < 0.6,
      source: 'city_average',
      updatedAt: new Date().toISOString(),
    });
  }

  const hour = new Date().getHours();
  const typical = profile.typicalHourly[hour];

  let current;
  if (LOW_DEMAND_MERCHANTS.has(merchantId)) {
    // Force low demand — simulate a quiet period
    current = Math.round(typical * (0.2 + Math.random() * 0.3));
  } else {
    current = addVariance(typical);
  }

  const densityRatio = typical > 0 ? current / typical : 1;

  res.json({
    merchantId,
    merchantName: profile.name,
    currentHourCount: current,
    typicalHourCount: typical,
    densityRatio: Math.round(densityRatio * 100) / 100,
    isLowDemand: densityRatio < 0.6,
    source: 'payone_simulated',
    updatedAt: new Date().toISOString(),
  });
});

// Historical density for the last 24 hours (for dashboard charts)
app.get('/api/merchants/:merchantId/transaction-history', (req, res) => {
  const { merchantId } = req.params;
  const profile = MERCHANT_PROFILES[merchantId];
  if (!profile) return res.status(404).json({ error: 'Merchant not found' });

  const history = profile.typicalHourly.map((typical, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    typical,
    actual: addVariance(typical),
  }));

  res.json({ merchantId, history });
});

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    service: 'payone-simulator',
    message: `Payone simulator running on port ${PORT}`,
    timestamp: new Date().toISOString(),
  }));
});
