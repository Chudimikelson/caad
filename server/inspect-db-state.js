require("dotenv").config();
const mongoose = require("mongoose");

async function summarizeDb(name) {
  const db = mongoose.connection.client.db(name);
  const collections = await db.listCollections().toArray();
  const users = collections.some((c) => c.name === "users") ? await db.collection("users").countDocuments() : 0;
  const loans = collections.some((c) => c.name === "loans") ? await db.collection("loans").countDocuments() : 0;
  const repayments = collections.some((c) => c.name === "repayments") ? await db.collection("repayments").countDocuments() : 0;
  return { name, collections: collections.map((c) => c.name), users, loans, repayments };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const activeDbName = mongoose.connection.name;
  const activeSummary = await summarizeDb(activeDbName);
  const caadSummary = activeDbName === "caad" ? activeSummary : await summarizeDb("caad");
  const testSummary = activeDbName === "test" ? activeSummary : await summarizeDb("test");
  console.log(JSON.stringify({ activeDbName, activeSummary, caadSummary, testSummary }, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
