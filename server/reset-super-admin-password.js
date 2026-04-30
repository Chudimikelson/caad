require("dotenv").config();
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection("users");

  const email = "osellezino@gmail.com";
  const password = "blackgene";
  const passwordHash = await bcryptjs.hash(password, 10);

  const result = await users.updateOne(
    { email },
    { $set: { password: passwordHash } }
  );

  console.log(
    JSON.stringify(
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        email,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
