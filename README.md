# Smart Voucher

A secure, paperless, web-based digital voucher system where students/staff/users can pay for meals using QR code scanning at campus restaurants.

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: MySQL
- **Authentication**: JWT
- **QR Codes**: qrcode, qrcode.react, react-qr-reader
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up MySQL Database**
   - Create a MySQL database named `baze_voucher_db`
   - Update `.env` file with your database credentials

3. **Run Database Migrations**
   - The database schema will be created automatically on first run
   - Or run the SQL script in `database/schema.sql` manually

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The server will start and display both:
   - **Local URL**: http://localhost:3000
   - **Network URL**: http://[YOUR_IP]:3000 (for access from other devices on the same network)
   
   **Alternative Commands:**
   - `npm run dev:local` - Start on localhost only
   - `npm run dev:simple` - Start with network access (simpler output)
   - `npm run get:ip` - Just display your network IP address

5. **Access the Application**
   - **Local**: Open [http://localhost:3000](http://localhost:3000)
   - **Network**: Use the network IP shown in the console to access from other devices
   - **Note**: Make sure your firewall allows connections on port 3000

## User Roles

- **Customer**: Students, Staff, Users
- **Restaurant**: Restaurant owners/managers
- **Admin**: University administrators

## Features

- QR Code Payment System
- Real-Time Menu & Stock Management
- Balance Management & Top-Up
- Transaction History
- Restaurant Approval System
- Order QR Code Generation

## Environment Variables

Copy `.env.example` to `.env` and fill in your configuration:

- `DATABASE_HOST`: MySQL host
- `DATABASE_PORT`: MySQL port (default: 3306)
- `DATABASE_USER`: MySQL username
- `DATABASE_PASSWORD`: MySQL password
- `DATABASE_NAME`: Database name
- `JWT_SECRET`: Secret key for JWT tokens
- `NEXT_PUBLIC_APP_URL`: Application URL

