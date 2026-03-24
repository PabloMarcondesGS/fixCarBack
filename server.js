const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// Routes
// Workshops
app.get('/api/workshops', (req, res) => {
  const workshops = db.prepare("SELECT * FROM workshops").all();
  // Get reviews for each workshop
  const workshopsWithReviews = workshops.map(w => {
    const reviews = db.prepare("SELECT * FROM reviews WHERE workshop_id = ?").all(w.id);
    return {
      ...w,
      specialties: w.specialties ? w.specialties.split(',') : [],
      location: { lat: w.lat, lng: w.lng },
      reviews_list: reviews
    };
  });
  res.json(workshopsWithReviews);
});

app.post('/api/workshops', (req, res) => {
  const { name, address } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: 'Nome e endereço são obrigatórios.' });
  }

  const id = Date.now().toString();
  db.prepare("INSERT INTO workshops (id, name, address, rating, reviews) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, address, 0, 0);

  const newWorkshop = db.prepare("SELECT * FROM workshops WHERE id = ?").get(id);
  res.status(201).json(newWorkshop);
});

// Vehicles
app.get('/api/vehicles', (req, res) => {
  const vehicles = db.prepare("SELECT * FROM vehicles").all();
  res.json(vehicles);
});

app.post('/api/vehicles', (req, res) => {
  const { model, plate, color, type, imageUri } = req.body;
  if (!model || !plate) {
    return res.status(400).json({ error: 'Modelo e placa são obrigatórios.' });
  }

  const id = Date.now().toString();
  db.prepare("INSERT INTO vehicles (id, model, plate, color, type, imageUri) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, model, plate, color, type || 'Carro', imageUri);

  const newVehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  res.status(201).json(newVehicle);
});

app.delete('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  
  if (!vehicle) {
    return res.status(404).json({ error: 'Veículo não encontrado.' });
  }

  db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  res.json({ message: 'Veículo excluído com sucesso!', vehicle });
});

// Appointments
app.get('/api/appointments', (req, res) => {
  const appointments = db.prepare("SELECT * FROM appointments").all();
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const appointment = req.body;
  const id = Date.now().toString();
  
  db.prepare(`INSERT INTO appointments (id, workshop_id, vehicle_id, date, time, service, status) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, appointment.workshopId, appointment.vehicleId, appointment.date, appointment.time, appointment.service, 'Pendente');

  const newAppointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  console.log('Solicitação de agendamento recebida e salva no banco:', newAppointment);
  res.status(201).json({ message: 'Agendamento realizado com sucesso!', id: newAppointment.id });
});

app.get('/', (req, res) => {
  res.send('Backend do Meu App Expo com SQLite está rodando!');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
