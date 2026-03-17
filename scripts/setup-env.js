const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(32).toString('hex');

const envContent = `# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=baze_voucher_db

# JWT Secret (auto-generated)
JWT_SECRET=${jwtSecret}

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with auto-generated JWT_SECRET');
  console.log('⚠️  Please update DATABASE_PASSWORD with your MySQL password');
} else {
  console.log('⚠️  .env file already exists. Skipping creation.');
  console.log('   If you need to update it, edit .env manually.');
}

