pragma solidity ^0.4.23;

/**
* @title ITandaPayLedger 
* @dev Main TandaPayLedger interface
*/
contract ITandaPayLedger {
	modifier onlyByBackend() {
		// TODO:
		_; 
	}

	modifier onlyByPolicyholder(uint groupID){
		// TODO:
		_;
	}

	uint public GROUP_SIZE_AT_CREATION_MIN = 50;
	uint public GROUP_SIZE_AT_CREATION_MAX = 55;
	uint8 public MONTH_TO_REPAY_LOAN_MIN = 3;
	uint8 public MONTH_TO_REPAY_LOAN_MAX = 255;

// Backend:
	function transferBackendAccount(address _newAccount) public onlyByBackend;
	function transferCronAccount(address _newAccount) public onlyByBackend;

	/**
	* @dev Create new Group and start the first period automatically.
	* @param _policyholders Array of all policyholder addresses;
	* Min size is GROUP_SIZE_AT_CREATION_MIN; Max size is GROUP_SIZE_AT_CREATION_MAX.
	* @param _policyholderSubgroups Array of subgroup indexes for each policyholders from _policyholders array.
	* @param _monthToRepayTheLoan Max is MONTH_TO_REPAY_LOAN_MAX; Min is MONTH_TO_REPAY_LOAN_MIN.
	* @param _premiumCostDai Specified in Wei, 1 DAI is 10^18. Example: $20
	* @param _maxClaimDai Specified in Wei, 1 DAI is 10^18. Example: $500. _maxClaimDai<=(_premiumCostDai * group count) 
	* @return groupID New group ID.
	*/
	function createNewTandaGroup(
		address[] _policyholders,
		uint8[] _policyholderSubgroups,
		uint _monthToRepayTheLoan, 
		uint _premiumCostDai,
		uint _maxClaimDai) public onlyByBackend returns(uint groupID);

	/**
	* @dev Add new claim. The claim amount will be automatically calculated.
	* @notice Preconditions:
	* 1. Claimant can’t open more that 1 claim at once
	* 2. Claimant (policyholder) address is valid (current group/subgroup)
	* 3. Group is in the active state
	* 4. Claimant paid premium before (pre-period)
	* @param _groupID Selected group ID.
	* @param _claimantAddress This address will receive claim payout. 
	* @return claimIndex New claim Index.
	*/
	function addClaim(
		uint _groupID, 
		address _claimantAddress) public onlyByBackend returns(uint claimIndex);
	
	/**
	* @dev Remove policyholder from the group
	* @notice Preconditions:
	* 1. Policyholder address is valid (current group/subgroup)
	* 2. Policyholder didn’t pay premium in the current period
	* 3. Group is in the pre-period (3 dys) or in active state (30 days)
	* @param _groupID Selected group ID.
	* @param _policyholder Policyholder address.
	*/
	function removePolicyholderFromGroup(
		uint _groupID,
		address _policyholder) public onlyByBackend;

// Policyholder:
	/**
	* @dev Commit premium. Called by policyholder after DAIs are transferred from wallet to current smart contract.
	* @notice Preconditions:
	* 1. Policyholder address is valid (current group/subgroup)
	* 2. Policyholder allowed smart contract to withdraw correct amount of
	* DAIs (approve/allow) - see “Calculating the Individual Loan Payment value”, i.e: $37.5)
	* 3. Group is in the pre-period state (72 hours)
	* 4. User hasn’t paid before
	* 5. The _amountDai is correct (should be equal to getAmountToPay())
	* @param _groupID Selected group ID.
	* @param _amountDai Amount of commited to the current contract ERC20 DAIs.
	*/
	function commitPremium(
		uint _groupID, 
		uint _amountDai) public onlyByPolicyholder(_groupID);

	/**
	* @dev If policyholder wants to change the group -> should call this.
	* The subgroup will be changed automatically when the 27 days of active period ends.
	* @notice Preconditions:
	* 1. Policyholder address is valid (current group/subgroup)
	* 2. Group is in the active state (first 27 days only!)
	* 3. User has no open claims
	* 4. User has no open subgroup requests
	* @param _groupID Selected group ID.
	* @param _newSubgroupID New subgroup ID.
	*/
	function addChangeSubgroupRequest(
		uint _groupID, 
		uint _newSubgroupID) public onlyByPolicyholder(_groupID);

	/**
	* @dev Finalize all opened claims by selecting either Loyalist or Defector option.
	* When post-period ends -> claimants will received money if allowed.
	* @notice Preconditions:
	* 1. Policyholder address is valid (current group/subgroup).
	* 2. Group is in post-period state.
	* 3. User hasn’t selected loyalist/defector option before.
	* 4. User hasn’t opened claim in this period (in this case he is loyalist by default)
	* 5. Claim ID is valid.
	* @param _groupID Selected group ID.
	*/
	function finalizeClaims(
		uint _groupID, 
		bool _loyalist) public onlyByPolicyholder(_groupID);

	/**
	* @dev Change the current group state (move periods, do payments, change subgroups, etc)
	* @notice This method should be called automatically by each non-view method (that changes the state)
	* to make sure current group is in actual state.
	*
	* All read-only methods should RETURN actual state (as if processGroup() was called PRIOR to the call)
	* @param _groupID Selected group ID.
	*/
	function processGroup(uint _groupID) public;
}
