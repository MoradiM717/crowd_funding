
pragma solidity ^0.8.20;

import "./Campaign.sol";


contract CampaignFactory {
    
    error InvalidGoal();
    error InvalidDeadline();
    error InvalidCID();

    
    Campaign[] public campaigns;
    mapping(address => Campaign[]) public campaignsByCreator;

    
    event CampaignCreated(
        address indexed factory,
        address indexed campaign,
        address indexed creator,
        uint256 goal,
        uint256 deadline,
        string cid
    );

    
    function createCampaign(
        uint256 goal,
        uint256 deadline,
        string memory cid
    ) external returns (Campaign) {
        
        if (goal == 0) revert InvalidGoal();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (bytes(cid).length == 0) revert InvalidCID();

        
        Campaign newCampaign = new Campaign(
            msg.sender,
            goal,
            deadline,
            cid
        );

        
        campaigns.push(newCampaign);
        campaignsByCreator[msg.sender].push(newCampaign);

        
        emit CampaignCreated(
            address(this),
            address(newCampaign),
            msg.sender,
            goal,
            deadline,
            cid
        );

        return newCampaign;
    }

    
    function getCampaigns() external view returns (Campaign[] memory) {
        return campaigns;
    }

    
    function getCampaignsByCreator(
        address creator
    ) external view returns (Campaign[] memory) {
        return campaignsByCreator[creator];
    }

    
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}

