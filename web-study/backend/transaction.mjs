// The callback must remain synchronous on both Node SQLite and Durable Object SQLite.
export function atomic(db, callback) {
  if (db.transactionSync) return db.transactionSync(callback);
  db.exec('BEGIN IMMEDIATE');
  try { const result=callback(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
