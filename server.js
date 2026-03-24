const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize Database
try {
  initDb();
  console.log('Banco de dados inicializado com sucesso.');
} catch (error) {
  console.error('Erro ao inicializar o banco de dados:', error);
}

// Routes
// Workshops
app.get('/api/workshops', (req, res) => {
  try {
    const workshops = db.prepare("SELECT * FROM workshops").all();
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
  } catch (error) {
    console.error('Erro ao buscar oficinas:', error);
    res.status(500).json({ error: 'Erro interno ao buscar oficinas.' });
  }
});

app.post('/api/workshops', (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'Nome e endereço são obrigatórios.' });
    }

    const id = Date.now().toString();
    db.prepare("INSERT INTO workshops (id, name, address, rating, reviews) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, address, 0, 0);

    const newWorkshop = db.prepare("SELECT * FROM workshops WHERE id = ?").get(id);
    res.status(201).json(newWorkshop);
  } catch (error) {
    console.error('Erro ao cadastrar oficina:', error);
    res.status(500).json({ error: 'Erro ao cadastrar oficina no banco de dados.' });
  }
});

// Vehicles
app.get('/api/vehicles', (req, res) => {
  try {
    const vehicles = db.prepare("SELECT * FROM vehicles").all();
    res.json(vehicles);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar veículos.' });
  }
});

app.post('/api/vehicles', (req, res) => {
    try {
        const { model, brand, year, plate, color, type, imageUri, plan } = req.body;
        const id = Date.now().toString();
        
        // Simulação de criação de cliente no Stripe se for plano pago
        const stripe_customer_id = plan !== 'Free' ? `cus_${id}` : null;
        const subscription_status = 'active'; // Simulado como ativo para o MVP

        const stmt = db.prepare('INSERT INTO vehicles (id, model, brand, year, plate, color, type, imageUri, plan, subscription_status, stripe_customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        stmt.run(id, model, brand, year, plate, color, type, imageUri, plan || 'Free', subscription_status, stripe_customer_id);
        
        const newVehicle = { id, model, brand, year, plate, color, type, imageUri, plan: plan || 'Free', subscription_status };
        console.log('Veículo cadastrado:', newVehicle);
        res.status(201).json(newVehicle);
    } catch (error) {
        console.error('Erro ao cadastrar veículo:', error);
        res.status(500).json({ error: 'Erro ao cadastrar veículo' });
    }
});

app.delete('/api/vehicles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não encontrado.' });
    }

    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    res.json({ message: 'Veículo excluído com sucesso!', vehicle });
  } catch (error) {
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({ error: 'Erro interno ao excluir veículo.' });
  }
});

// Appointments
app.get('/api/appointments', (req, res) => {
  try {
    const appointments = db.prepare("SELECT * FROM appointments").all();
    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar agendamentos.' });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const appointment = req.body;
    const id = Date.now().toString();
    
    // Suporte tanto para workshopId quanto para retrocompatibilidade
    const workshopId = appointment.workshopId || '1'; // Default para oficina principal se não enviado
    const vehicleId = appointment.vehicleId || '1';   // Default para veículo 1 se não enviado
    
    db.prepare(`INSERT INTO appointments (id, workshop_id, vehicle_id, date, time, service, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, workshopId, vehicleId, appointment.date, appointment.time, appointment.service || 'Geral', 'Pendente');

    const newAppointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    console.log('Agendamento salvo:', newAppointment);
    res.status(201).json({ message: 'Agendamento realizado com sucesso!', id: newAppointment.id });
  } catch (error) {
    console.error('Erro ao realizar agendamento:', error);
    res.status(500).json({ error: 'Erro ao salvar agendamento no banco de dados.' });
  }
});

// Plans
app.get('/api/plans', (req, res) => {
  try {
    const plans = db.prepare("SELECT * FROM plans").all();
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar planos.' });
  }
});

app.get('/', (req, res) => {
  res.send('Backend do Meu App Expo com SQLite está rodando e pronto para conexões externas!');
});

if (require.main === module) {
  // Escuta em 0.0.0.0 para permitir acesso na rede local
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
