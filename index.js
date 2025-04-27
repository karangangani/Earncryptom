import express from "express";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Alchemy client
const client = createPublicClient({
  chain: bsc,
  transport: http(process.env.ALCHEMY_API_URL),
});

// Main wallet address
const ownerWalletAddress = process.env.OWNER_WALLET;

// User balances (example basic system, later use database)
const userBalances = {};

// Endpoint to check deposit
app.post("/check-deposit", async (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ message: "Missing userId or username" });
  }

  try {
    const latestBlock = await client.getBlockNumber();
    const block = await client.getBlock({ blockNumber: latestBlock });

    const transactions = block.transactions;

    let userDeposit = 0;

    for (const txHash of transactions) {
      const tx = await client.getTransaction({ hash: txHash });

      if (tx.to?.toLowerCase() === ownerWalletAddress.toLowerCase()) {
        const valueInBNB = Number(tx.value) / 1e18;
        console.log(`User deposited ${valueInBNB} BNB`);

        userDeposit += valueInBNB;
      }
    }

    if (userDeposit > 0) {
      // 1 USDT = 10 coins
      const coins = userDeposit * 10;
      userBalances[userId] = (userBalances[userId] || 0) + coins;

      return res.json({
        message: `Deposit successful! ${coins} coins added.`,
        coins: userBalances[userId],
      });
    } else {
      return res.json({ message: "No deposit found yet." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

// Endpoint to get user balance
app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;
  const balance = userBalances[userId] || 0;
  res.json({ coins: balance });
});

// Home route
app.get("/", (req, res) => {
  res.send("USDT Deposit System running!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
