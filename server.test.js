const request = require('supertest');
const app = require('./server');

describe('Backend API Tests', () => {
  
  test('GET / should return welcome message', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Backend do Meu App Expo está rodando!');
  });

  test('GET /api/workshops should return a list of workshops', async () => {
    const response = await request(app).get('/api/workshops');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('name');
  });

  test('GET /api/vehicles should return a list of vehicles', async () => {
    const response = await request(app).get('/api/vehicles');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('model');
  });

  test('POST /api/appointments should create a new appointment', async () => {
    const newAppointment = {
      workshopName: 'Oficina Teste',
      vehicleModel: 'Fusca',
      vehiclePlate: 'TST-0000',
      date: '20/03/2026',
      time: '10:00'
    };
    
    const response = await request(app)
      .post('/api/appointments')
      .send(newAppointment);
      
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('message', 'Agendamento realizado com sucesso!');
    expect(response.body).toHaveProperty('id');
  });

  test('POST /api/workshops should create a new workshop', async () => {
    const newWorkshop = {
      name: 'Oficina do Teste',
      address: 'Rua de Teste, 123'
    };
    
    const response = await request(app)
      .post('/api/workshops')
      .send(newWorkshop);
      
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('name', 'Oficina do Teste');
    expect(response.body).toHaveProperty('address', 'Rua de Teste, 123');
    expect(response.body).toHaveProperty('id');
  });

  test('POST /api/workshops should fail without name or address', async () => {
    const response = await request(app)
      .post('/api/workshops')
      .send({ name: 'Incompleta' });
      
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Nome e endereço são obrigatórios.');
  });

});
