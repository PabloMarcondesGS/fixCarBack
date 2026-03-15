const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mock Data
const workshops = [
  {
    id: '1',
    name: 'Oficina do Jão (vindo do Backend)',
    rating: 4.8,
    reviews: 124,
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    specialties: ['Motor', 'Suspensão', 'Freios'],
    phone: '11999999999',
    location: { lat: -23.561, lng: -46.655 },
    description: 'Especializada em mecânica pesada e diagnósticos complexos. Mais de 20 anos de experiência no mercado.',
    reviews_list: [
      { id: 'r1', userName: 'Carlos Silva', rating: 5, comment: 'Ótimo atendimento e preço justo.', date: '10/03/2026' },
      { id: 'r2', userName: 'Ana Oliveira', rating: 4, comment: 'Serviço de qualidade, mas demorou um pouco.', date: '05/03/2026' }
    ]
  },
  {
    id: '2',
    name: 'Pneus Express',
    rating: 4.5,
    reviews: 89,
    address: 'Rua das Flores, 450 - São Paulo, SP',
    specialties: ['Pneus', 'Alinhamento', 'Balanceamento'],
    phone: '11888888888',
    location: { lat: -23.570, lng: -46.40 },
    description: 'Foco total em pneus e geometria veicular. Equipamentos de última geração para alinhamento 3D.',
    reviews_list: [
      { id: 'r3', userName: 'Pedro Santos', rating: 5, comment: 'Rápido e eficiente.', date: '12/03/2026' }
    ]
  },
  {
    id: '3',
    name: 'Elétrica Voltagem',
    rating: 4.9,
    reviews: 56,
    address: 'Av. Brasil, 2500 - São Paulo, SP',
    specialties: ['Elétrica', 'Baterias', 'Injeção'],
    phone: '11777777777',
    location: { lat: -23.550, lng: -46.670 },
    description: 'Especialistas em sistemas elétricos modernos e injeção eletrônica. Diagnóstico por scanner.',
    reviews_list: [
      { id: 'r4', userName: 'Marcos Souza', rating: 5, comment: 'Resolveram o problema que ninguém achava.', date: '01/03/2026' }
    ]
  }
];

const vehicles = [
  {
    id: '1',
    model: 'Civic',
    brand: 'Honda',
    year: '2022',
    plate: 'ABC-1234'
  }
];

const appointments = [];

// Routes
// Workshops
app.get('/api/workshops', (req, res) => {
  res.json(workshops);
});

app.post('/api/workshops', (req, res) => {
  const { name, address } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: 'Nome e endereço são obrigatórios.' });
  }

  const newWorkshop = {
    id: (workshops.length + 1).toString(),
    name,
    address,
    rating: 0,
    reviews: 0,
    specialties: [],
    phone: '',
    location: { lat: 0, lng: 0 },
    description: '',
    reviews_list: []
  };

  workshops.push(newWorkshop);
  res.status(201).json(newWorkshop);
});

// Vehicles
app.get('/api/vehicles', (req, res) => {
  res.json(vehicles);
});

app.post('/api/vehicles', (req, res) => {
  const { model, plate, color, type, imageUri } = req.body;
  if (!model || !plate) {
    return res.status(400).json({ error: 'Modelo e placa são obrigatórios.' });
  }

  const newVehicle = {
    id: Date.now().toString(),
    model,
    plate,
    color,
    type: type || 'Carro',
    imageUri
  };

  vehicles.push(newVehicle);
  res.status(201).json(newVehicle);
});

app.delete('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const index = vehicles.findIndex(v => v.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Veículo não encontrado.' });
  }

  const deletedVehicle = vehicles.splice(index, 1);
  res.json({ message: 'Veículo excluído com sucesso!', vehicle: deletedVehicle[0] });
});

// Appointments
app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const appointment = req.body;
  const newAppointment = {
    ...appointment,
    id: Date.now().toString()
  };
  appointments.push(newAppointment);
  console.log('Solicitação de agendamento recebida e salva:', newAppointment);
  res.status(201).json({ message: 'Agendamento realizado com sucesso!', id: newAppointment.id });
});

app.get('/', (req, res) => {
  res.send('Backend do Meu App Expo está rodando!');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
