# Setup database (creates all tables)
npm run setup:db

# Seed sample data
npm run seed:restaurants
npm run seed:brim

# Seed Data Scripts

This folder contains seed data scripts for populating the database with sample data.

## Available Seed Scripts

### `seed-restaurants.js`
Seeds initial restaurant data including:
- Restaurant owners (Brim and Terminal)
- Restaurant information
- Menu items for each restaurant

**Usage:**
```bash
npm run seed:restaurants
```

### `seed-brim-owner-data.js`
Comprehensive seed data for Brim restaurant including:
- Restaurant owner account
- Restaurant information
- Restaurant staff members
- Menu items
- Subscription plans
- Sample customers
- Customer subscriptions
- Sample orders

**Usage:**
```bash
npm run seed:brim
```

## Notes

- All seed scripts use environment variables from `.env` file
- Scripts are idempotent - they check for existing data before inserting
- Passwords are hashed using bcrypt before storage
- Default passwords are provided in the script comments

## Adding New Seed Scripts

When creating new seed scripts:
1. Place them in this `seed/` folder
2. Use the same connection pattern as existing scripts
3. Make scripts idempotent (check before insert)
4. Update this README with the new script information
5. Add npm script to `package.json` if needed

