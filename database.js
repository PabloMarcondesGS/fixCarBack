const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'fixcar.db');
const db = new Database(dbPath);

const initDb = () => {
  // Workshops table
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
    description TEXT
  )`).run();

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
  const count = db.prepare("SELECT COUNT(*) as count FROM workshops").get().count;
  if (count === 0) {
    console.log("Seeding initial data...");
    
    const workshopStmt = db.prepare("INSERT INTO workshops VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    workshopStmt.run('1', 'Oficina do Jão (SQLite)', 4.8, 124, 'Av. Paulista, 1000 - São Paulo, SP', 'Motor,Suspensão,Freios', '11999999999', -23.561, -46.655, 'Especializada em mecânica pesada.');
    workshopStmt.run('2', 'Pneus Express', 4.5, 89, 'Rua das Flores, 450 - São Paulo, SP', 'Pneus,Alinhamento,Balanceamento', '11888888888', -23.570, -46.40, 'Foco total em pneus e geometria.');
    
    const reviewStmt = db.prepare("INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?)");
    reviewStmt.run('r1', '1', 'Carlos Silva', 5, 'Ótimo atendimento e preço justo.', '10/03/2026');
    reviewStmt.run('r2', '1', 'Ana Oliveira', 4, 'Serviço de qualidade.', '05/03/2026');
  }
};

module.exports = {
  db,
  initDb
};
