var TandaPayLedger = artifacts.require("./TandaPayLedger");
var DaiContract = artifacts.require("./DaiContract");

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

function getSubgroups(count) {
	var out = [];
	var currSub = 0;
	for(var i=0; i<count; i++) {
		if((i - count/10) < (count-(10-currSub)*(count/10))){
			out.push(currSub);
		}else{
			currSub++;
			out.push(currSub);
		}
	}
	return out;
}

function getPolicyholders(count) {
	return accounts.slice(10, count+10);
}

contract('TandaPayLedger', (accounts) => {
	const backend = accounts[0];
	const secretary = accounts[1];
	const outsider = accounts[9];
	var daiContract;
	var tandaPayLedger; 

	var policyholders;
	var policyholderSubgroups;
	var monthToRepayTheLoan;
	var premiumCostDai;
	var maxClaimDai;

	var GROUP_SIZE_AT_CREATION_MIN;
	var GROUP_SIZE_AT_CREATION_MAX;
	var MONTH_TO_REPAY_LOAN_MIN;
	var MONTH_TO_REPAY_LOAN_MAX;

	beforeEach(async() => {
		daiContract = await DaiContract.new(); // TODO: add DaiContract
		tandaPayLedger = await TandaPayLedger.new(daiContract.address);

		GROUP_SIZE_AT_CREATION_MIN = (await tandaPayLedger.GROUP_SIZE_AT_CREATION_MIN()).toNumber();
		GROUP_SIZE_AT_CREATION_MAX = (await tandaPayLedger.GROUP_SIZE_AT_CREATION_MAX()).toNumber();
		MONTH_TO_REPAY_LOAN_MIN = (await tandaPayLedger.MONTH_TO_REPAY_LOAN_MIN()).toNumber();
		MONTH_TO_REPAY_LOAN_MAX = (await tandaPayLedger.MONTH_TO_REPAY_LOAN_MAX()).toNumber();

		policyholders = getPolicyholders(GROUP_SIZE_AT_CREATION_MIN);
		policyholderSubgroups = getSubgroups(GROUP_SIZE_AT_CREATION_MIN);
		monthToRepayTheLoan = MONTH_TO_REPAY_LOAN_MIN;
		premiumCostDai = 20e18;
		maxClaimDai = 500e18;

		var tx = await tandaPayLedger.createNewTandaGroup(policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:secretary});
		var id = await getGroudId(tx);		
	});

	describe('ITandaPayLedger interface', function(){

		describe('transferBackendAccount()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.transferBackendAccount(outsider, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should change the backend account',async() => {
				await tandaPayLedger.transferBackendAccount(outsider, {from:backend});
			});
		});

		describe('transferCronAccount()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.transferCronAccount(outsider, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should change the cron account',async() => {
				await tandaPayLedger.transferCronAccount(outsider, {from:backend});
			});
		});

		describe('createNewTandaGroup()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should not be callable with different count of _policyholders and _policyholderSubgroups',async() => {
				var policyholdersModified = getPolicyholders(GROUP_SIZE_AT_CREATION_MAX-1);
				var policyholderSubgroupsModified = getSubgroups(GROUP_SIZE_AT_CREATION_MAX);
				await tandaPayLedger.createNewTandaGroup(policyholdersModified, 
												 policyholderSubgroupsModified, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:secretary}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _policyholders.count less than GROUP_SIZE_AT_CREATION_MIN',async() => {
				var policyholdersModified = getPolicyholders(GROUP_SIZE_AT_CREATION_MIN-1);
				var policyholderSubgroupsModified = getSubgroups(GROUP_SIZE_AT_CREATION_MIN-1);
				await tandaPayLedger.createNewTandaGroup(policyholdersModified, 
												 policyholderSubgroupsModified, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:secretary}).should.be.rejectedWith('revert');			

			});

			it('Should not be callable with _policyholders.count more than GROUP_SIZE_AT_CREATION_MAX',async() => {
				var policyholdersModified = getPolicyholders(GROUP_SIZE_AT_CREATION_MAX+1);
				var policyholderSubgroupsModified = getSubgroups(GROUP_SIZE_AT_CREATION_MAX+1);
				await tandaPayLedger.createNewTandaGroup(policyholdersModified, 
												 policyholderSubgroupsModified, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:secretary}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _monthToRepayTheLoan less than MONTH_TO_REPAY_LOAN_MIN',async() => {
				var monthToRepayTheLoanModified = MONTH_TO_REPAY_LOAN_MIN - 1;
				await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoanModified, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:secretary}).should.be.rejectedWith('revert');			
			});

			it('Should not be callable with _monthToRepayTheLoan more than MONTH_TO_REPAY_LOAN_MAX',async() => {
				var monthToRepayTheLoanModified = MONTH_TO_REPAY_LOAN_MAX + 1;
				await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoanModified, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:secretary}).should.be.rejectedWith('revert');			

			});
			
			it('Should not be callable with _premiumCostDai==0',async() => {
				var premiumCostDaiModified = 0;
				await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoan, 
												 premiumCostDaiModified, 
												 maxClaimDai, 
												 {from:secretary}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _maxClaimDai==0',async() => {
				var maxClaimDaiModified = 0;
				await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDaiModified, 
												 {from:secretary}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _maxClaimDai>=(_premiumCostDai * group count)',async() => { // TODO: it was "* group count". mb subGroup?
				var maxClaimDaiModified = premiumCostDai * 10/*subgroup count*/;
				await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDaiModified, 
												 {from:secretary}).should.be.rejectedWith('revert');
			});

			/*
			it('Should not create a group if any policyholder is in >1 subgroup',async() => {
				// check NOT IMPLEMENTED IN SMART CONTRACTS!!!
			});

			it('Should not create a group if any subgroup has <5 members and/or >7 members',async() => {
				// check NOT IMPLEMENTED IN SMART CONTRACTS!!!
			});
			*/

			it('Should create 2 groups with different IDs',async() => {
				var tx2 = await tandaPayLedger.createNewTandaGroup(policyholders, 
												 policyholderSubgroups, 
												 monthToRepayTheLoan, 
												 premiumCostDai, 
												 maxClaimDai, 
												 {from:secretary});
				var id2 = await getGroudId(tx2);	
				assert.isTrue(id2!=id);
			});
		});

		describe('addClaim()', function () {
				// TODO: commitPremium amount should be... ?
				// var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				// var shouldPayTotal = amountData[0].toNumber() + amountData[1].toNumber() + amountData[2].toNumber();			
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(3*24);
				await tandaPayLedger.addClaim(id, policyholders[0], {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(3*24);
				await tandaPayLedger.addClaim(id+1, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should fail if period!=active',async() => { 
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should fail if policyholder (_claimantAddress) is not in the current group',async() => {
				await tandaPayLedger.addClaim(id2, outsider, {from:backend}).should.be.rejectedWith('revert');	
			});

			it('Should fail if policyholder has not paid during pre-period',async() => {
				await passHours(3*24);
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should fail if policyholder has already opened claim',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(3*24);
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend});
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');

			});

			it('Should open claim and return valid claim index',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend});
				assert.equal(claimId, 0);
			});

			it('Should open 2 claims and return valid claim indexes',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[1]});
				await passHours(3*24);
				var claimId1 = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend});
				var claimId2 = await tandaPayLedger.addClaim(id, policyholders[1], {from:backend});
				assert.equal(claimId1, 0);
				assert.equal(claimId2, 1);
			});
		});

		describe('removePolicyholderFromGroup()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.removePolicyholderFromGroup(id, policyholders[0], {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				await tandaPayLedger.removePolicyholderFromGroup(id+1, policyholders[0], {from:backend}).should.be.rejectedWith('revert');				
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.removePolicyholderFromGroup(id, policyholders[0], {from:outsider}).should.be.rejectedWith('revert');				
			});

			it('Should fail if policyholder is not in the current group',async() => {
				await tandaPayLedger.removePolicyholderFromGroup(id+1, accounts[10+GROUP_SIZE_AT_CREATION_MAX+1], {from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should fail if period!=active AND period!=pre-period',async() => {
				await passHours(24*(30+3));
				await tandaPayLedger.removePolicyholderFromGroup(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should fail if premium is paid by policyholder',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await tandaPayLedger.removePolicyholderFromGroup(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should succeed if all params are OK',async() => {
				await tandaPayLedger.removePolicyholderFromGroup(id, policyholders[0], {from:backend});
			});
		});


		describe('tandaPayLedger.commitPremium()', function () {
			it('Should not be callable by non policyholder account',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				await tandaPayLedger.commitPremium(id+1, premiumCostDai, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if period!=pre-period',async() => {
				await passHours(3*24);
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]}).should.be.rejectedWith('revert');				
			});

			it('Should fail if user did not approved DAIs',async() => {
				// TODO: WAT
			});

			it('Should fail if user paid before',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});
		});

		describe('addChangeSubgroupRequest()', function () {
			it('Should not be callable by non policyholder account',async() => {
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');				
			});

			it('Should fail if period!=active (first 27 days only!)',async() => {
				var newSubgroup = 1;
				await passHours(27*24);
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');		
			});

			it('Should fail if user has open claims',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend});
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if user already requested subgroup switch',async() => {
				await passHours(3*24);
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]});
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup+1, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should add request to change the subgroup',async() => {
				await passHours(3*24);
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]});				
				var info = await tandaPayLedger.getSubgroupInfo(id, 0);
				assert.equal(true, isInPolicyholderArray(info, policyholders[0]));

				var info = await tandaPayLedger.getSubgroupInfo(id, 1);
				assert.equal(false, isInPolicyholderArray(info, policyholders[0]));
			});

			it('Should switch group automatically if active period ended',async() => {
				await passHours(3*24);
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]});				
				await passHours(30*24);
				var info = await tandaPayLedger.getSubgroupInfo(id, 0);
				assert.equal(false, isInPolicyholderArray(info, policyholders[0]));

				var info = await tandaPayLedger.getSubgroupInfo(id, 1);
				assert.equal(true, isInPolicyholderArray(info, policyholders[0]));				

				// function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view 
					// returns(uint policyholdersCount, address[] policyholders);
			});
		});

		describe('finalizeClaims()', function () {
			it('Should not be callable by non policyholder account',async() => {
				await passHours(33*24);		
				await tandaPayLedger.finalizeClaims(id, false, {from:outsider}).should.be.rejectedWith('revert');	

			});

			it('Should fail if wrong GroupID',async() => {
				await passHours(33*24);		
				await tandaPayLedger.finalizeClaims(id+1, false, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});
ъ
			it('Should fail if user has opened claim',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(3*24);
				var claimId1 = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend});
				await passHours(30*24);
				await tandaPayLedger.finalizeClaims(id, false, {from:policyholders[0]}).should.be.rejectedWith('revert');					
			});

			it('Should fail if period!=post-period',async() => {
				await passHours(20*24);
				await tandaPayLedger.finalizeClaims(id, false, {from:policyholders[0]}).should.be.rejectedWith('revert');	
			});

			it('Should fail if user already finalized (selected loyalist/defector option before)',async() => {
				await tandaPayLedger.commitPremium(id, premiumCostDai, {from:policyholders[0]});
				await passHours(33*24);
				await tandaPayLedger.finalizeClaims(id, false, {from:policyholders[0]});
				await tandaPayLedger.finalizeClaims(id, false, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should auto choose <loyalist> if no answer in 3 days (when post period ended)',async() => {
				// TODO: WAT
			});
		});

		describe('processGroup()', function () {
			// TODO: still not sure
		});
	});
});
