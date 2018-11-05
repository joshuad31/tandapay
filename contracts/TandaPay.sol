pragma solidity ^0.4.23;


interface ITandaPayLedger {
// Backend:
	function transferBackendAccount(address _newAccount)public onlyByBackend;
	function transferCronAccount(address _newAccount)public onlyByBackend;

	function getTandaGroupCountForSecretary(address _secretary) public view onlyByBackend returns(uint);
	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view onlyByBackend returns(uint);
	function getTandaGroupCount() public view onlyByBackend returns(uint);
	function getTandaGroupID(uint _index) public view onlyByBackend returns(uint);

	// TODO:
	//function getTandaGroupInfo(uint _groupID) public view returns(???);

	function createNewTandaGroup(
		address[] _policyholders,
		uint8[] _policyholderSubgroups,
		uint _monthToRepayTheLoan, 
		uint _premiumCostDai,
		uint _maxClaimDai) public onlyByBackend returns(uint groupID);

	function approveClaim(
		uint _groupID, 
		address _claimantAddress) public onlyByBackend returns(uint claimID);

// Policyholder:
	function commitPremium(
		uint _groupID, 
		uint _amountDai) public;

	function addChangeSubgroupRequest(
		uint _groupID, 
		//uint _oldSubgroupID, 
		uint _newSubgroupID) public;

	function finalizeClaim(
		uint _groupID, 
		uint _claimID,
		bool _loyalist) public;

// CRON:
	function processGroup(uint _groupID) public onlyByCron;
}


///////////////////////////////////////////////
// TODO:
contract TandaPayLedger is ITandaPayLedger {

}
