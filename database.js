const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'fixcar.db');
const db = new Database(dbPath);

const initDb = () => {
  db.prepare(`CREATE TABLE IF NOT EXISTS workshops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rating REAL,
    reviews INTEGER,
    address TEXT,
    specialties TEXT,
    phone TEXT,
    lat REAL,
    lng REAL,
    description TEXT,
    cnpj TEXT,
    imageUri TEXT
  )`).run();

  // Migração Workshops
  const workshopTableInfo = db.prepare("PRAGMA table_info(workshops)").all();
  const workshopColumns = workshopTableInfo.map(col => col.name);
  if (!workshopColumns.includes('cnpj')) {
    db.exec("ALTER TABLE workshops ADD COLUMN cnpj TEXT");
  }
  if (!workshopColumns.includes('imageUri')) {
    db.exec("ALTER TABLE workshops ADD COLUMN imageUri TEXT");
  }

  // Reviews table
  db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    workshop_id TEXT,
    userName TEXT,
    rating INTEGER,
    comment TEXT,
    date TEXT,
    FOREIGN KEY (workshop_id) REFERENCES workshops (id)
  )`).run();

  // Vehicles table
    db.exec(`
        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            brand TEXT,
            year TEXT,
            plate TEXT NOT NULL,
            color TEXT,
            type TEXT,
            imageUri TEXT,
            plan TEXT DEFAULT 'Free',
            subscription_status TEXT DEFAULT 'active',
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT
        )
    `);

    // Migração: Garante que colunas novas existam caso a tabela já tenha sido criada antes
    const tableInfo = db.prepare("PRAGMA table_info(vehicles)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    const newColumns = [
        { name: 'plan', type: "TEXT DEFAULT 'Free'" },
        { name: 'subscription_status', type: "TEXT DEFAULT 'active'" },
        { name: 'stripe_customer_id', type: 'TEXT' },
        { name: 'stripe_subscription_id', type: 'TEXT' }
    ];

    newColumns.forEach(col => {
        if (!existingColumns.includes(col.name)) {
            console.log(`Migrando: Adicionando coluna ${col.name} à tabela vehicles...`);
            db.exec(`ALTER TABLE vehicles ADD COLUMN ${col.name} ${col.type}`);
        }
    });

  // Appointments table
  db.prepare(`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    workshop_id TEXT,
    vehicle_id TEXT,
    date TEXT,
    time TEXT,
    service TEXT,
    status TEXT,
    FOREIGN KEY (workshop_id) REFERENCES workshops (id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
  )`).run();

  // Plans table
  db.prepare(`CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT
  )`).run();

  // Seed plans if empty
  const planCount = db.prepare("SELECT COUNT(*) as count FROM plans").get().count;
  if (planCount === 0) {
    console.log("Seeding plans...");
    const planStmt = db.prepare("INSERT INTO plans VALUES (?, ?, ?, ?)");
    planStmt.run('Free', 'Grátis', 0.00, 'Funcionalidades básicas');
    planStmt.run('Basic', 'Básico', 29.90, 'Histórico completo e lembretes');
    planStmt.run('Premium', 'Premium', 59.90, 'Suporte Prioritário e Relatórios');
  }

  // Seed initial data if empty
  // Limpeza de oficinas mocadas
  db.prepare("DELETE FROM workshops WHERE id = '2'").run();

  const count = db.prepare("SELECT COUNT(*) as count FROM workshops").get().count;
  if (count === 0) {
    console.log("Seeding initial data...");
    
    const workshopStmt = db.prepare("INSERT INTO workshops VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    workshopStmt.run('1', 'Oficina do Jão (SQLite)', 4.8, 124, 'Av. Paulista, 1000 - São Paulo, SP', 'Motor,Suspensão,Freios', '11999999999', -23.561, -46.655, 'Especializada em mecânica pesada.');
    
    const reviewStmt = db.prepare("INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?)");
    reviewStmt.run('r1', '1', 'Carlos Silva', 5, 'Ótimo atendimento e preço justo.', '10/03/2026');
    reviewStmt.run('r2', '1', 'Ana Oliveira', 4, 'Serviço de qualidade.', '05/03/2026');
  }

  // Garantia: se user1 existe mas workshop 1 sumiu, recria workshop 1
  const w1 = db.prepare("SELECT * FROM workshops WHERE id = '1'").get();
  if (!w1) {
    console.log("Reinserindo oficina ID 1 faltante...");
    db.prepare("INSERT INTO workshops (id, name, rating, reviews, address, specialties) VALUES (?, ?, ?, ?, ?, ?)")
      .run('1', 'Oficina do Jão', 4.8, 120, 'Av. Paulista, 1000', 'Motor,Suspensão,Freios');
  }

  // Users table
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT,
    workshop_id TEXT,
    FOREIGN KEY (workshop_id) REFERENCES workshops (id)
  )`).run();

  // Migração Users
  const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
  if (!userTableInfo.map(c => c.name).includes('workshop_id')) {
    db.exec("ALTER TABLE users ADD COLUMN workshop_id TEXT");
  }

  // Seed user1
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE username = ?").get('user1').count;
  if (userCount === 0) {
    console.log("Seeding user1...");
    db.prepare("INSERT INTO users (id, username, password, name, role, workshop_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run('u1', 'user1', 'password123', 'Usuário Oficina 1', 'workshop', '1');
  } else {
    // Força atualização em todos os casos para garantir ID 1
    db.prepare("UPDATE users SET workshop_id = '1' WHERE username = 'user1'").run();
  }

  // Blocked slots table
  db.prepare(`CREATE TABLE IF NOT EXISTS blocked_slots (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    reason TEXT
  )`).run();

  // Migração Vehicles e Appointments (user_id, details)
  ['vehicles', 'appointments'].forEach(table => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!info.map(c => c.name).includes('user_id')) {
      console.log(`Migrando: Adicionando user_id à tabela ${table}...`);
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
    }
  });

  const apptInfo = db.prepare("PRAGMA table_info(appointments)").all();
  const apptCols = apptInfo.map(c => c.name);
  if (!apptCols.includes('details')) {
    console.log("Migrando: Adicionando coluna details à tabela appointments...");
    db.exec("ALTER TABLE appointments ADD COLUMN details TEXT");
  }
  if (!apptCols.includes('cost')) {
    console.log("Migrando: Adicionando coluna cost à tabela appointments...");
    db.exec("ALTER TABLE appointments ADD COLUMN cost REAL");
  }
  if (!apptCols.includes('parts_images')) {
    console.log("Migrando: Adicionando coluna parts_images à tabela appointments...");
    db.exec("ALTER TABLE appointments ADD COLUMN parts_images TEXT");
  }
};

module.exports = {
  db,
  initDb
};
