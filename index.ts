import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const accountAddress = process.env.ACCOUNT_ADDRESS || "";
const rpcUrl = "https://api.mainnet-beta.solana.com";

async function monitorAccount() {
  const connection = new Connection(rpcUrl, "confirmed");

  const accountPublicKey = new PublicKey(accountAddress);
  const accountInfo = await connection.getAccountInfo(accountPublicKey);
  const accountKeypair = Keypair.fromSeed(
    Buffer.from(process.env.ACCOUNT_SECRET_KEY || "", "base64")
  );

  if (accountInfo === null) {
    console.log("Account not found");
    return;
  }

  let previousBalance = accountInfo.lamports;

  while (true) {
    const updatedAccountInfo = await connection.getAccountInfo(
      accountPublicKey
    );
    const currentBalance = updatedAccountInfo?.lamports || 0;

    if (currentBalance > previousBalance) {
      const depositAmount = currentBalance - previousBalance;
      console.log(
        `Incoming deposit detected! From: ${accountAddress}, Amount: ${depositAmount} lamports`
      );

      // send the amount to another account
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: accountPublicKey,
          toPubkey: new PublicKey(process.env.HOLDER_ADDRESS || ""),
          lamports: depositAmount,
        })
      );
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [accountKeypair]
      );
      console.log("Transaction sent with signature", signature);
    }

    previousBalance = currentBalance;

    // Wait for 0.5 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

monitorAccount().catch((error) => {
  console.error("An error occurred:", error);
});
