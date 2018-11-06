pragma solidity ^0.4.23;

// TODO: still not ready
contract ITandaPayLedgerInfo {
	function getTandaGroupCountForSecretary(address _secretary) public view returns(uint count);
	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view returns(uint groupID);
	function getTandaGroupCount() public view returns(uint count);
	function getTandaGroupID(uint _index) public view returns(uint groupID);
	
	enum PolicyholderStatus {
		PremiumUnpaid,
		PremiumPaid,
		OpenedClaim,
		Loyalist,
		Defector
	};

	enum SubperiodType {
		PrePeriod,		// 3 days
		ActivePeriod, // 30 days
		PostPeriod,		// 3 days
	};

// Info:
	function getGroupInfo(uint _groupID) public view 
		returns(uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai); 

	// premiumsTotalDai = total premiums + overpayment by this group
	function getGroupInfo2(uint _groupID) public view 
		returns(uint premiumsTotalDai, uint loanRepaymentTotalDai); 
	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view 
		returns(uint policyholdersCount, address[] policyholders);

	function getPolicyholderInfo(uint _groupID, address _policyholder) public view 
		returns(uint8 currentSubgroupIndex, uint8 nextSubgroupIndex, PolicyholderStatus status);

	// only during the pre-period
	function getAmountToPay(uint _groupID, address _policyholder) public view 
		returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai);

	function getCurrentPeriod(uint _groupID) public view 
		returns(uint8 periodIndex, SubperiodType subperiodType);

	// TODO: not needed?
	//function getCurrentSubperiodInfo(uint _groupID) public view 
  //  returns();


}
