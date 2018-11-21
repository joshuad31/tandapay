pragma solidity ^0.4.23;

import "./ITandaPayLedger.sol";
import "./ITandaPayLedgerInfo.sol";

import "./DaiContract.sol";

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
		uint policyholdersCount;
		address secretary;
		uint monthToRepayTheLoan;
		uint premiumCostDai;
		uint maxClaimDai;
		uint createdAt;

		mapping(uint=>Policyholder) policyholders; // phIndex => Policyholder
		mapping(uint=>GroupPeriod) periods; // periodNumber => Period		
	}

	struct Policyholder {
		uint subgroup;
		uint nextSubgroup;
		address phAddress;
		uint premiumBoughtAt;
	}

	struct Claim {
		address claimantAddress;
		uint createdAt;
		ClaimState claimState;
	}

	struct GroupPeriod {
		uint claimsCount;
		mapping(uint=>Claim) claims;
		uint loyalistsCount;
		mapping(uint=>address) loyalists;
		uint defectorsCount;
		mapping(uint=>address) defectors;
	}

	uint groupCount;
	mapping(uint=>Group) groups; // groupNumber => Group

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

		groups[groupCount].secretary = _secretary;
		groups[groupCount].monthToRepayTheLoan = _monthToRepayTheLoan;
		groups[groupCount].premiumCostDai = _premiumCostDai;
		groups[groupCount].maxClaimDai = _maxClaimDai;
		groups[groupCount].createdAt = now;
			
		for(uint i=0; i<_phAddresss.length; i++) {
			groups[groupCount].policyholders[i] = new Policyholder(
				_phAddressSubgroups[i], 	// subgroup;
				_phAddressSubgroups[i], 	// nextSubgroup;
				_phAddresss[i], 		// phAddress;
				0 					// premiumBoughtAt;
			);
			groups[groupCount].policyholdersCount++;
		}	

		groupCount += 1;
	}

	function _getPeriodNumber(uint _groupID) internal view returns(uint number) {
		uint timePassed = (now - groups[_groupID].createdAt);
		uint periodLength = 30 * 24 * 3600 * 1000;
		number = timePassed / periodLength; // TODO: check it
	}

	function _getPolicyHolderNumber(uint _groupID, address _addr) internal view returns(uint) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(groups[_groupID].policyHolders[i].phAddress==_addr) {
				return i;
			}
		}
		revert(); // no element
	}

	function _getPolicyHolder(uint _groupID, address _addr) internal view returns(Policyholder) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(groups[_groupID].policyHolders[i].phAddress==_addr) {
				return groups[_groupID].policyHolders[i];
			}
		}
		revert(); // no element
	}

	function _getNeededAmount(uint _groupID) internal view returns(uint out) {
		uint out = 
			_getPremiumToPay(_groupID, _phAddress) +
			_getOverpaymentToPay(_groupID, _phAddress) + 
			_getLoanRepaymentToPay(_groupID, _phAddress);
	}

	function _getSubgroupCount(uint _groupID) internal view returns(uint maximum){
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(groups[_groupID].policyHolders[i].subgroup<maximum){
				maximum = groups[_groupID].policyHolders[i].subgroup;
			}
		}
	}

	function _getSubgroupMembersCount(uint _groupID) internal view returns(uint count){
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(groups[_groupID].policyHolders[i].subgroup<maximum){
				maximum = groups[_groupID].policyHolders[i].subgroup;
			}
		}
	}	

	function _getCurrentSubperiodType(uint _groupID) internal view returns(SubperiodType) {
		uint timePassed = (now - groups[_groupID].createdAt);
		uint day = 24 * 3600 * 1000;
		uint dayNum = timePassed/day;

		dayNum = dayNum - 30*(_getPeriodNumber(_groupID) - 1);
		if(dayNum<=3) {
			return SubperiodType.PrePeriod;
		} else if((dayNum>3)&&(dayNum<30)) {
			return SubperiodType.ActivePeriod;
		} else {
		 	revert(); // Is it OK?
		}
	}

	function _getPremiumTotalDai(uint _groupID) internal view returns(uint) {
		uint out = 0;
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			out += _getPremiumToPay(_groupID, groups[_groupID].policyholders[i].phAddress);
		}
	}

	function _getOverpaymentTotalDai(uint _groupID) internal view returns(uint) {
		uint out = 0;
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			out += _getOverpaymentToPay(_groupID, groups[_groupID].policyholders[i].phAddress);
		}
	}

	function _getLoanRepaymentTotalDai(uint _groupID) internal view returns(uint) {
		uint out = 0;
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			out += _getLoanRepaymentToPay(_groupID, groups[_groupID].policyholders[i].phAddress);
		}		
	}
	
	function _getPremiumToPay(uint _groupID, address _phAddress) internal view returns(uint) {
		return premiumsTotalDai;
	}

	function _getOverpaymentToPay(uint _groupID, address _phAddress) internal view returns(uint) {
		uint subgroupMembersCount = _getSubgroupMembersCount(_groupID);
		_getCurrentSubgroupOverpayment(subgroupMembersCount)* premiumCostDai;
	}

	function _getLoanRepaymentToPay(uint _groupID, address _phAddress) internal view returns(uint) {
		uint subgroupMembersCount = _getSubgroupMembersCount(_groupID);
		uint overpayment = _getCurrentSubgroupOverpayment(subgroupMembersCount)* premiumCostDai;
		uint MTR = 3; // TODO: ???
		return (premiumCostDai + overpayment) / (MTR - 1);
	}

	function _getCurrentSubgroupOverpayment(uint _subgroupMembersCount) internal view returns(uint) {
		if(4==_subgroupMembersCount) {
			return 333;
		} else if(5==_subgroupMembersCount) {
			return 250;
		} else if(6==_subgroupMembersCount) {
			return 200;
		} else if(7==_subgroupMembersCount) {
			return 167;
		} else {
			revert();
		}
	}


	function	_isHavePremium(uint _groupID, address _phAddress) returns(bool) {
		uint timeDelta = groups[_groupID].policyholders[i].premiumBoughtAt - now;

		if(timeDelta < 30*24*3600*1000) {
			return true;
		} else {
			return false;
		}
	}

	function _getPolicyHolderStatus(uint _groupID, address _phAddress) internal returns(PolicyholderStatus) {
		uint period = _getPeriodNumber(_groupID);

		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(groups[_groupID].policyholders[i].phAddress==_phAddress) {
				if(_isHavePremium(_groupID, _phAddress)) {
					for(uint j=0; j<groups[_groupID].periods[p].claimsCount; j++) {
						if(groups[_groupID].periods[p].claims[j].claimantAddress==_phAddress) {
							return PolicyholderStatus.OpenedClaim;
						}					
					}
					return PolicyholderStatus.PremiumPaid;
				}
			}
		}
		return PolicyholderStatus.PremiumUnpaid;
	}	

	function addClaim(uint _groupID, address _claimantAddress) public onlyByBackend returns(uint claimIndex) {
		// TODO: check no claims for that _claimantAddress
		uint period = _getPeriodNumber(_groupID);
		uint count = groups[_groupID].periods[period].claimsCount;

		groups[_groupID].periods[period].claims[count] = new Claim(
			_claimantAddress,	// claimantAddress;
			now,				// createdAt;
			ClaimState.Open	// claimState;
		);

		groups[_groupID].periods[period].claimsCount = count + 1;
		claimIndex = count;
	}
	
	function removePolicyholderFromGroup(uint _groupID, address _phAddress) public onlyByBackend {
		uint phIndex = _getPolicyHolderNumber(_groupID, _phAddress);
		uint count = groups[_groupID].policyHoldersCount;

		groups[_groupID].policyHolders[phIndex] = groups[_groupID].policyHolders[count-1];
		delete groups[_groupID].policyHolders[count-1];
		groups[_groupID].policyHoldersCount = count-1;
	}

	function commitPremium(uint _groupID, uint _amountDai) public onlyByPolicyholder(_groupID) {
		uint neededAmount = _getNeededAmount(_groupID);
		require(_amountDai==neededAmount);
		// TODO: require pre-period
		// TODO: get tokens
		uint phIndex = _getPolicyHolderNumber(_groupID, msg.sender);
		groups[_groupID].policyholders[phIndex].premiumBoughtAt = now;
	}

	function addChangeSubgroupRequest(uint _groupID, uint _newSubgroupID) public onlyByPolicyholder(_groupID) {
		// TODO: requires
		uint phIndex = _getPolicyHolderNumber(_groupID, msg.sender);
		groups[_groupID].policyholders[phIndex].nextSubgroup = _newSubgroupID;
	}

	function finalizeClaims(uint _groupID, bool _loyalist) public onlyByPolicyholder(_groupID) {
		uint periodIndex = _getPeriodNumber(_groupID);
		// TODO: check that msg.sender not voted
		if(_loyalist) {
			uint loyalistsCount = groups[_groupID].periods[periodIndex].loyalistsCount;
			groups[_groupID].periods[periodIndex].loyalists[loyalistsCount] = msg.sender;
			groups[_groupID].periods[periodIndex].loyalistsCount = loyalistsCount+1;
		} else {
			uint defectorsCount = groups[_groupID].periods[periodIndex].defectorsCount;
			groups[_groupID].periods[periodIndex].loyalists[defectorsCount] = msg.sender;
			groups[_groupID].periods[periodIndex].defectorsCount = defectorsCount+1;
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
		premiumsTotalDai = _getPremiumTotalDai(_groupID);
		overpaymentTotalDai = _getOverpaymentTotalDai(_groupID);
		premiumsTotalDai = _getLoanRepaymentTotalDai(_groupID);
	}

	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view returns(uint policyholdersCount, address[] policyholders) {
		for(uint i=0; i<groups[_groupID].policyHoldersCount; i++) {
			if(groups[_groupID].policyholders[i].subgroup==_subgroupIndex) {
				policyholders.push(pcArr[i].phAddress);
				policyholdersCount++;
			}
		}
	}

	function getPolicyholderInfo(uint _groupID, address _phAddress) public view returns(uint8 currentSubgroupIndex, uint8 nextSubgroupIndex, PolicyholderStatus status) {
		Policyholder pc = _getPolicyHolder(_groupID, _phAddress);
		currentSubgroupIndex = ph.subgroup;
		nextSubgroupIndex = ph.nextSubgroup;
		status = _getPolicyHolderStatus(_groupID, _phAddress);
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
		countOut = groups[_groupID].periods[_periodIndex].claimsCount;
	}

	function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view returns(address claimant, ClaimState claimState, uint claimAmountDai) {
		uint period = _getPeriodNumber(_groupID);
		claimant = groups[_groupID].periods[_periodIndex].claims[_claimIndex].claimantAddress;
		claimState = groups[_groupID].periods[_periodIndex].claims[_claimIndex].claimState;
		// claimAmountDai = TODO;
	}

	function getClaimInfo2(uint _groupID, uint _periodIndex) public view returns(address[] loyalists, address[] defectors) {
		for(uint i=0; i<groups[_groupID].periods[_periodIndex].loyalistsCount; i++) {
			loyalists.push(groups[_groupID].periods[_periodIndex].loyalists[i]);	
		} 

		for(uint j=0; j<groups[_groupID].periods[_periodIndex].defectorsCount; j++) {
			defectors.push(groups[_groupID].periods[_periodIndex].defectors[j]);	
		} 		
	}	
}
