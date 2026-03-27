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
app.get('/api/workshops/:id', (req, res) => {
  try {
    const { id } = req.params;
    const workshop = db.prepare("SELECT * FROM workshops WHERE id = ?").get(id);
    if (!workshop) {
      return res.status(404).json({ error: 'Oficina não encontrada.' });
    }
    
    const reviews = db.prepare("SELECT * FROM reviews WHERE workshop_id = ?").all(id);
    res.json({
      ...workshop,
      specialties: workshop.specialties ? workshop.specialties.split(',') : [],
      location: { lat: workshop.lat, lng: workshop.lng },
      reviews_list: reviews
    });
  } catch (error) {
    console.error('Erro ao buscar oficina:', error);
    res.status(500).json({ error: 'Erro interno ao buscar oficina.' });
  }
});

app.put('/api/workshops/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, cnpj, imageUri, specialties } = req.body;
    
    const workshop = db.prepare("SELECT * FROM workshops WHERE id = ?").get(id);
    if (!workshop) {
      return res.status(404).json({ error: 'Oficina não encontrada.' });
    }

    const specsString = Array.isArray(specialties) ? specialties.join(',') : specialties;

    db.prepare("UPDATE workshops SET name = ?, address = ?, cnpj = ?, imageUri = ?, specialties = ? WHERE id = ?")
      .run(name || workshop.name, address || workshop.address, cnpj || workshop.cnpj, imageUri || workshop.imageUri, specsString || workshop.specialties, id);

    const updated = db.prepare("SELECT * FROM workshops WHERE id = ?").get(id);
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar oficina:', error);
    res.status(500).json({ error: 'Erro ao atualizar oficina no banco de dados.' });
  }
});

// Vehicles
app.get('/api/vehicles', (req, res) => {
  try {
    const { userId } = req.query;
    let vehicles;
    if (userId) {
      vehicles = db.prepare("SELECT * FROM vehicles WHERE user_id = ?").all(userId);
    } else {
      // Por segurança, se não houver userId, retorna lista vazia
      vehicles = [];
    }
    res.json(vehicles);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar veículos.' });
  }
});

app.post('/api/vehicles', (req, res) => {
    try {
        const { model, brand, year, plate, color, type, imageUri, plan, user_id } = req.body;
        const id = Date.now().toString();
        
        // Simulação de criação de cliente no Stripe se for plano pago
        const stripe_customer_id = plan !== 'Free' ? `cus_${id}` : null;
        const subscription_status = 'active'; // Simulado como ativo para o MVP

        const stmt = db.prepare('INSERT INTO vehicles (id, model, brand, year, plate, color, type, imageUri, plan, subscription_status, stripe_customer_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        stmt.run(id, model, brand, year, plate, color, type, imageUri, plan || 'Free', subscription_status, stripe_customer_id, user_id || null);
        
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

    // Primeiro remove agendamentos vinculados para evitar erro de FK
    db.prepare("DELETE FROM appointments WHERE vehicle_id = ?").run(id);
    
    // Depois remove o veículo
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    
    res.json({ message: 'Veículo e agendamentos vinculados excluídos com sucesso!', vehicle });
  } catch (error) {
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({ error: 'Erro interno ao excluir veículo.' });
  }
});

// Appointments
app.get('/api/appointments', (req, res) => {
  try {
    const { userId, workshopId, date, vehicleId } = req.query;
    let appointments;
    
    if (workshopId) {
      let query = "SELECT a.*, v.model, v.plate FROM appointments a LEFT JOIN vehicles v ON a.vehicle_id = v.id WHERE a.workshop_id = ?";
      let params = [workshopId];
      if (date) {
        query += " AND a.date = ?";
        params.push(date);
      }
      appointments = db.prepare(query).all(...params);
    } else if (userId) {
      let query = `
        SELECT a.*, v.model, v.plate, w.name as workshop_name, w.address as workshop_address
        FROM appointments a 
        LEFT JOIN vehicles v ON a.vehicle_id = v.id 
        LEFT JOIN workshops w ON a.workshop_id = w.id
        WHERE a.user_id = ?
      `;
      let params = [userId];
      if (date) {
        query += " AND a.date = ?";
        params.push(date);
      }
      if (vehicleId) {
        query += " AND a.vehicle_id = ?";
        params.push(vehicleId);
      }
      appointments = db.prepare(query).all(...params);
    } else if (vehicleId) {
       // Allow fetching by vehicleId even without userId (e.g. for specific vehicle details)
       let query = "SELECT a.*, v.model, v.plate, w.name as workshop_name FROM appointments a LEFT JOIN vehicles v ON a.vehicle_id = v.id LEFT JOIN workshops w ON a.workshop_id = w.id WHERE a.vehicle_id = ?";
       appointments = db.prepare(query).all(vehicleId);
    } else {
      // Por segurança, se não houver filtros, retorna lista vazia
      appointments = [];
    }
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
    const workshopId = appointment.workshopId || '1';
    const vehicleId = appointment.vehicleId || '1';
    const userId = appointment.user_id || null;

    // Verificar se já existe agendamento para este horário nesta oficina
    const existing = db.prepare("SELECT * FROM appointments WHERE workshop_id = ? AND date = ? AND time = ?")
      .get(workshopId, appointment.date, appointment.time);
    
    if (existing) {
      return res.status(400).json({ error: 'Este horário já foi preenchido por outro cliente. Por favor, escolha outro.' });
    }
    
    db.prepare(`INSERT INTO appointments (id, workshop_id, vehicle_id, date, time, service, status, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, workshopId, vehicleId, appointment.date, appointment.time, appointment.service || 'Geral', 'Pendente', userId);

    const newAppointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    console.log('Agendamento salvo:', newAppointment);
    res.status(201).json({ message: 'Agendamento realizado com sucesso!', id: newAppointment.id });
  } catch (error) {
    console.error('Erro ao realizar agendamento:', error);
    res.status(500).json({ error: 'Erro ao salvar agendamento no banco de dados.' });
  }
});

app.get('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const appointment = db.prepare(`
      SELECT a.*, v.model, v.plate, v.brand, v.year, v.color, v.type
      FROM appointments a
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.id = ?
    `).get(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    res.json(appointment);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro interno ao buscar agendamento.' });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, details, cost, parts_images } = req.body;
    
    const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // parts_images pode vir como array, vamos converter para string se necessário
    const imagesString = Array.isArray(parts_images) ? JSON.stringify(parts_images) : parts_images;

    db.prepare("UPDATE appointments SET status = ?, details = ?, cost = ?, parts_images = ? WHERE id = ?")
      .run(status || appointment.status, details || appointment.details, cost || appointment.cost, imagesString || appointment.parts_images, id);

    const updated = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento no banco de dados.' });
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

// Login
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    
    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        workshop_id: user.workshop_id,
        accessToken: `mtk_${Date.now()}` // Mock token
      });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas.' });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro interno ao processar login.' });
  }
});

// Blocked Slots
app.get('/api/blocked-slots', (req, res) => {
  try {
    const slots = db.prepare("SELECT * FROM blocked_slots").all();
    res.json(slots);
  } catch (error) {
    console.error('Erro ao buscar horários bloqueados:', error);
    res.status(500).json({ error: 'Erro interno ao buscar horários bloqueados.' });
  }
});

app.post('/api/blocked-slots', (req, res) => {
  try {
    const { date, time, reason } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: 'Data e hora são obrigatórios.' });
    }

    const id = Date.now().toString();
    db.prepare("INSERT INTO blocked_slots (id, date, time, reason) VALUES (?, ?, ?, ?)")
      .run(id, date, time, reason || '');

    res.status(201).json({ id, date, time, reason });
  } catch (error) {
    console.error('Erro ao bloquear horário:', error);
    res.status(500).json({ error: 'Erro ao salvar bloqueio no banco de dados.' });
  }
});

app.delete('/api/blocked-slots/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM blocked_slots WHERE id = ?").run(id);
    res.json({ message: 'Bloqueio removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover bloqueio:', error);
    res.status(500).json({ error: 'Erro interno ao remover bloqueio.' });
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
