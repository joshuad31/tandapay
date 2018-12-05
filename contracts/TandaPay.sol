pragma solidity ^0.4.23;

import "./ITandaPayLedger.sol";
import "./ITandaPayLedgerInfo.sol";

import "./DaiContract.sol";

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract TandaPayLedger {

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
		ActivePeriod,	// 24 days
		PostPeriod,		// 3 days
		BeforePeriod,
		OutOfPeriod
	}

	enum ClaimState {
		Opened,			// no post-period is running currently
		Finalizing,		// post-perdiod is currently running
		Paid,
		Rejected
	}

	event NewGroup(uint _groupId);
	event NewClaim(uint _claimId);

	DaiContract public daiContract;

	address public backendAccount;
	address public cronAccount;
	
	modifier onlyByBackend() {
		require(msg.sender==backendAccount);
		_; 
	}

	modifier onlyByPolicyholder(uint _groupID){
		bool isPH = false;
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==msg.sender) {
				isPH = true;
			}
		}
		require(isPH);
		_;
	}

	constructor(address _daiContractAddress, address _backendAccount, address _cronAccount) public {
		daiContract = DaiContract(_daiContractAddress);
		backendAccount = _backendAccount;
		cronAccount = _cronAccount;
	}

	struct Group {
		uint policyholdersCount;
		address secretary;
		uint monthToRepayTheLoan;
		uint premiumCostDai;
		uint maxClaimDai;
		uint createdAt;		
	}

	struct Policyholder {
		uint subgroup;
		uint nextSubgroup;
		address phAddress;
		uint lastPeriodPremium;
	}

	struct Claim {
		address claimantAddress;
		uint createdAt;
		ClaimState claimState;
	}

	struct GroupPeriod {
		Claim[] claims;
		address[] loyalists;
		address[] defectors;
	}

	uint public groupsCount = 0;
	mapping(uint=>Group) public groups; // groupNumber => Group
	mapping(uint=> mapping(uint=>Policyholder)) policyholders;  // group=> phIndex => Policyholder
	mapping(uint=> mapping(uint=>GroupPeriod)) periods;  // group=> periodNumber => Period

	uint public GROUP_SIZE_AT_CREATION_MIN = 50;
	uint public GROUP_SIZE_AT_CREATION_MAX = 55;
	uint public MONTH_TO_REPAY_LOAN_MIN = 3;
	uint public MONTH_TO_REPAY_LOAN_MAX = 255;

	uint public MAX_SUBGROUP_MEMBERS_COUNT = 7;

	function transferBackendAccount(address _newAccount) public onlyByBackend {
		backendAccount = _newAccount;
	}

	function transferCronAccount(address _newAccount) public onlyByBackend {
		cronAccount = _newAccount;
	}

	event TandaReceived(address _secretary,
		address[] _phAddresss,
		uint[] _phAddressSubgroups,
		uint _monthToRepayTheLoan,
		uint _premiumCostDai,
		uint _maxClaimDai);

	function createNewTandaGroup(
		address _secretary,
		address[] _phAddresss,
		uint[] _phAddressSubgroups,
		uint _monthToRepayTheLoan, 
		uint _premiumCostDai,
		uint _maxClaimDai) public onlyByBackend
	{

		// emit TandaReceived(_secretary
		// 	_phAddresss,
		// 	_phAddressSubgroups,
		// 	_monthToRepayTheLoan,
		// 	_premiumCostDai,
		// 	_maxClaimDai);
		require(_phAddresss.length ==_phAddressSubgroups.length);
		require(_phAddresss.length <= GROUP_SIZE_AT_CREATION_MAX);
		require(_phAddresss.length >= GROUP_SIZE_AT_CREATION_MIN);
		require(_monthToRepayTheLoan >= MONTH_TO_REPAY_LOAN_MIN);
		require(_monthToRepayTheLoan <= MONTH_TO_REPAY_LOAN_MAX);

		require(_premiumCostDai > 0);
		require(_maxClaimDai > 0);
		require( _maxClaimDai<(_premiumCostDai * _phAddresss.length) );

		Group memory g;
		g.secretary = _secretary;
		g.monthToRepayTheLoan = _monthToRepayTheLoan;
		g.premiumCostDai = _premiumCostDai;
		g.maxClaimDai = _maxClaimDai;
		g.createdAt = now;
			
		for(uint i=0; i<_phAddresss.length; i++) {
			Policyholder memory p = Policyholder(
				_phAddressSubgroups[i], 	// subgroup;
				_phAddressSubgroups[i], 	// nextSubgroup;
				_phAddresss[i], 		// phAddress;
				0 					// lastPeriodPremium;
			);

			policyholders[groupsCount][i] = p;
			g.policyholdersCount++;
		}	
		groups[groupsCount] = g;
		emit NewGroup(groupsCount);
		groupsCount = groupsCount + 1;
	}

	function getPeriodNumber(uint _groupID) public view returns(uint number) {
		uint timePassed = (now - groups[_groupID].createdAt);
		uint periodLength = 27 days;
		number = 1 + (timePassed / periodLength); // TODO: check it
	}

	function getPolicyHolderNumber(uint _groupID, address _addr) public view returns(uint) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==_addr) {
				return i;
			}
		}
		revert(); // no element
	}

	function _getPolicyHolder(uint _groupID, address _addr) internal view returns(Policyholder) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==_addr) {
				return policyholders[_groupID][i];
			}
		}
		revert(); // no element
	}

	function getNeededAmount(uint _groupID, address _phAddress) public view returns(uint out) {
		out = 
			_getPremiumToPay(_groupID, _phAddress) +
			_getOverpaymentToPay(_groupID, _phAddress) + 
			_getLoanRepaymentToPay(_groupID, _phAddress);
	}

	function _getSubgroupsCount(uint _groupID) internal view returns(uint maximum){
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].subgroup<maximum){
				maximum = policyholders[_groupID][i].subgroup;
			}
		}
	}

	function _getSubgroupMembersCount(uint _groupID, uint _subGroupId) internal view returns(uint count){
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].subgroup == _subGroupId){
				count++;
			}
		}
	}	

	function getSubperiodType(uint _groupID, uint _periodNumber) public view returns(SubperiodType) {
		uint timePassed = (now - groups[_groupID].createdAt);
		uint dayNum = timePassed/(1 days);
		uint periodDayNum = dayNum - 30*(_periodNumber - 1);
		if(30*(_periodNumber - 1) > dayNum) {
			return SubperiodType.BeforePeriod;
		}else if(periodDayNum<3) {
			return SubperiodType.PrePeriod;
		} else if((periodDayNum>=3)&&(periodDayNum<33)) {
			return SubperiodType.ActivePeriod;
		} else if((periodDayNum>=33)&&(periodDayNum<36)) {
		 	return SubperiodType.PostPeriod;
		} else {
			return SubperiodType.OutOfPeriod;
		}
	}

	
	function _getPremiumToPay(uint _groupID, address _phAddress) internal view returns(uint) {
		return groups[_groupID].premiumCostDai;
	}

	function _getOverpaymentToPay(uint _groupID, address _phAddress) internal view returns(uint) {
		uint pcNumber = 0;//getPolicyHolderNumber(_groupID, _phAddress);
		Policyholder pc = policyholders[_groupID][pcNumber];
		uint subgroupMembersCount = _getSubgroupMembersCount(_groupID, pc.subgroup);
		return _getCurrentSubgroupOverpayment(subgroupMembersCount) * groups[_groupID].premiumCostDai;
	}

	function _getLoanRepaymentToPay(uint _groupID, address _phAddress) internal view returns(uint) {
		uint MTR = 3; // TODO: ???
		return (groups[_groupID].premiumCostDai + _getOverpaymentToPay(_groupID, _phAddress)) / (MTR - 1);
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

	function	_isPolicyholderPremium(uint _groupID, address _phAddress) internal view returns(bool) {
		uint last = _getPolicyHolder(_groupID, _phAddress).lastPeriodPremium;
		return (last == getPeriodNumber(_groupID));
	}

	function _getPolicyHolderStatus(uint _groupID, address _phAddress) internal view returns(PolicyholderStatus) {
		uint p = getPeriodNumber(_groupID);
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==_phAddress) {
				if(_isPolicyholderPremium(_groupID, _phAddress)) {
					for(uint j=0; j<periods[_groupID][p].claims.length; j++) {
						if(periods[_groupID][p].claims[j].claimantAddress==_phAddress) {
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
		uint period = getPeriodNumber(_groupID);
		require(!_isPolicyholderHaveClaim(_groupID, period, _claimantAddress));
		require(SubperiodType.ActivePeriod==getSubperiodType(_groupID, period));
		require(_groupID<groupsCount);
		require(_isPolicyholderPremium(_groupID, _claimantAddress));

		Claim memory c = Claim(_claimantAddress, now, ClaimState.Opened);
		emit NewClaim(periods[_groupID][period].claims.length);
		periods[_groupID][period].claims.push(c);

	}
	
	function removePolicyholderFromGroup(uint _groupID, uint _periodNumber, address _phAddress) public onlyByBackend {
		SubperiodType st = getSubperiodType(_groupID, _periodNumber);
		require(!_isPolicyholderPremium(_groupID, _phAddress));
		require((st==SubperiodType.ActivePeriod) || (st==SubperiodType.PrePeriod));
		
		uint phIndex = getPolicyHolderNumber(_groupID, _phAddress);
		uint count = groups[_groupID].policyholdersCount;

		policyholders[_groupID][phIndex] = policyholders[_groupID][count-1];
		delete policyholders[_groupID][count-1];
		groups[_groupID].policyholdersCount = count-1;
	}

	event COMMIT(uint amountDai, uint neededAmount);

	function commitPremium(uint _groupID, uint _amountDai) public onlyByPolicyholder(_groupID) {
		uint period = getPeriodNumber(_groupID);
		require(_amountDai==getNeededAmount(_groupID, msg.sender));
		require(getSubperiodType(_groupID, period)==SubperiodType.PrePeriod);
		emit COMMIT(_amountDai, getNeededAmount(_groupID, msg.sender));
		daiContract.transferFrom(msg.sender, address(this), getNeededAmount(_groupID, msg.sender));

		uint phIndex = getPolicyHolderNumber(_groupID, msg.sender);
		policyholders[_groupID][phIndex].lastPeriodPremium = getPeriodNumber(_groupID);
	}

	function addChangeSubgroupRequest(uint _groupID, uint _newSubgroupID) public onlyByPolicyholder(_groupID) {
		uint periodIndex = getPeriodNumber(_groupID);
		require(!_isPolicyholderHaveClaim(_groupID, periodIndex, msg.sender));
		require(policyholders[_groupID][phIndex].subgroup == policyholders[_groupID][phIndex].nextSubgroup);
		require(getSubperiodType(_groupID, periodIndex) == SubperiodType.ActivePeriod);
		
		uint phIndex = getPolicyHolderNumber(_groupID, msg.sender);
		policyholders[_groupID][phIndex].nextSubgroup = _newSubgroupID;
	}

	event FINALIZE(uint _groupID, uint periodIndex, bool _isPolicyholderVoted, bool _isPolicyholderHaveClaim);
	
	function finalizeClaims(uint _groupID, uint _periodIndex, bool _loyalist) public onlyByPolicyholder(_groupID) {
		emit FINALIZE(_groupID, _periodIndex, _isPolicyholderVoted(_groupID, _periodIndex, msg.sender), _isPolicyholderHaveClaim(_groupID, _periodIndex, msg.sender));
		require(!_isPolicyholderVoted(_groupID, _periodIndex, msg.sender));
		require(!_isPolicyholderHaveClaim(_groupID, _periodIndex, msg.sender));
		require(SubperiodType.PostPeriod==getSubperiodType(_groupID, _periodIndex));
		
		if(_loyalist) {
			periods[_groupID][_periodIndex].loyalists.push(msg.sender);
		} else {
			periods[_groupID][_periodIndex].defectors.push(msg.sender);
		}
	}

	function _isPolicyholderVoted(uint _groupID, uint _periodIndex, address _phAddress)	internal view returns(bool isIt) {
		for(uint i=0; i<periods[_groupID][_periodIndex].loyalists.length; i++) {
			if(_phAddress == periods[_groupID][_periodIndex].loyalists[i]) {
				isIt = true;
			}
		}

		for(uint j=0; j<periods[_groupID][_periodIndex].defectors.length; j++) {
			if(_phAddress == periods[_groupID][_periodIndex].defectors[j]) {
				isIt = true;
			}
		}		
	}

	function _isPolicyholderHaveClaim(uint _groupID, uint _periodIndex, address _phAddress) internal view returns(bool isIt) {	
		for(uint i=0; i<periods[_groupID][_periodIndex].claims.length; i++) {
			if(_phAddress == periods[_groupID][_periodIndex].claims[i].claimantAddress) {
				isIt = true;
			}
		}
	}

	// ---------------------------------- INFO ----------------------------------

	function getTandaGroupCountForSecretary(address _secretary) public view returns(uint count) {
		for(uint i=0; i<groupsCount; i++) {
			if(groups[i].secretary==_secretary) {
				count++;
			}
		}
	}

	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view returns(uint) {
		return _index;
	}

	function getTandaGroupCount() public view returns(uint count) {
		return groupsCount;
	}

	function getTandaGroupID(uint _index) public view returns(uint groupID) {
		return _index;
	}

	function getGroupInfo(uint _groupID) public view returns(address secretary, uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai) {
		secretary = groups[_groupID].secretary;
		monthToRepayTheLoan = groups[_groupID].monthToRepayTheLoan;
		premiumCostDai = groups[_groupID].premiumCostDai;
		maxClaimDai = groups[_groupID].maxClaimDai;
		subgroupsTotal = _getSubgroupsCount(_groupID);
	}

	function getGroupInfo2(uint _groupID) public view returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(_isPolicyholderPremium(_groupID, policyholders[_groupID][i].phAddress)) {
				premiumsTotalDai += _getPremiumToPay(_groupID, policyholders[_groupID][i].phAddress);	
				overpaymentTotalDai += _getOverpaymentToPay(_groupID, policyholders[_groupID][i].phAddress);
				loanRepaymentTotalDai += _getLoanRepaymentToPay(_groupID, policyholders[_groupID][i].phAddress);
			}
		}		
	}

	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view returns(uint, address[]) {
		uint phCount = 0;
		address[] memory phArr = new address[](MAX_SUBGROUP_MEMBERS_COUNT);
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].subgroup==_subgroupIndex) {
				phArr[phCount] = (policyholders[_groupID][i].phAddress);
				phCount++;
			}
		}
		return(phCount, phArr);
	}

	function getPolicyholderInfo(uint _groupID, address _phAddress) public view returns(uint currentSubgroupIndex, uint nextSubgroupIndex, PolicyholderStatus status) {
		currentSubgroupIndex = _getPolicyHolder(_groupID, _phAddress).subgroup;
		nextSubgroupIndex = _getPolicyHolder(_groupID, _phAddress).nextSubgroup;
		status = _getPolicyHolderStatus(_groupID, _phAddress);
	}

	function getAmountToPay(uint _groupID, address _phAddress) public view returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai) {
		premiumDai = _getPremiumToPay(_groupID, _phAddress);
		overpaymentDai = _getOverpaymentToPay(_groupID, _phAddress);
		loanRepaymentDai = _getLoanRepaymentToPay(_groupID, _phAddress);
	}

	function getCurrentPeriodInfo(uint _groupID) public view returns(uint periodIndex, SubperiodType subperiodType) {
		periodIndex = getPeriodNumber(_groupID);
		subperiodType = getSubperiodType(_groupID, periodIndex);
	}

	function getClaimCount(uint _groupID, uint _periodIndex) public view returns(uint countOut) {
		countOut = periods[_groupID][_periodIndex].claims.length;
	}

	function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view returns(address claimant, ClaimState claimState, uint claimAmountDai) {
		uint period = getPeriodNumber(_groupID);
		claimant = periods[_groupID][_periodIndex].claims[_claimIndex].claimantAddress;
		claimState = periods[_groupID][_periodIndex].claims[_claimIndex].claimState;
		
		(uint premiumTotal, uint _a, uint _b) = getGroupInfo2(_groupID);

		claimAmountDai = premiumTotal / periods[_groupID][_periodIndex].claims.length;
	}

	function getClaimInfo2(uint _groupID, uint _periodIndex) public view returns(address[] loyalists, address[] defectors) {
		loyalists = periods[_groupID][_periodIndex].loyalists;
		defectors = periods[_groupID][_periodIndex].defectors;
	}	
}
