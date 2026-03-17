import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'baze_voucher_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Connection timeout settings
  connectTimeout: 60000, // 60 seconds
});

// Handle pool errors
pool.on('connection', (connection) => {
  connection.on('error', (err: any) => {
    console.error('Database connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      // Connection was lost, pool will handle reconnection
      console.log('Database connection lost, will reconnect automatically');
    }
  });
});

// Test connection on startup
pool.getConnection()
  .then((connection) => {
    console.log('Database connection pool initialized successfully');
    connection.release();
  })
  .catch((err) => {
    console.error('Failed to initialize database connection pool:', err);
});

export default pool;

