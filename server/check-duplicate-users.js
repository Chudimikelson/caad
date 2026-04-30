require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection("users");
  const duplicates = await users
    .aggregate([
      {
        $group: {
          _id: "$email",
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  console.log(JSON.stringify(duplicates, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
