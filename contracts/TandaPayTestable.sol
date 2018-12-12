pragma solidity ^0.4.23;

import "./ITandaPayLedger.sol";
import "./ITandaPayLedgerInfo.sol";

import "./DaiContract.sol";
import "./TandaPay.sol";

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract TandaPayLedgerTestable is TandaPayLedger {

	constructor(address _daiContractAddress, address _backendAccount, address _cronAccount) public 
		TandaPayLedger(_daiContractAddress, _backendAccount, _cronAccount){}

	function getPeriodNumber(uint _groupID) public view onlyValidGroupId(_groupID) returns(uint number) {
		return super._getPeriodNumber(_groupID);
	}

	function getPolicyHolderNumber(uint _groupID, address _addr) public view onlyValidGroupId(_groupID) returns(uint) {
		return super._getPolicyHolderNumber(_groupID, _addr);
	}

	function getSubgroupsCount(uint _groupID) public view onlyValidGroupId(_groupID) returns(uint maximum) {
		return super._getSubgroupsCount(_groupID);
	}

	function getSubgroupMembersCount(uint _groupID, uint _subGroupId) public view onlyValidGroupId(_groupID) returns(uint count){
		return super._getSubgroupMembersCount(_groupID,  _subGroupId);
	}

	function getSubperiodType(uint _groupID, uint _periodNumber) public view onlyValidGroupId(_groupID) returns(SubperiodType) {
		return super._getSubperiodType(_groupID,  _periodNumber);
	}

	function getPremiumToPay(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) zeroIfPremium(_groupID, _phAddress) returns(uint) {
		return super._getPremiumToPay(_groupID,  _phAddress);
	}

	function getOverpaymentToPay(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) zeroIfPremium(_groupID, _phAddress) returns(uint) {	
		return super._getOverpaymentToPay(_groupID,  _phAddress);
	}

	function getLoanRepaymentToPay(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) zeroIfPremium(_groupID, _phAddress) returns(uint) {
		return super._getLoanRepaymentToPay(_groupID,  _phAddress);
	}

	function getPremium(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint) {
		return super._getPremium(_groupID,  _phAddress);
	}

	function getOverpayment(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint) {	
		return super._getOverpayment(_groupID,  _phAddress);
	}

	function getLoanRepayment(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint) {	
		return super._getLoanRepayment(_groupID,  _phAddress);
	}

	function getCurrentSubgroupOverpayment(uint _subgroupMembersCount) public view returns(uint) {
		return super._getCurrentSubgroupOverpayment(_subgroupMembersCount);
	}

	function getPolicyHolderStatus(uint _groupID, address _phAddress) public view onlyValidGroupId(_groupID) returns(PolicyholderStatus) {
		return super._getPolicyHolderStatus(_groupID,  _phAddress);
	}

	function isPolicyholderVoted(uint _groupID, uint _periodIndex, address _phAddress)	public view onlyValidGroupId(_groupID) returns(bool isIt) {
		return super._isPolicyholderVoted(_groupID,  _periodIndex,  _phAddress);
	}

	function isPolicyholderHaveClaim(uint _groupID, uint _periodIndex, address _phAddress) public view onlyValidGroupId(_groupID) returns(bool isIt) {	
		return super._isPolicyholderHaveClaim(_groupID,  _periodIndex,  _phAddress);
	}

	function getTandaGroupArrayForSecretary(address _secretary) public view returns(uint[]) {
		return super._getTandaGroupArrayForSecretary(_secretary);
	}

	function sendClaim(uint _groupID, uint _periodIndex, uint _claimIndex) public correctParams(_groupID, _periodIndex, _claimIndex) {
		return super._sendClaim(_groupID,  _periodIndex,  _claimIndex);
	}

	function isClaimRejected(uint _groupID, uint _periodIndex, uint _claimIndex) public correctParams(_groupID, _periodIndex, _claimIndex) view returns(bool isIt) {
		return super._isClaimRejected(_groupID,  _periodIndex,  _claimIndex);
	}

	function getClaimAmount(uint _groupID, uint _periodIndex, uint _claimIndex) public correctParams(_groupID, _periodIndex, _claimIndex) view returns(uint) {
		return super._getClaimAmount(_groupID,  _periodIndex,  _claimIndex);
	}

	function getClaimState(uint _groupID, uint _periodIndex, uint _claimIndex) public correctParams(_groupID, _periodIndex, _claimIndex) view returns(ClaimState) {
		return super._getClaimState(_groupID,  _periodIndex,  _claimIndex);
	}
}