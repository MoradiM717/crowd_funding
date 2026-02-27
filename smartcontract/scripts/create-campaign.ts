import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
    
    
    const factoryAddress = process.env.FACTORY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    
    const creatorPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const creator = new ethers.Wallet(creatorPrivateKey, provider);

    console.log("Creating campaign with creator:", creator.address);

    
    const CampaignFactoryArtifact = await hre.artifacts.readArtifact("CampaignFactory");
    const factory = new ethers.Contract(
        factoryAddress,
        CampaignFactoryArtifact.abi,
        creator
    );

    
    const goal = ethers.parseEther("5"); 
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 7); 
    const cid = `QmTestCampaign2${Date.now()}`; 

    console.log("\nCampaign Parameters:");
    console.log("  Goal:", ethers.formatEther(goal), "ETH");
    console.log("  Deadline:", new Date(Number(deadline) * 1000).toLocaleString());
    console.log("  CID:", cid);

    
    const tx = await factory.createCampaign(goal, deadline, cid);
    console.log("\nTransaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    
    const iface = new ethers.Interface(CampaignFactoryArtifact.abi);
    const campaignCreatedEvent = receipt.logs.find(
        (log: any) => {
            try {
                const parsed = iface.parseLog(log);
                return parsed?.name === "CampaignCreated";
            } catch {
                return false;
            }
        }
    );

    if (campaignCreatedEvent) {
        const parsed = iface.parseLog(campaignCreatedEvent);
        const campaignAddress = parsed?.args[1];
        console.log("\n✅ Campaign created successfully!");
        console.log("Campaign address:", campaignAddress);
        console.log("\nThe indexer should pick this up automatically.");
    } else {
        console.log("\n⚠️  CampaignCreated event not found in receipt");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

