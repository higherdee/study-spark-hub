import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://syllaboss-db-kunle.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN
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
