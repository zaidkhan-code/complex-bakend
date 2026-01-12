# 🚀 Database Migration Quick Reference

## Commands

```bash
# Run pending migrations
npm run migrate

# Check status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Production deployment (auto in Vercel)
npm run migrate:prod
```

## Migration Files Location

```
bakend/migrations/
├── 001_create_base_tables.js
├── 002_add_business_fields.js
└── 003_add_promotion_approval_fields.js
```

## Available Fields

### Businesses Table

- `personName` - Contact person name
- `businessAddress` - Full business address
- `categories` - Array of 1-2 categories (JSONB)
- `autoApprovePromotions` - Boolean for auto-approval

### Promotions Table

- `status` - ENUM: 'pending', 'active', 'inactive'
- `autoApprove` - Boolean for auto-approval flag
- `approvedAt` - DATE for approval timestamp
- `paymentStatus` - ENUM: 'pending', 'completed', 'failed'

## Workflow

```
Development:
1. Pull latest code
2. npm install
3. npm run migrate          ← Run new migrations
4. npm run dev             ← Start dev server

Production (Vercel):
- Migrations run automatically in build step
- Check deployment logs to verify
```

## ✅ Before Deployment

```bash
# 1. Check migrations
npm run migrate:status

# 2. Verify pending migrations
# (should be empty before deploying)

# 3. Run migrations locally
npm run migrate

# 4. Test application
npm run dev

# 5. Commit and push
git add .
git commit -m "Database migrations"
git push
```

## Common Issues

| Issue              | Solution                                     |
| ------------------ | -------------------------------------------- |
| Migration fails    | Check database connection in `.env`          |
| Already executed   | Check `SequelizeMeta` table - each runs once |
| Connection timeout | Verify DATABASE_URL in `.env`                |
| Table not found    | Ensure migration 001 ran first               |

## Migration Status Table

Check what migrations have run:

```sql
SELECT name, executedAt FROM "SequelizeMeta" ORDER BY executedAt DESC;
```

---

For detailed guide, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
