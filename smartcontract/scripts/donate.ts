import hre from "hardhat";
import { ethers } from "ethers";


async function main() {
    const campaignAddress = process.env.CAMPAIGN_ADDRESS;
    if (!campaignAddress) {
        console.error("❌ Error: CAMPAIGN_ADDRESS environment variable is required");
        console.log("\nUsage: CAMPAIGN_ADDRESS=0x... npx hardhat run scripts/donate.ts --network localhost");
        process.exit(1);
    }

    
    const amountEth = process.env.AMOUNT || "1";

    
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    
    const donorPrivateKey = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
    const donor = new ethers.Wallet(donorPrivateKey, provider);

    console.log("Donating to campaign:", campaignAddress);
    console.log("Donor:", donor.address);
    console.log("Amount:", amountEth, "ETH");

    
    const CampaignArtifact = await hre.artifacts.readArtifact("Campaign");
    const campaign = new ethers.Contract(campaignAddress, CampaignArtifact.abi, donor);

    
    const summaryBefore = await campaign.getSummary();
    console.log("\n📊 Campaign before donation:");
    console.log("  Goal:", ethers.formatEther(summaryBefore._goal), "ETH");
    console.log("  Total Raised:", ethers.formatEther(summaryBefore._totalRaised), "ETH");
    console.log("  Deadline:", new Date(Number(summaryBefore._deadline) * 1000).toLocaleString());

    
    const tx = await campaign.donate({ value: ethers.parseEther(amountEth) });
    console.log("\n📤 Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    
    const iface = new ethers.Interface(CampaignArtifact.abi);
    const donationEvent = receipt.logs.find((log: any) => {
        try {
            const parsed = iface.parseLog(log);
            return parsed?.name === "DonationReceived";
        } catch {
            return false;
        }
    });

    if (donationEvent) {
        const parsed = iface.parseLog(donationEvent);
        console.log("\n🎉 DonationReceived event emitted!");
        console.log("  Campaign:", parsed?.args[0]);
        console.log("  Donor:", parsed?.args[1]);
        console.log("  Amount:", ethers.formatEther(parsed?.args[2]), "ETH");
        console.log("  New Total Raised:", ethers.formatEther(parsed?.args[3]), "ETH");
    }

    
    const summaryAfter = await campaign.getSummary();
    const isSuccessful = await campaign.isSuccessful();
    console.log("\n📊 Campaign after donation:");
    console.log("  Total Raised:", ethers.formatEther(summaryAfter._totalRaised), "ETH");
    console.log("  Goal Met:", isSuccessful ? "✅ YES" : "❌ NO");
    console.log("\n💡 The indexer should pick up the DonationReceived event automatically.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
