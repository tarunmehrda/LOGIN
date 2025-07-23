const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// User registration
app.post('/register', async (req, res) => {
  console.log('Register request body:', req.body);
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'Name, phone, and password are required' });

  try {
    console.log('Checking if user exists...');
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (!userSnapshot.empty) return res.status(409).json({ error: 'User already exists' });

    console.log('Adding user to Firestore...');
    const userRef = await db.collection('users').add({
      name,
      phone,
      password,
      age: null,
      weight: null,
      goal: null,
      gender: null,
      premium: false,
      premiumPlan: null,
      premiumStart: null,
      premiumEnd: null
    });
    console.log('User added:', userRef.id);
    res.status(201).json({ message: 'Registered successfully', userId: userRef.id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration', details: err.message });
  }
});

// User login
app.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required' });

  try {
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (userSnapshot.empty) return res.status(404).json({ error: 'User not found' });
    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();
    if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    res.status(200).json({ message: 'Login successful', user: { ...user, id: userDoc.id } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get user profile
app.get('/profile/:id', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// Update age
app.post('/update-age', async (req, res) => {
  const { _id, age } = req.body;
  if (!_id || !age) return res.status(400).json({ error: 'User ID and age required' });
  try {
    await db.collection('users').doc(_id).update({ age });
    const userDoc = await db.collection('users').doc(_id).get();
    res.json({ message: 'Age updated', user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Update age error:', err);
    res.status(500).json({ error: 'Error updating age' });
  }
});

// Update weight
app.post('/update-weight', async (req, res) => {
  const { _id, weight } = req.body;
  if (!_id || !weight) return res.status(400).json({ error: 'User ID and weight required' });
  try {
    await db.collection('users').doc(_id).update({ weight });
    const userDoc = await db.collection('users').doc(_id).get();
    res.json({ message: 'Weight updated', user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Update weight error:', err);
    res.status(500).json({ error: 'Error updating weight' });
  }
});

// Update goal
app.post('/update-goal', async (req, res) => {
  const { _id, goal } = req.body;
  if (!_id || !goal) return res.status(400).json({ error: 'User ID and goal required' });
  try {
    await db.collection('users').doc(_id).update({ goal });
    const userDoc = await db.collection('users').doc(_id).get();
    res.json({ message: 'Goal updated', user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Error updating goal' });
  }
});

// Update gender
app.post('/update-gender', async (req, res) => {
  const { _id, gender } = req.body;
  if (!_id || !gender) return res.status(400).json({ error: 'User ID and gender required' });
  try {
    await db.collection('users').doc(_id).update({ gender });
    const userDoc = await db.collection('users').doc(_id).get();
    res.json({ message: 'Gender updated', user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Update gender error:', err);
    res.status(500).json({ error: 'Error updating gender' });
  }
});

// Enable premium
app.post('/enable-premium', async (req, res) => {
  const { _id } = req.body;
  if (!_id) return res.status(400).json({ error: 'User ID required' });
  try {
    await db.collection('users').doc(_id).update({ premium: true });
    const userDoc = await db.collection('users').doc(_id).get();
    res.json({ message: 'Premium enabled', user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Enable premium error:', err);
    res.status(500).json({ error: 'Error enabling premium' });
  }
});

// Activate premium
app.post('/activate-premium', async (req, res) => {
  const { _id, plan } = req.body;
  if (!_id || !plan) return res.status(400).json({ error: 'User ID and plan required' });
  try {
    let startDate = new Date();
    let endDate = null;
    if (plan === 'weekly') {
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (plan === 'monthly') {
      endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (plan === 'lifetime') {
      endDate = null;
    } else {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    await db.collection('users').doc(_id).update({
      premium: true,
      premiumPlan: plan,
      premiumStart: startDate,
      premiumEnd: endDate
    });
    const userDoc = await db.collection('users').doc(_id).get();
    res.json({ message: 'Premium activated', user: { ...userDoc.data(), id: userDoc.id } });
  } catch (err) {
    console.error('Activate premium error:', err);
    res.status(500).json({ error: 'Error activating premium' });
  }
});

// Check expired premiums
app.get('/check-expired-premiums', async (req, res) => {
  try {
    const now = new Date();
    const usersSnapshot = await db.collection('users').where('premium', '==', true).get();
    let modified = 0;
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.premiumEnd && user.premiumEnd.toDate() <= now) {
        batch.update(doc.ref, {
          premium: false,
          premiumPlan: null,
          premiumStart: null,
          premiumEnd: null
        });
        modified++;
      }
    });
    await batch.commit();
    res.json({ message: 'Expired premium users updated', modified });
  } catch (err) {
    console.error('Check expired premiums error:', err);
    res.status(500).json({ error: 'Error checking expired premiums' });
  }
});

// Home Test Route
app.get('/', (req, res) => {
  res.send('✅ Fiturai API is live (Firestore)');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
