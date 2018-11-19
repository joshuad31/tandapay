pragma solidity ^0.4.23;

import "./ITandaPayLedger.sol";
import "./ITandaPayLedgerInfo.sol";

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract TandaPayLedger is ITandaPayLedgerInfo, ITandaPayLedger {
	DaiContract public daiContract;

	address public backendAccount;
	address public cronAccount;
	
	modifier onlyByBackend() {
		require(msg.sender==backendAccount);
		_; 
	}

	modifier onlyByPolicyholder(uint groupID){
		require(policyHolders[msg.sender]==groupID);
		_;
	}

	constructor(address _daiContractAddress) public {
		daiContract = DaiContract(_daiContractAddress);
	}

	struct Group {
		Policyholder[] policyholders;
		address secretary;
		uint monthToRepayTheLoan;
		uint premiumCostDai;
		uint maxClaimDai;	
	}

	struct Policyholder {
		uint subgroup;
		uint nextSubgroup;
		address pcAddress;
		uint premiumBoughtAt;
	}

	struct Claim {
		address claimantAddress;
		uint createdAt;
		ClaimState claimState;
	}

	struct GroupPeriod {
		Claims[] claims;
		address[] loyalists;
		address[] defectors;
	}

	uint groupCount;
	mapping(uint=>GroupParams) groups; // groupNumber => GroupParams
	mapping(uint=>uint=>GroupPeriod) groupPeriods; // groupNumber => periodNumber => GroupPeriods

	uint public GROUP_SIZE_AT_CREATION_MIN = 50;
	uint public GROUP_SIZE_AT_CREATION_MAX = 55;
	uint8 public MONTH_TO_REPAY_LOAN_MIN = 3;
	uint8 public MONTH_TO_REPAY_LOAN_MAX = 255;

	function transferBackendAccount(address _newAccount) public onlyByBackend {
		backendAccount = _newAccount;
	}

	function transferCronAccount(address _newAccount) public onlyByBackend {
		cronAccount = _newAccount;
	}

	function createNewTandaGroup(
		address _secretary,
		address[] _phAddresss,
		uint8[] _phAddressSubgroups,
		uint _monthToRepayTheLoan, 
		uint _premiumCostDai,
		uint _maxClaimDai) public onlyByBackend returns(uint groupID) 
	{
		require(_phAddresss.length ==_phAddressSubgroups.length);
		require(_phAddresss.length <= GROUP_SIZE_AT_CREATION_MAX);
		require(_phAddresss.length >= GROUP_SIZE_AT_CREATION_MIN);
		require(_monthToRepayTheLoan >= MONTH_TO_REPAY_LOAN_MIN);
		require(_monthToRepayTheLoan <= MONTH_TO_REPAY_LOAN_MAX);

		require(_premiumCostDai > 0);
		require(_maxClaimDai > 0);
		require( _maxClaimDai<(_premiumCostDai * _phAddresss.length) );

		Policyholder[] policyHoldersArray;

		for(uint i=0; i<_phAddresss.length; i++) {
			Policyholder pc = new Policyholder(
				_phAddressSubgroups[i], 	// subgroup;
				_phAddressSubgroups[i], 	// nextSubgroup;
				_phAddresss[i], 		  	// pcAddress;
				0 						// premiumBoughtAt;
			);

			policyHoldersArray.push(pc);
		}

		groups[groupCount] = new Group(
			policyHoldersArray,		// policyHoldersArray
			_secretary,			// secretary
			_monthToRepayTheLoan,	// monthToRepayTheLoan
			_premiumCostDai,		// premiumCostDai
			_maxClaimDai,			// maxClaimDai
			0					// claimCount
		); 
		groupCount += 1;
	}

	function _getPeriodNumber(uint _groupID); // TODO
	function _getPolicyHolderNumber(uint _groupID, address _addr); // TODO
	function _getPolicyHolder(uint _groupID, address _addr); // TODO
	function _getNeededAmount(uint _groupID); // TODO
	function _getSubgroupCount(uint _groupID); // TODO
	function _getPremiumsTotalDai(uint _groupID); // TODO
	function _getOverpaymentTotalDai(uint _groupID); // TODO
	function _getLoanRepaymentTotalDai(uint _groupID); // TODO
	function _getCurrentSubperiodType(uint _groupID); // TODO
	function _getPremiumToPay(uint _groupID, address _phAddress); // TODO
	function _getOverpaymentToPay(uint _groupID, address _phAddress); // TODO
	function _getLoanRepaymentToPay(uint _groupID, address _phAddress); // TODO

	function addClaim(uint _groupID, address _claimantAddress) public onlyByBackend returns(uint claimIndex) {
		// TODO: check no claims for that _claimantAddress
		uint period = _getPeriodNumber(_groupID);
		uint count = groupClaimsCount[_groupID][period];

		GroupPeriod[] gpArr = groupPeriods[_groupID][period];
		Claim newClaim = new Claim(
			_claimantAddress,	// claimantAddress;
			now,				// createdAt;
			ClaimState.Open	// claimState;
		);

		gpArr.claims.push(newClaim);
		groupPeriods[_groupID][period] = gpArr;
	}
	
	function removePolicyholderFromGroup(uint _groupID, address _phAddress) public onlyByBackend {
		Policyholder[] policyHoldersArray = groups[_groupID].policyholders;
		uint index = policyHoldersArray.length;
		for(uint j=0; j<policyHoldersArray.length; ++j) {
			if(policyHoldersArray[j]==_phAddress) {
				index = j;
			}
		}
		require(index<policyHoldersArray.length); // if member is not found -> exception
		if(index!=(policyHoldersArray.length - 1)) { 
			policyHoldersArray[index] = policyHoldersArray[policyHoldersArray.length-1];
		}
		delete policyHoldersArray[policyHoldersArray.length-1]; // delete last element
		policyHoldersArray.length--;

		groups[_groupID].policyholders = policyHoldersArray;
	}

	function commitPremium(uint _groupID, uint _amountDai) public onlyByPolicyholder(_groupID) {
		uint neededAmount = _getNeededAmount(_groupID);
		require(_amountDai==neededAmount);
		// TODO: require pre-period
		// TODO: get tokens
		uint pcNumber = _getPolicyHolderNumber(_groupID, msg.sender);
		Policyholder[] pcArr = groups[_groupID].policyholders;
		pcArr[pcNumber].premiumBoughtAt = now;
		groups[_groupID].policyholders = pcArr;
	}

	function addChangeSubgroupRequest(uint _groupID, uint _newSubgroupID) public onlyByPolicyholder(_groupID) {
		// TODO: requires
		uint pcNumber = _getPolicyHolderNumber(_groupID, msg.sender);
		Policyholder[] pcArr = groups[_groupID].policyholders;
		pcArr[pcNumber].nextSubgroup = _newSubgroupID;
		groups[_groupID].policyholders = pcArr;
	}

	function finalizeClaims(uint _groupID, bool _loyalist) public onlyByPolicyholder(_groupID) {
		uint period = _getPeriodNumber(_groupID);
		// TODO: check that msg.sender not voted
		if(_loyalist) {
			groupPeriods[_groupID][period].loyalists.push(msg.sender);
		} else {
			groupPeriods[_groupID][period].defectors.push(msg.sender);
		}
	}

	function processGroup(uint _groupID) public {
		// TODO
	}

	// ---------------------------------- INFO ----------------------------------

	function getTandaGroupCountForSecretary(address _secretary) public view returns(uint count) {
		for(uint i=0; i<groupCount; i++) {
			if(groups[i].secretary==_secretary) {
				count++;
			}
		}
	}

	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view returns(uint) {
		return _index;
	}

	function getTandaGroupCount() public view returns(uint count) {
		return groupCount;
	}

	function getTandaGroupID(uint _index) public view returns(uint groupID) {
		return _index;
	}

	function getGroupInfo(uint _groupID) public view returns(address secretary, uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai) {
		secretary = groups[_groupID].secretary;
		monthToRepayTheLoan = groups[_groupID].monthToRepayTheLoan;
		premiumCostDai = groups[_groupID].premiumCostDai;
		maxClaimDai = groups[_groupID].maxClaimDai;
		subgroupsTotal = _getSubgroupCount(_groupID);
	}

	function getGroupInfo2(uint _groupID) public view returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai) {
		premiumsTotalDai = _getPremiumsTotalDai(_groupID);
		overpaymentTotalDai = _getOverpaymentTotalDai(_groupID);
		premiumsTotalDai = _getLoanRepaymentTotalDai(_groupID);
	}

	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view returns(uint policyholdersCount, address[] policyholders) {
		Policyholder[] pcArr = groups[_groupID].policyholders;
		for(uint i=0; i<pcArr.length; i++) {
			if(pcArr[i].subgroup==_subgroupIndex) {
				policyholders.push(pcArr[i].pcAddress);
				policyholdersCount++;
			}
		}
	}

	function getPolicyholderInfo(uint _groupID, address _phAddress) public view returns(uint8 currentSubgroupIndex, uint8 nextSubgroupIndex, PolicyholderStatus status) {
		Policyholder pc = _getPolicyHolder(_groupID, _phAddress);
		currentSubgroupIndex = ph.subgroup;
		nextSubgroupIndex = ph.nextSubgroup;
		status = _getPolicyHolderStatus(_groupID, _phAddress)
	}

	function getAmountToPay(uint _groupID, address _phAddress) public view returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai) {
		premiumDai = _getPremiumToPay(_groupID, _phAddress);
		overpaymentDai =  _getOverpaymentToPay(_groupID, _phAddress);
		loanRepaymentDai = _getLoanRepaymentToPay(_groupID, _phAddress);
	}

	function getCurrentPeriodInfo(uint _groupID) public view returns(uint8 periodIndex, SubperiodType subperiodType) {
		periodIndex = _getPeriodNumber(_groupID);
		subperiodType = _getCurrentSubperiodType(_groupID);
	}

	function getClaimCount(uint _groupID, uint _periodIndex) public view returns(uint countOut) {
		countOut = groupPeriods[_groupID][_periodIndex].claims.length;
	}

	function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view returns(address claimant, ClaimState claimState, uint claimAmountDai) {
		uint period = _getPeriodNumber(_groupID);
		claimant = claims[_groupID][period].claimantAddress;
		claimState = claims[_groupID][period].claimState;
		// claimAmountDai = TODO;
	}

	function getClaimInfo2(uint _groupID, uint _periodIndex) public view returns(address[] loyalists, address[] defectors) {
		loyalists = groupPeriods[_groupID][_periodIndex].loyalists;
		defectors = groupPeriods[_groupID][_periodIndex].defectors;
	}	
}

