import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://syllaboss-db-kunle.aws-us-east-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5NDU2ODUsImlkIjoiMDFhMGZjYWUtNDUwMS03ZTQxLTkxNzItZGEzNzhkNmNlNDIxIiwia2lkIjoiSW1vS2lmVHNJNEZkMDFsOUVfNDJQQ01TTUtuUXkyR2pTWGhKOUZ1OEVtWSIsInJpZCI6IjQyZjEyNjgxLWZhMGMtNDYwZS04MWIyLTkwMWNjOWQ1MDcyMyJ9.eD10y_k_LzyciYuiNuCsuFRMouzlWrrYTStmQWEuR5XgbM0uWmCutRBc8mnBQSKQN5XYlBM_zpGCi0Q-X23aAQ'
});

async function main() {
  await client.execute({
    sql: "INSERT OR REPLACE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
    args: ['admin-role-ayadi', 'user_3K8n3Oi8mns8nPhMbE95iGNK7dj', 'admin']
  });
  const res = await client.execute("SELECT * FROM user_roles");
  console.log('User roles in Turso:', res.rows);
}

main().catch(console.error);
