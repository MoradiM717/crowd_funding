
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract Campaign is ReentrancyGuard {
    
    error InvalidDonation();
    error CampaignClosed();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error GoalNotMet();
    error GoalMet();
    error NotCreator();
    error AlreadyWithdrawn();
    error NoContribution();
    error AlreadyRefunded();

    
    address public immutable creator;
    uint256 public immutable goal;
    uint256 public immutable deadline;
    string public cid;

    
    uint256 public totalRaised;
    bool public withdrawn;
    mapping(address => uint256) public contributions;
    mapping(address => bool) public refunded;

    
    event DonationReceived(
        address indexed campaign,
        address indexed donor,
        uint256 amount,
        uint256 newTotalRaised,
        uint256 timestamp
    );

    event Withdrawn(
        address indexed campaign,
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    event Refunded(
        address indexed campaign,
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    
    constructor(
        address _creator,
        uint256 _goal,
        uint256 _deadline,
        string memory _cid
    ) {
        creator = _creator;
        goal = _goal;
        deadline = _deadline;
        cid = _cid;
    }

    
    function donate() external payable nonReentrant {
        
        if (msg.value == 0) revert InvalidDonation();
        if (block.timestamp >= deadline) revert DeadlinePassed();
        if (withdrawn) revert CampaignClosed();

        
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        
        emit DonationReceived(
            address(this),
            msg.sender,
            msg.value,
            totalRaised,
            block.timestamp
        );
    }

    
    function withdraw() external nonReentrant {
        
        if (msg.sender != creator) revert NotCreator();
        if (totalRaised < goal) revert GoalNotMet();
        if (withdrawn) revert AlreadyWithdrawn();

        
        withdrawn = true;
        uint256 amount = address(this).balance;

        
        (bool success, ) = creator.call{value: amount}("");
        require(success, "Withdrawal failed");

        
        emit Withdrawn(address(this), creator, amount, block.timestamp);
    }

    
    function refund() external nonReentrant {
        
        if (block.timestamp < deadline) revert DeadlineNotPassed();
        if (totalRaised >= goal) revert GoalMet();
        if (contributions[msg.sender] == 0) revert NoContribution();
        if (refunded[msg.sender]) revert AlreadyRefunded();

        
        uint256 amount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        refunded[msg.sender] = true;

        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Refund failed");

        
        emit Refunded(address(this), msg.sender, amount, block.timestamp);
    }

    
    function getSummary()
        external
        view
        returns (
            address _creator,
            uint256 _goal,
            uint256 _deadline,
            uint256 _totalRaised,
            bool _withdrawn,
            string memory _cid
        )
    {
        return (creator, goal, deadline, totalRaised, withdrawn, cid);
    }

    
    function contributionOf(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    
    function isActive() external view returns (bool) {
        return block.timestamp < deadline && !withdrawn;
    }

    
    function isSuccessful() external view returns (bool) {
        return totalRaised >= goal;
    }

    
    function isFailed() external view returns (bool) {
        return block.timestamp >= deadline && totalRaised < goal;
    }
}

