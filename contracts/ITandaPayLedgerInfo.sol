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
	// this should never change after group is created
	function getGroupInfo(uint _groupID) public view 
		returns(address secretary, uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai); 
	
	function getGroupInfo2(uint _groupID) public view 
		returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai); 
	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view 
		returns(uint policyholdersCount, address[] policyholders);
	function getPolicyholderInfo(uint _groupID, address _policyholder) public view 
		returns(uint8 currentSubgroupIndex, uint8 nextSubgroupIndex, PolicyholderStatus status);

	// only during the pre-period
	function getAmountToPay(uint _groupID, address _policyholder) public view 
		returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai);
	function getCurrentPeriodInfo(uint _groupID) public view 
		returns(uint8 periodIndex, SubperiodType subperiodType);

	// only during active period and post-period
	function getClaimCount(uint _groupID, uint _periodIndex) public view 
		returns(uint countOut);

	// only during active period and post-period
	// If claim is still not finalized -> claimAmountDai = (_premiumCostDai * group count) / numberOfOpenClaims
	// (but never more than _maxClaimDai)
	// 		
	// If claim is finalized and approved -> claimAmountDai (_premiumCostDai * group count) / numberOfAprovedClaims
	// (but never more than _maxClaimDai)
	//
	// If claim is finalized and rejected -> claimAmountDai is ZERO
	function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view 
		returns(address claimant, ClaimState claimState, uint claimAmountDai);

	// TODO: add payout history to the method
	function getClaimInfo2(uint _groupID, uint _periodIndex) public view 
		returns(address[] loyalists, address[] defectors);
}
