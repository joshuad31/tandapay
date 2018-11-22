pragma solidity ^0.4.23;

/**
* @title ITandaPayLedgerInfo 
* @dev TandaPayLedgerInfo interface
*/
contract ITandaPayLedgerInfo {
	function getTandaGroupCountForSecretary(address _secretary) public view returns(uint count);
	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view returns(uint groupID);
	function getTandaGroupCount() public view returns(uint count);
	function getTandaGroupID(uint _index) public view returns(uint groupID);
	
	enum PolicyholderStatus {
		PremiumUnpaid,
		PremiumPaid,
		OpenedClaim
	}

	enum PolicyholderClaimStatus {
		Loyalist,
		Defector
	}

	enum SubperiodType {
		PrePeriod,		// 3 days
		ActivePeriod,	// 30 days
		PostPeriod		// 3 days
	}

	enum ClaimState {
		Opened,			// no post-period is running currently
		Finalizing,		// post-perdiod is currently running
		Paid,
		Rejected
	}

// Info:

	/**
	* @dev Get the group basic info that is set in constructor
	* @notice This info should never change after group is created
	* @param _groupID Selected group ID
	*/
	function getGroupInfo(uint _groupID) public view 
		returns(address secretary, uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai); 
	
	/**
	* @dev Get the group info
	* @param _groupID Selected group ID
	*/
	function getGroupInfo2(uint _groupID) public view 
		returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai); 

	/**
	* @dev Get the sub-group info
	* @param _groupID Selected group ID
	* @param _subgroupIndex Selected subgroup index
	*/
	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view 
		returns(uint policyholdersCount, address[] policyholders);

	/**
	* @dev Get the policyholder Info
	* @notice If no subgroup change is requested -> currentSubgroupIndex==nextSubgroupIndex
	* @param _groupID Selected group ID
	* @param _policyholder Selected policyholder address
	*/
	function getPolicyholderInfo(uint _groupID, address _policyholder) public view 
		returns(uint currentSubgroupIndex, uint nextSubgroupIndex, PolicyholderStatus status);

	/**
	* @dev Get the amount that should be paid by a policyholder for the current period 
	* @notice If policyholder has already paid -> will return 0
	* @notice Only callable during the pre-period
	* @param _groupID Selected group ID
	* @param _policyholder Selected policyholder address
	*/
	function getAmountToPay(uint _groupID, address _policyholder) public view 
		returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai);

	/**
	* @dev Get the current period info
	* @param _groupID Selected group ID
	*/
	function getCurrentPeriodInfo(uint _groupID) public view 
		returns(uint periodIndex, SubperiodType subperiodType);

	/**
	* @dev Get the current claim count 
	* @notice Only callable during active period and post-period
	* @param _groupID Selected group ID
	* @param _periodIndex Selected period index
	*/
	function getClaimCount(uint _groupID, uint _periodIndex) public view 
		returns(uint countOut);

	/**
	* @dev Get the claim info
	* @notice Only callable during active period and post-period
	* @param _groupID Selected group ID
	* @param _periodIndex Selected period index
	* @param _claimIndex Selected claim index
	*
	* If claim is still not finalized -> claimAmountDai = (_premiumCostDai * group count) / numberOfOpenClaims
	* (but never more than _maxClaimDai)
	* 		
	* If claim is finalized and approved -> claimAmountDai (_premiumCostDai * group count) / numberOfAprovedClaims
	* (but never more than _maxClaimDai)
	*	
	* If claim is finalized and rejected -> claimAmountDai is ZERO
	*/
	function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view 
		returns(address claimant, ClaimState claimState, uint claimAmountDai);

	// TODO: add payout history to the method
	function getClaimInfo2(uint _groupID, uint _periodIndex) public view 
		returns(address[] loyalists, address[] defectors);
}
