# Automated daily database backup (2:00 AM)

To run `backup-db.sh` every day at 2:00 AM without remembering:

1. **Make the script executable** (once):
   ```bash
   chmod +x scripts/backup-db.sh scripts/restore-db.sh
   ```

2. **Install the cron job**:
   ```bash
   crontab -e
   ```
   Add this line (replace `/root/rag2` with your repo path if different):
   ```
   0 2 * * * /bin/bash /root/rag2/scripts/backup-db.sh >> /root/rag2/backups/backup.log 2>&1
   ```
   Save and exit. Cron will run the backup at 2:00 AM every day.

3. **Optional**: Ensure `pg_dump` and `psql` are on the cron user’s `PATH`. If backups fail in cron, use the full path to the script and, if needed, set `PATH` in the crontab:
   ```
   PATH=/usr/local/bin:/usr/bin:/bin
   0 2 * * * /bin/bash /root/rag2/scripts/backup-db.sh >> /root/rag2/backups/backup.log 2>&1
   ```

Success and failure are also logged inside the script to `backups/backup.log`.
