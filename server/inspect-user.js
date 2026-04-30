require("dotenv").config();
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection("users");
  const email = "osellezino@gmail.com";
  const user = await users.findOne({ email });

  if (!user) {
    console.log(JSON.stringify({ exists: false }, null, 2));
    await mongoose.disconnect();
    return;
  }

  const passwordMatches = await bcryptjs.compare("blackgene", user.password || "");

  console.log(
    JSON.stringify(
      {
        exists: true,
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        hasPasswordHash: Boolean(user.password),
        passwordMatches,
        createdAt: user.createdAt,
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
