pragma solidity ^0.4.23;

/**
 * @title ITandaPayLedger 
 * @dev Main TandaPay contract that keeps track of all groups
 */
contract ITandaPayLedger {
	uint public GROUP_SIZE_AT_CREATION_MIN = 50;
	uint public GROUP_SIZE_AT_CREATION_MAX = 55;
	uint8 public MONTH_TO_REPAY_LOAN_MIN = 3;
	uint8 public MONTH_TO_REPAY_LOAN_MAX = 255;

	// Backend:
	function transferBackendAccount(address _newAccount)public onlyByBackend;
	function transferCronAccount(address _newAccount)public onlyByBackend;

	function getTandaGroupCountForSecretary(address _secretary) public view returns(uint);
	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view returns(uint);
	function getTandaGroupCount() public view returns(uint);
	function getTandaGroupID(uint _index) public view returns(uint);

	// TODO:
	//function getTandaGroupInfo(uint _groupID) public view returns(???);

	/**
	 * @dev Create new Group and start the first period automatically.
	 * @param _policyholders Array of all policyholder addresses;
	 * Min size is GROUP_SIZE_AT_CREATION_MIN; Max size is GROUP_SIZE_AT_CREATION_MAX.
	 * @param _policyholderSubgroups Array of subgroup indexes for each policyholders from _policyholders array.
	 * @param _monthToRepayTheLoan Max is MONTH_TO_REPAY_LOAN_MAX; Min is MONTH_TO_REPAY_LOAN_MIN.
	 * @param _premiumCostDai Specified in Wei, 1 DAI is 10^18.
	 * @param _maxClaimDai Specified in Wei, 1 DAI is 10^18.
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
	 * Claimant can’t open more that 1 claim at once.
	 * @param _groupID Selected group ID.
	 * @param _claimantAddress This address will receive claim payout. 
	 * @return claimID New claim ID.
	 */
	function addClaim(
		uint _groupID, 
		address _claimantAddress) public onlyByBackend returns(uint claimID);

	// Policyholder:
	/**
	 * @dev Commit premium. Called by policyholder after DAIs are transferred from wallet to current smart contract.
	 * 1. Policyholder address is valid (current group/subgroup)
	 * 2. Policyholder allowed smart contract to withdraw correct amount of
	 * DAIs (approve/allow) - see “Calculating the Individual Loan Payment value”, i.e: $37.5)
	 * 3. Group is in the pre-period state (72 hours)
	 * 4. Subgroup has >=5 members and <=7 members
	 * 5. User hasn’t paid before
	 * 6. User is a member of the selected Subgroup
	 * @param _groupID Selected group ID.
	 * @param _amountDai Amount of commited to the current contract ERC20 DAIs.
	 */
	function commitPremium(
		uint _groupID, 
		uint _amountDai) public onlyByPolicyholder(_groupID);

	/**
	* @dev If policyholder wants to change the group -> should call this.
	* Preconditions:
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
	* @dev Finalize the opened claim by selecting either Loyalist or Defector option.
  * When post-period ends -> claimant will received money if allowed.
	* Preconditions:
  * 1. Policyholder address is valid (current group/subgroup).
	* 2. Group is in post-period state.
	* 3. User hasn’t selected loyalist/defector option before (for that claim).
  * 4. Claim ID is valid.
	* @param _groupID Selected group ID.
  */
	function finalizeClaim(
		uint _groupID, 
		uint _claimID,
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


///////////////////////////////////////////////
// TODO:
contract TandaPayLedger is ITandaPayLedger {

}
