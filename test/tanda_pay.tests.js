var TandaPayLedger = artifacts.require("./TandaPayLedger");
var DaiContract = artifacts.require("./DaiContract");

const time = require('./helpers/time');
const {  isInArray,
	    getSubgroups, 
	    getPolicyholders,
	    payPremium, 
	    getGroupId,
	    getClaimId } = require("./helpers/helpers.js");

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('TandaPayLedger', (accounts) => {
	const backend = accounts[0];
	const secretary = accounts[1];
	const cronAccount = accounts[2];
	const outsider = accounts[9];

	var daiContract;
	var tandaPayLedger; 
	var id = 0;

	var GROUP_SIZE_AT_CREATION_MIN = 50;
	var GROUP_SIZE_AT_CREATION_MAX = 55;
	var MONTH_TO_REPAY_LOAN_MIN = 3;
	var MONTH_TO_REPAY_LOAN_MAX = 255;

	var policyholders = getPolicyholders(GROUP_SIZE_AT_CREATION_MIN);
	policyholders[0] = accounts[3];
	policyholders[1] = accounts[4];
	policyholders[2] = accounts[5];
	var policyholderSubgroups;
	var monthToRepayTheLoan;
	var premiumCostDai;
	var maxClaimDai;

	beforeEach(async() => {
		daiContract = await DaiContract.new();
		tandaPayLedger = await TandaPayLedger.new(daiContract.address, backend, cronAccount);
		
		policyholderSubgroups = getSubgroups(GROUP_SIZE_AT_CREATION_MIN);
		monthToRepayTheLoan = MONTH_TO_REPAY_LOAN_MIN;
		premiumCostDai = 20e18;
		maxClaimDai = 500e18;

		var tx = await tandaPayLedger.createNewTandaGroup(
			secretary,// address _secretary,
			policyholders, // address[] _phAddresss,
			policyholderSubgroups, // uint[] _phAddressSubgroups,
			monthToRepayTheLoan, // uint _monthToRepayTheLoan, 
			premiumCostDai, // uint _premiumCostDai,
			maxClaimDai, // uint _maxClaimDai
			{from:backend}).should.be.fulfilled;
		id = await getGroupId(tx);		
	});

	describe('periods', function(){
		it('Should return correct current subperiod',async() => {
			var num = 1;
			var sub = await tandaPayLedger.getSubperiodType(id, num);
			assert.equal(sub.toNumber(), 0);

			await time.increase(time.duration.days(3));
			var num = 1;
			var sub = await tandaPayLedger.getSubperiodType(id, num);
			assert.equal(sub.toNumber(), 1);
			
			await time.increase(time.duration.days(30));
			var num = 1;
			var sub = await tandaPayLedger.getSubperiodType(id, num);
			assert.equal(sub.toNumber(), 2);
		});

		it('Should return correct current period number',async() => {
			var sub = await tandaPayLedger.getPeriodNumber(id);
			assert.equal(sub.toNumber(), 1);
			await time.increase(time.duration.days(3));
			var sub = await tandaPayLedger.getPeriodNumber(id);
			assert.equal(sub.toNumber(), 1);
			await time.increase(time.duration.days(27));
			var sub = await tandaPayLedger.getPeriodNumber(id);
			assert.equal(sub.toNumber(), 2);
			await time.increase(time.duration.days(30));
			var sub = await tandaPayLedger.getPeriodNumber(id);
			assert.equal(sub.toNumber(), 3);			
		});		
	});

	describe('pay premium', function(){
		it('Should return policyholder',async() => {
			var count = await tandaPayLedger.groupsCount();
			assert.equal(count.toNumber(), count);
			var g = await tandaPayLedger.groups(id);
		});

		it('Should return policyholder numbers',async() => {
			var num = await tandaPayLedger.getPolicyHolderNumber(id, policyholders[0]);
			assert.equal(num.toNumber(), 0);
			var num = await tandaPayLedger.getPolicyHolderNumber(id, policyholders[1]);
			assert.equal(num.toNumber(), 1);	
			var num = await tandaPayLedger.getPolicyHolderNumber(id, policyholders[2]);
			assert.equal(num.toNumber(), 2);						
		});	
					
		it('Should pay premium 1',async() => {
			var amountToPay = await tandaPayLedger.getNeededAmount(id, policyholders[0]);
			await daiContract.mint(policyholders[0], amountToPay, {from:backend}).should.be.fulfilled;
			await daiContract.approve(tandaPayLedger.address, amountToPay, {from:policyholders[0]}).should.be.fulfilled;
			await tandaPayLedger.commitPremium(id, amountToPay, {from:policyholders[0]}).should.be.fulfilled;			
		});	
	});

	describe('ITandaPayLedger interface', function(){
		describe('transferBackendAccount()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.transferBackendAccount(outsider, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should change the backend account',async() => {
				var acc1 = await tandaPayLedger.backendAccount();
				assert.equal(acc1, backend);
				await tandaPayLedger.transferBackendAccount(outsider, {from:backend}).should.be.fulfilled;
				var acc2 = await tandaPayLedger.backendAccount();
				assert.equal(acc2, outsider);
			});
		});

		describe('transferCronAccount()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.transferCronAccount(outsider, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should change the cron account',async() => {
				var acc1 = await tandaPayLedger.cronAccount();
				assert.equal(acc1, cronAccount);
				await tandaPayLedger.transferCronAccount(outsider).should.be.fulfilled;
				var acc2 = await tandaPayLedger.cronAccount();
				assert.equal(acc2, outsider);
			});
		});

		describe('createNewTandaGroup()', function () {
			it('Should not be callable by non backend account',async() => {
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should not be callable with different count of _policyholders and _policyholderSubgroups',async() => {
				var policyholdersModified = getPolicyholders(GROUP_SIZE_AT_CREATION_MAX-1);
				var policyholderSubgroupsModified = getSubgroups(GROUP_SIZE_AT_CREATION_MAX);
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholdersModified, 
					policyholderSubgroupsModified, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _policyholders.count less than GROUP_SIZE_AT_CREATION_MIN',async() => {
				var policyholdersModified = getPolicyholders(GROUP_SIZE_AT_CREATION_MIN-1);
				var policyholderSubgroupsModified = getSubgroups(GROUP_SIZE_AT_CREATION_MIN-1);
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholdersModified, 
					policyholderSubgroupsModified, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.rejectedWith('revert');			

			});

			it('Should not be callable with _policyholders.count more than GROUP_SIZE_AT_CREATION_MAX',async() => {
				var policyholdersModified = getPolicyholders(GROUP_SIZE_AT_CREATION_MAX+1);
				var policyholderSubgroupsModified = getSubgroups(GROUP_SIZE_AT_CREATION_MAX+1);
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholdersModified, 
					policyholderSubgroupsModified, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _monthToRepayTheLoan less than MONTH_TO_REPAY_LOAN_MIN',async() => {
				var monthToRepayTheLoanModified = MONTH_TO_REPAY_LOAN_MIN - 1;
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoanModified, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.rejectedWith('revert');			
			});

			it('Should not be callable with _monthToRepayTheLoan more than MONTH_TO_REPAY_LOAN_MAX',async() => {
				var monthToRepayTheLoanModified = MONTH_TO_REPAY_LOAN_MAX + 1;
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoanModified, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.rejectedWith('revert');			

			});
			
			it('Should not be callable with _premiumCostDai==0',async() => {
				var premiumCostDaiModified = 0;
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDaiModified, 
					maxClaimDai, 
					{from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _maxClaimDai==0',async() => {
				var maxClaimDaiModified = 0;
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDaiModified, 
					{from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable with _maxClaimDai>=(_premiumCostDai * group count)',async() => { 
				var maxClaimDaiModified = premiumCostDai * GROUP_SIZE_AT_CREATION_MIN;
				await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDaiModified, 
					{from:backend}).should.be.rejectedWith('revert');
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
				var tx2 = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id2 = await getGroupId(tx2);	
				assert.isTrue(id2!=id);
			});
		});

		describe('addClaim()', function () {
			// var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
			// var shouldPayTotal = amountData[0].toNumber() + amountData[1].toNumber() + amountData[2].toNumber();			
			it('Should not be callable by non backend account',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id+1, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should fail if period!=active',async() => { 
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should fail if policyholder (_claimantAddress) is not in the current group',async() => {
				await tandaPayLedger.addClaim(id, outsider, {from:backend}).should.be.rejectedWith('revert');	
			});

			it('Should fail if policyholder has not paid during pre-period',async() => {
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should fail if policyholder has already opened claim',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.rejectedWith('revert');

			});

			it('Should open claim and return valid claim index',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				var tx = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				var claimId = getClaimId(tx);
				assert.equal(claimId, 0);
			});

			it('Should open 2 claims and return valid claim indexes',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[1]);
				await time.increase(time.duration.days(3));
				var tx1 = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				var tx2 = await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				var claimId1 = getClaimId(tx1);
				var claimId2 = getClaimId(tx2);

				assert.equal(claimId1, 0);
				assert.equal(claimId2, 1);
			});
		});

		describe('removePolicyholderFromGroup()', function () {
			it('Should not be callable by non backend account',async() => {
				var num = await tandaPayLedger.getPeriodNumber(id); 
				await tandaPayLedger.removePolicyholderFromGroup(id, num, policyholders[0], {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				var num = await tandaPayLedger.getPeriodNumber(id); 
				await tandaPayLedger.removePolicyholderFromGroup(id+1, num, policyholders[0], {from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should not be callable by non backend account',async() => {
				var num = await tandaPayLedger.getPeriodNumber(id); 
				await tandaPayLedger.removePolicyholderFromGroup(id, num, policyholders[0], {from:outsider}).should.be.rejectedWith('revert');				
			});

			it('Should fail if policyholder is not in the current group',async() => {
				var num = await tandaPayLedger.getPeriodNumber(id); 
				await tandaPayLedger.removePolicyholderFromGroup(id+1, num, getPolicyholders(1)[0], {from:backend}).should.be.rejectedWith('revert');				
			});

			it('Should fail if period!=active AND period!=pre-period',async() => {
				await time.increase(time.duration.days((33)));
				await tandaPayLedger.removePolicyholderFromGroup(id, 1, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should fail if premium is paid by policyholder',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				var num = await tandaPayLedger.getPeriodNumber(id); 
				await tandaPayLedger.removePolicyholderFromGroup(id, num, policyholders[0], {from:backend}).should.be.rejectedWith('revert');
			});

			it('Should succeed if all params are OK',async() => {
				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0].toNumber(), 5);
				for(var i=0; i<5; i++) {
					assert.equal(info[1][i], policyholders[i]);	
				}

				var num = await tandaPayLedger.getPeriodNumber(id); 
				await tandaPayLedger.removePolicyholderFromGroup(id, num, policyholders[0], {from:backend}).should.be.fulfilled;

				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0].toNumber(), 4);
				for(var i=0; i<4; i++) {
					assert.equal(info[1][i], policyholders[i+1]);	
				}				
			});
		});

		describe('commitPremium()', function () {
			it('Should not be callable by non policyholder account',async() => {
				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var amountToPay = data[0].toNumber() + data[1].toNumber() + data[2].toNumber();
				await daiContract.mint(policyholders[0], amountToPay, {from:backend}).should.be.fulfilled;
				await daiContract.approve(tandaPayLedger.address, amountToPay, {from:outsider}).should.be.fulfilled;
				await tandaPayLedger.commitPremium(id, amountToPay, {from:outsider}).should.be.rejectedWith('revert');	
			});

			it('Should fail if wrong GroupID',async() => {
				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var amountToPay = data[0].toNumber() + data[1].toNumber() + data[2].toNumber();
				await daiContract.mint(policyholders[0], amountToPay, {from:backend}).should.be.fulfilled;
				await daiContract.approve(tandaPayLedger.address, amountToPay, {from:policyholders[0]}).should.be.fulfilled;
				await tandaPayLedger.commitPremium(id+1, amountToPay, {from:policyholders[0]}).should.be.rejectedWith('revert');	
			});

			it('Should fail if user did not approved DAIs',async() => {
				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var amountToPay = data[0].toNumber() + data[1].toNumber() + data[2].toNumber();
				await tandaPayLedger.commitPremium(id, amountToPay, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if period!=pre-period',async() => {
				await time.increase(time.duration.days(3));
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]).should.be.rejectedWith('revert');
			});

			it('Should fail if user paid before',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var amountToPay = data[0].toNumber() + data[1].toNumber() + data[2].toNumber();
				await daiContract.mint(policyholders[0], amountToPay, {from:backend}).should.be.fulfilled;
				await daiContract.approve(tandaPayLedger.address, amountToPay, {from:outsider}).should.be.fulfilled;
				await tandaPayLedger.commitPremium(id, amountToPay, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if send LESS',async() => {	
				var amountToPay = await tandaPayLedger.getNeededAmount(id, policyholders[0]);
				await daiContract.mint(policyholders[0], amountToPay.toNumber(), {from:backend}).should.be.fulfilled;
				await daiContract.approve(tandaPayLedger.address, amountToPay.toNumber(), {from:policyholders[0]}).should.be.fulfilled;
				var bn = new web3.BigNumber(amountToPay).sub(1);
				await tandaPayLedger.commitPremium(id, bn, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if send MORE',async() => {	
				var amountToPay = await tandaPayLedger.getNeededAmount(id, policyholders[0]);
				await daiContract.mint(policyholders[0], amountToPay.toNumber(), {from:backend}).should.be.fulfilled;
				await daiContract.approve(tandaPayLedger.address, amountToPay.toNumber(), {from:policyholders[0]}).should.be.fulfilled;
				var bn = new web3.BigNumber(amountToPay).add(1);
				await tandaPayLedger.commitPremium(id, bn, {from:policyholders[0]}).should.be.rejectedWith('revert');
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
				await time.increase(time.duration.days(2));
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');		
			});

			it('Should fail if user has open claims',async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if user already requested subgroup switch',async() => {
				await time.increase(time.duration.days(3));
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.rejectedWith('revert');
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup+1, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should add request to change the subgroup',async() => {
				await time.increase(time.duration.days(3));
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;
				var info = await tandaPayLedger.getSubgroupInfo(id, 0);
				assert.equal(true, isInArray(info[1], policyholders[0]));

				var info = await tandaPayLedger.getSubgroupInfo(id, 1);
				assert.equal(false, isInArray(info[1], policyholders[0]));
			});

			it('Should switch group automatically if active period ended',async() => {
				await time.increase(time.duration.days(3));
				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;				
				await time.increase(time.duration.days(3));
				var info = await tandaPayLedger.getSubgroupInfo(id, 1);
				assert.equal(false, isInArray(info[1], policyholders[0]));
				
				await time.increase(time.duration.days(33));
				var info = await tandaPayLedger.getSubgroupInfo(id, 1);
				assert.equal(true, isInArray(info[1], policyholders[0]));				
			});
		});

		describe('finalizeClaims()', function () {
			it('Should not be callable by non policyholder account',async() => {
				var periodIndex = 1;
				await time.increase(time.duration.days(3));		
				await tandaPayLedger.finalizeClaims(id, periodIndex, false, {from:outsider}).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong GroupID',async() => {
				var periodIndex = 1;
				await time.increase(time.duration.days(3));		
				await tandaPayLedger.finalizeClaims(id+1, periodIndex, false, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if user has opened claim',async() => {
				var periodIndex = 1;
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				var claimId1 = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await time.increase(time.duration.days(3));
				await tandaPayLedger.finalizeClaims(id, periodIndex, false, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should fail if period!=post-period',async() => {
				var periodIndex = 1;
				await time.increase(time.duration.days(2));
				await tandaPayLedger.finalizeClaims(id, periodIndex, false, {from:policyholders[0]}).should.be.rejectedWith('revert');	
			});

			
			it('Should fail if user already finalized (selected loyalist/defector option before)',async() => {
				var periodIndex = 1;
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(33));
				await tandaPayLedger.finalizeClaims(id, periodIndex, false, {from:policyholders[0]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, periodIndex, false, {from:policyholders[0]}).should.be.rejectedWith('revert');
			});

			it('Should auto choose <loyalist> if no answer in 3 days (when post period ended)',async() => {
				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var premium = data[0].toNumber();
	
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[1]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[2]);
				await time.increase(time.duration.days(3));

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await time.increase(time.duration.days(30));

				var data = await tandaPayLedger.getClaimInfo(id, 1, 0);
				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), (3*premium));
			});
		});

		describe('processGroup()', function () {
			// TODO: still not sure
		});
	});
});
