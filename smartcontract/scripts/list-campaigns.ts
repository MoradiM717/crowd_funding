import hre from "hardhat";
import { ethers } from "ethers";


async function main() {
    const factoryAddress = process.env.FACTORY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    console.log("Listing campaigns from factory:", factoryAddress);

    
    const CampaignFactoryArtifact = await hre.artifacts.readArtifact("CampaignFactory");
    const CampaignArtifact = await hre.artifacts.readArtifact("Campaign");
    const factory = new ethers.Contract(factoryAddress, CampaignFactoryArtifact.abi, provider);

    
    const campaigns = await factory.getCampaigns();
    const count = await factory.getCampaignCount();

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("                   ALL CAMPAIGNS (" + count.toString() + ")");
    console.log("═══════════════════════════════════════════════════════════");

    if (campaigns.length === 0) {
        console.log("\nNo campaigns found.");
        console.log("\nCreate one with:");
        console.log(`  FACTORY_ADDRESS=${factoryAddress} npx hardhat run scripts/create-campaign.ts --network localhost`);
        return;
    }

    for (let i = 0; i < campaigns.length; i++) {
        const campaignAddress = campaigns[i];
        const campaign = new ethers.Contract(campaignAddress, CampaignArtifact.abi, provider);

        const summary = await campaign.getSummary();
        const isActive = await campaign.isActive();
        const isSuccessful = await campaign.isSuccessful();
        const isFailed = await campaign.isFailed();

        
        let status = "";
        if (summary._withdrawn) {
            status = "🏆 WITHDRAWN";
        } else if (isFailed) {
            status = "💔 FAILED";
        } else if (isSuccessful) {
            status = "🎉 SUCCESSFUL";
        } else if (isActive) {
            status = "🔥 ACTIVE";
        } else {
            status = "⏳ PENDING";
        }

        console.log(`\n[${i + 1}] ${status}`);
        console.log(`    Address: ${campaignAddress}`);
        console.log(`    Creator: ${summary._creator}`);
        console.log(`    Goal: ${ethers.formatEther(summary._goal)} ETH`);
        console.log(`    Raised: ${ethers.formatEther(summary._totalRaised)} ETH (${((Number(summary._totalRaised) / Number(summary._goal)) * 100).toFixed(1)}%)`);
        console.log(`    Deadline: ${new Date(Number(summary._deadline) * 1000).toLocaleString()}`);
        console.log(`    CID: ${summary._cid}`);
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("\n📝 COMMANDS:");
    console.log("\nView details:");
    console.log("  CAMPAIGN_ADDRESS=<address> npx hardhat run scripts/campaign-info.ts --network localhost");
    console.log("\nDonate:");
    console.log("  CAMPAIGN_ADDRESS=<address> npx hardhat run scripts/donate.ts --network localhost");
    console.log("\nWithdraw (creator, if successful):");
    console.log("  CAMPAIGN_ADDRESS=<address> npx hardhat run scripts/withdraw.ts --network localhost");
    console.log("\nRefund (donor, if failed):");
    console.log("  CAMPAIGN_ADDRESS=<address> npx hardhat run scripts/refund.ts --network localhost");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
