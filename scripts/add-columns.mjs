import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://syllaboss-db-kunle.aws-us-east-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5NDU2ODUsImlkIjoiMDFhMGZjYWUtNDUwMS03ZTQxLTkxNzItZGEzNzhkNmNlNDIxIiwia2lkIjoiSW1vS2lmVHNJNEZkMDFsOUVfNDJQQ01TTUtuUXkyR2pTWGhKOUZ1OEVtWSIsInJpZCI6IjQyZjEyNjgxLWZhMGMtNDYwZS04MWIyLTkwMWNjOWQ1MDcyMyJ9.eD10y_k_LzyciYuiNuCsuFRMouzlWrrYTStmQWEuR5XgbM0uWmCutRBc8mnBQSKQN5XYlBM_zpGCi0Q-X23aAQ'
});

async function main() {
  const safeAlter = async (sql) => {
    try {
      await client.execute(sql);
      console.log('Executed:', sql);
    } catch (e) {
      console.log('Skipped / Already exists:', e.message);
    }
  };

  await safeAlter('ALTER TABLE materials ADD COLUMN views INTEGER DEFAULT 0');
  await safeAlter('ALTER TABLE profiles ADD COLUMN sylla_plus INTEGER DEFAULT 0');
  await safeAlter('ALTER TABLE profiles ADD COLUMN referral_code TEXT');
  await safeAlter('ALTER TABLE profiles ADD COLUMN referred_by TEXT');
  await safeAlter('ALTER TABLE profiles ADD COLUMN study_minutes INTEGER DEFAULT 0');
  await safeAlter('ALTER TABLE profiles ADD COLUMN app_installed INTEGER DEFAULT 0');

  console.log('Schema migration complete!');
}

main().catch(console.error);
