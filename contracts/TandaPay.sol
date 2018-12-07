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
		PrePeriod,	// 3 days
		ActivePeriod,	// 24 days
		PostPeriod,	// 3 days
		BeforePeriod,
		OutOfPeriod
	}

	enum ClaimState {
		Opened,	  // no post-period is running currently
		Finalizing, // post-perdiod is currently running
		Paid,
		Rejected
	}

	event NewGroup(uint _groupId);
	event NewClaim(uint _claimId);
	event COMMIT(uint amountDai, uint neededAmount);
	event FINALIZE(uint _groupID, uint periodIndex, bool _isPolicyholderVoted, bool _isPolicyholderHaveClaim);

	DaiContract public daiContract;

	address public backendAccount;
	address public cronAccount;
	
	modifier onlyByBackend() {
		require(msg.sender==backendAccount);
		_; 
	}

	modifier onlyByCron() {
		require(msg.sender==cronAccount);
		_; 
	}	

	modifier onlyValidGroupId(uint _groupID) {
		require(_groupID < groupsCount);
		_;
	}

	modifier zeroIfPremium(uint _groupID, address _phAddress) {
		if(!_isPolicyholderPremium(_groupID, _phAddress)) {
			_;
		}
	}

	modifier onlyPolicyholder(uint _groupID, address _phAddress) {
		bool isPH = false;
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==_phAddress) {
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
		uint nextSubgroupFromPeriod;
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
		uint premiumsTotalDai;
		uint overpaymentTotalDai;
		uint loanRepaymentTotalDai;
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
				1,                       // nextSubgroupFromPeriod
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

	function _getPeriodNumber(uint _groupID) internal view onlyValidGroupId(_groupID) returns(uint number) {
		uint timePassed = (now - groups[_groupID].createdAt);
		uint periodLength = 27 days;
		number = 1 + (timePassed / periodLength); // TODO: check it
	}

	function _getPolicyHolderNumber(uint _groupID, address _addr) internal view onlyValidGroupId(_groupID) returns(uint) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==_addr) {
				return i;
			}
		}
		revert(); // no element
	}

	function _getPolicyHolder(uint _groupID, address _addr) internal view onlyValidGroupId(_groupID) returns(Policyholder) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(policyholders[_groupID][i].phAddress==_addr) {
				return policyholders[_groupID][i];
			}
		}
		revert(); // no element
	}

	function getNeededAmount(uint _groupID, address _phAddress) public view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint out) {
		uint period = _getPeriodNumber(_groupID);
		require(SubperiodType.PrePeriod==getSubperiodType(_groupID, period));
				
		out = 
			_getPremiumToPay(_groupID, _phAddress) +
			_getOverpaymentToPay(_groupID, _phAddress) + 
			_getLoanRepaymentToPay(_groupID, _phAddress);
	}

	function _getSubgroupsCount(uint _groupID) internal view onlyValidGroupId(_groupID) returns(uint maximum) {
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(_getCurrentSubgroup(_groupID, policyholders[_groupID][i]) > maximum){
				maximum = _getCurrentSubgroup(_groupID, policyholders[_groupID][i]);
			}
		}
	}

	function _getSubgroupMembersCount(uint _groupID, uint _subGroupId) internal view onlyValidGroupId(_groupID) returns(uint count){
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(_getCurrentSubgroup(_groupID, policyholders[_groupID][i]) == _subGroupId){
				count++;
			}
		}
	}	

	function getSubperiodType(uint _groupID, uint _periodNumber) public view onlyValidGroupId(_groupID) returns(SubperiodType) {
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
	
	function _getPremiumToPay(uint _groupID, address _phAddress) internal view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) zeroIfPremium(_groupID, _phAddress) returns(uint) {
		return _getPremium(_groupID, _phAddress);
	}

	function _getOverpaymentToPay(uint _groupID, address _phAddress) internal view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) zeroIfPremium(_groupID, _phAddress) returns(uint) {	
		return _getOverpayment(_groupID, _phAddress);
	}

	function _getLoanRepaymentToPay(uint _groupID, address _phAddress) internal view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) zeroIfPremium(_groupID, _phAddress) returns(uint) {
		return _getLoanRepayment(_groupID, _phAddress);
	}

	function _getPremium(uint _groupID, address _phAddress) internal view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint) {
		if(_isPolicyholderPremium(_groupID, _phAddress)) {
			return 0;
		}
		return groups[_groupID].premiumCostDai;
	}

	function _getOverpayment(uint _groupID, address _phAddress) internal view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint) {	
		uint pcNumber = _getPolicyHolderNumber(_groupID, _phAddress);
		Policyholder pc = policyholders[_groupID][pcNumber];
		uint subgroupMembersCount = _getSubgroupMembersCount(_groupID, _getCurrentSubgroup(_groupID, pc));
		return (_getCurrentSubgroupOverpayment(subgroupMembersCount) * groups[_groupID].premiumCostDai)/1000;
	}

	function _getLoanRepayment(uint _groupID, address _phAddress) internal view onlyPolicyholder(_groupID, _phAddress) onlyValidGroupId(_groupID) returns(uint) {	
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

	function	_isPolicyholderPremium(uint _groupID, address _phAddress) internal view onlyValidGroupId(_groupID) returns(bool) {
		uint last = _getPolicyHolder(_groupID, _phAddress).lastPeriodPremium;
		return (last == _getPeriodNumber(_groupID));
	}

	function _getPolicyHolderStatus(uint _groupID, address _phAddress) internal view onlyValidGroupId(_groupID) returns(PolicyholderStatus) {
		uint p = _getPeriodNumber(_groupID);
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

	function addClaim(uint _groupID, address _claimantAddress) public onlyByBackend onlyValidGroupId(_groupID) {
		uint period = _getPeriodNumber(_groupID);
		require(!_isPolicyholderHaveClaim(_groupID, period, _claimantAddress));
		require(SubperiodType.ActivePeriod==getSubperiodType(_groupID, period));
		require(_isPolicyholderPremium(_groupID, _claimantAddress));

		Claim memory c = Claim(_claimantAddress, now, ClaimState.Opened);
		emit NewClaim(periods[_groupID][period].claims.length);
		periods[_groupID][period].claims.push(c);
	}
	
	function removePolicyholderFromGroup(uint _groupID, address _phAddress) public onlyByBackend onlyValidGroupId(_groupID) {
		require(!_isPolicyholderPremium(_groupID, _phAddress));
		
		uint phIndex = _getPolicyHolderNumber(_groupID, _phAddress);
		uint count = groups[_groupID].policyholdersCount;

		policyholders[_groupID][phIndex] = policyholders[_groupID][count-1];
		delete policyholders[_groupID][count-1];
		groups[_groupID].policyholdersCount = count-1;
	}

	function commitPremium(uint _groupID, uint _amountDai) public onlyPolicyholder(_groupID, msg.sender) onlyValidGroupId(_groupID) {
		uint period = _getPeriodNumber(_groupID);
		require(_amountDai==getNeededAmount(_groupID, msg.sender));
		require(getSubperiodType(_groupID, period)==SubperiodType.PrePeriod);
		emit COMMIT(_amountDai, getNeededAmount(_groupID, msg.sender));
		daiContract.transferFrom(msg.sender, address(this), getNeededAmount(_groupID, msg.sender));

		uint phIndex = _getPolicyHolderNumber(_groupID, msg.sender);

		periods[_groupID][period].premiumsTotalDai += _getPremiumToPay(_groupID, msg.sender);
		periods[_groupID][period].overpaymentTotalDai += _getOverpaymentToPay(_groupID, msg.sender);
		periods[_groupID][period].loanRepaymentTotalDai += _getLoanRepaymentToPay(_groupID, msg.sender);

		policyholders[_groupID][phIndex].lastPeriodPremium = _getPeriodNumber(_groupID);
	}

	function addChangeSubgroupRequest(uint _groupID, uint _newSubgroupID) public onlyPolicyholder(_groupID, msg.sender) onlyValidGroupId(_groupID) {
		uint periodIndex = _getPeriodNumber(_groupID);
		require(!_isPolicyholderHaveClaim(_groupID, periodIndex, msg.sender));
		require(policyholders[_groupID][phIndex].nextSubgroupFromPeriod != periodIndex + 1);
		// require(_getCurrentSubgroup(_groupID, policyholders[_groupID][phIndex]) == policyholders[_groupID][phIndex].nextSubgroup);
		require(getSubperiodType(_groupID, periodIndex) == SubperiodType.ActivePeriod);
		
		uint phIndex = _getPolicyHolderNumber(_groupID, msg.sender);
		policyholders[_groupID][phIndex].subgroup = policyholders[_groupID][phIndex].nextSubgroup;
		policyholders[_groupID][phIndex].nextSubgroup = _newSubgroupID;
		policyholders[_groupID][phIndex].nextSubgroupFromPeriod = periodIndex+1;
	}

	function finalizeClaims(uint _groupID, bool _loyalist) public onlyPolicyholder(_groupID, msg.sender) onlyValidGroupId(_groupID) {
		uint periodIndex = _getPeriodNumber(_groupID) - 1;
		emit FINALIZE(_groupID, periodIndex, _isPolicyholderVoted(_groupID, periodIndex, msg.sender), _isPolicyholderHaveClaim(_groupID, periodIndex, msg.sender));
		require(!_isPolicyholderVoted(_groupID, periodIndex, msg.sender));
		require(!_isPolicyholderHaveClaim(_groupID, periodIndex, msg.sender));
		require(SubperiodType.PostPeriod==getSubperiodType(_groupID, periodIndex));
		
		if(_loyalist) {
			periods[_groupID][periodIndex].loyalists.push(msg.sender);
		} else {
			periods[_groupID][periodIndex].defectors.push(msg.sender);
		}
	}

	function _isPolicyholderVoted(uint _groupID, uint _periodIndex, address _phAddress)	internal view onlyValidGroupId(_groupID) returns(bool isIt) {
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

	function _isPolicyholderHaveClaim(uint _groupID, uint _periodIndex, address _phAddress) internal view onlyValidGroupId(_groupID) returns(bool isIt) {	
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

	function _getTandaGroupArrayForSecretary(address _secretary) internal view returns(uint[]) {
		uint count = getTandaGroupCountForSecretary(_secretary);
		uint elementsIndex;
		uint[] memory idsArr = new uint[](count);
		for(uint i=0; i<groupsCount; i++) {
			if(groups[i].secretary==_secretary) {
				idsArr[elementsIndex] = i;
				elementsIndex++;
			}
		}

		return idsArr;
	}

	function getTandaGroupIDForSecretary(address _secretary, uint _index) public view returns(uint) {
		uint[] memory idsArr = _getTandaGroupArrayForSecretary(_secretary);
		require(_index<idsArr.length);
		return idsArr[_index];
	}

	function getTandaGroupCount() public view returns(uint count) {
		return groupsCount;
	}

	function getTandaGroupID(uint _groupID) public view onlyValidGroupId(_groupID) returns(uint groupID) {
		return _groupID;
	}

	function getGroupInfo(uint _groupID) public view onlyValidGroupId(_groupID) returns(address secretary, uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai) {
		secretary = groups[_groupID].secretary;
		monthToRepayTheLoan = groups[_groupID].monthToRepayTheLoan;
		premiumCostDai = groups[_groupID].premiumCostDai;
		maxClaimDai = groups[_groupID].maxClaimDai;
		subgroupsTotal = _getSubgroupsCount(_groupID);
	}

	function getGroupInfo2(uint _groupID, uint _periodIndex) public view onlyValidGroupId(_groupID) returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai) {			
		premiumsTotalDai = periods[_groupID][_periodIndex].premiumsTotalDai;
		overpaymentTotalDai = periods[_groupID][_periodIndex].overpaymentTotalDai;
		loanRepaymentTotalDai = periods[_groupID][_periodIndex].loanRepaymentTotalDai;
	}

	function _getCurrentSubgroup(uint _groupID, Policyholder _p) internal view onlyValidGroupId(_groupID) returns(uint) {
		uint period = _getPeriodNumber(_groupID);
		if(_p.nextSubgroupFromPeriod<=period) {
			return _p.nextSubgroup;
		} else {
			return _p.subgroup;
		}
	}
	

	function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view onlyValidGroupId(_groupID) returns(uint, address[]) {
		require(_subgroupIndex < _getSubgroupsCount(_groupID));

		uint phCount = 0;
		address[] memory phArr = new address[](MAX_SUBGROUP_MEMBERS_COUNT);
		for(uint i=0; i<groups[_groupID].policyholdersCount; i++) {
			if(_getCurrentSubgroup(_groupID, policyholders[_groupID][i])==_subgroupIndex) {
				phArr[phCount] = (policyholders[_groupID][i].phAddress);
				phCount++;
			}
		}
		return(phCount, phArr);
	}

	function getPolicyholderInfo(uint _groupID, address _phAddress) public view onlyValidGroupId(_groupID) returns(uint currentSubgroupIndex, uint nextSubgroupIndex, PolicyholderStatus status) {
		currentSubgroupIndex = _getCurrentSubgroup(_groupID, _getPolicyHolder(_groupID, _phAddress));
		nextSubgroupIndex = _getPolicyHolder(_groupID, _phAddress).nextSubgroup;
		status = _getPolicyHolderStatus(_groupID, _phAddress);
	}

	function getAmountToPay(uint _groupID, address _phAddress) public view onlyValidGroupId(_groupID) returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai) {
		uint period = _getPeriodNumber(_groupID);
		require(SubperiodType.PrePeriod==getSubperiodType(_groupID, period));
		
		premiumDai = _getPremiumToPay(_groupID, _phAddress);
		overpaymentDai = _getOverpaymentToPay(_groupID, _phAddress);
		loanRepaymentDai = _getLoanRepaymentToPay(_groupID, _phAddress);
	}

	function getCurrentPeriodInfo(uint _groupID) public view onlyValidGroupId(_groupID) returns(uint periodIndex, SubperiodType subperiodType) {
		periodIndex = _getPeriodNumber(_groupID);
		subperiodType = getSubperiodType(_groupID, periodIndex);
	}

	function getClaimCount(uint _groupID, uint _periodIndex) public view onlyValidGroupId(_groupID) returns(uint countOut) {
		uint periodIndex = _getPeriodNumber(_groupID);
		SubperiodType s = getSubperiodType(_groupID, periodIndex);
		
		require(_periodIndex <= periodIndex);
		// TODO: are we realy need this require?
		require((SubperiodType.ActivePeriod==s)||(SubperiodType.PostPeriod==s));

		countOut = periods[_groupID][_periodIndex].claims.length;
	}

	function processGroup(uint _groupID) public onlyByCron {
		uint periodIndex = _getPeriodNumber(_groupID) - 1;
		require(getSubperiodType(_groupID, periodIndex)==SubperiodType.PostPeriod);
		
		// Send all claimRewards to claimants
		for(uint claimIndex=0; claimIndex<periods[_groupID][periodIndex].claims.length; claimIndex++) {
			if(_getClaimState(_groupID, periodIndex, claimIndex) == ClaimState.Finalizing) {
				_sendClaim(_groupID, periodIndex, claimIndex);
			}
		}
	}

	function _sendClaim(uint _groupID, uint _periodIndex, uint _claimIndex) internal onlyValidGroupId(_groupID) {
		uint period = _getPeriodNumber(_groupID);
		require(_claimIndex < periods[_groupID][_periodIndex].claims.length);
		require(_periodIndex <= period);

		Claim memory c = periods[_groupID][_periodIndex].claims[_claimIndex];
		uint amount = _getClaimAmount(_groupID, _periodIndex, _claimIndex);
		require(amount > 0);
		require(_getClaimState(_groupID, _periodIndex, _claimIndex) == ClaimState.Finalizing);

		daiContract.approve(c.claimantAddress, amount);
		periods[_groupID][_periodIndex].claims[_claimIndex].claimState = ClaimState.Paid;
	}

	function _isClaimRejected(uint _groupID, uint _periodIndex, uint _claimIndex) internal onlyValidGroupId(_groupID) view returns(bool) {
		uint period = _getPeriodNumber(_groupID);
		require(_claimIndex < periods[_groupID][_periodIndex].claims.length);
		require(_periodIndex <= period);	

		address[] defectors = periods[_groupID][_periodIndex].defectors;
		Claim memory claim = periods[_groupID][_periodIndex].claims[_claimIndex];
		Policyholder memory pcClaimant = _getPolicyHolder(_groupID, claim.claimantAddress);
		
		uint count = 0;
		for(uint i=0; i<defectors.length; i++) {
			Policyholder memory pcDefector = _getPolicyHolder(_groupID, defectors[i]);
			if(_getCurrentSubgroup(_groupID, pcDefector) == _getCurrentSubgroup(_groupID, pcClaimant)) {
				count++;
			}
		}

		if(count>=2) {
			return true;
		} else {
			return false;
		}
	}	

	function _getClaimAmount(uint _groupID, uint _periodIndex, uint _claimIndex) internal onlyValidGroupId(_groupID) view returns(uint) {
		uint period = _getPeriodNumber(_groupID);
		require(_claimIndex < periods[_groupID][_periodIndex].claims.length);
		require(_periodIndex <= period);

		ClaimState cs = _getClaimState(_groupID, _periodIndex, _claimIndex);
		if((cs!=ClaimState.Finalizing)&&(cs!=ClaimState.Paid)) {
			return 0;
		}

		uint defected = groups[_groupID].premiumCostDai * periods[_groupID][_periodIndex].defectors.length;
		uint premiumFund = periods[_groupID][_periodIndex].premiumsTotalDai - defected;
		return premiumFund / periods[_groupID][_periodIndex].claims.length;
	}

	function _getClaimState(uint _groupID, uint _periodIndex, uint _claimIndex) internal onlyValidGroupId(_groupID) view returns(ClaimState) {
		uint period = _getPeriodNumber(_groupID);
		require(_claimIndex < periods[_groupID][_periodIndex].claims.length);
		require(_periodIndex <= period);

		SubperiodType st = getSubperiodType(_groupID, _periodIndex);

		if(ClaimState.Paid == periods[_groupID][_periodIndex].claims[_claimIndex].claimState) {
			return ClaimState.Paid;
		} else if(_isClaimRejected(_groupID, _periodIndex, _claimIndex)) {
			return ClaimState.Rejected;
		} else if(st==SubperiodType.ActivePeriod) {
			return ClaimState.Opened;
		} else if(st==SubperiodType.PostPeriod) {
			return ClaimState.Finalizing;
		} else {
			revert(); // it cannot be
		}
	}	

	function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view onlyValidGroupId(_groupID) returns(address claimant, ClaimState claimState, uint claimAmountDai) {
		uint period = _getPeriodNumber(_groupID);
		require(_claimIndex < periods[_groupID][_periodIndex].claims.length);
		require(_periodIndex <= period);

		claimant = periods[_groupID][_periodIndex].claims[_claimIndex].claimantAddress;
		claimState = _getClaimState(_groupID, _periodIndex, _claimIndex);
		claimAmountDai = _getClaimAmount(_groupID, _periodIndex, _claimIndex);
	}

	function getClaimInfo2(uint _groupID, uint _periodIndex) public view onlyValidGroupId(_groupID) returns(address[] loyalists, address[] defectors) {
		uint periodIndex = _getPeriodNumber(_groupID);
		require(_periodIndex <= periodIndex);

		loyalists = periods[_groupID][_periodIndex].loyalists;
		defectors = periods[_groupID][_periodIndex].defectors;
	}	
}