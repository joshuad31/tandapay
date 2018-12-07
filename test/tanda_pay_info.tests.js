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
	const secretary2 = accounts[3];
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
	policyholders[0] = accounts[4];
	policyholders[1] = accounts[5];
	policyholders[2] = accounts[6];
	policyholders[3] = accounts[7];
	policyholders[4] = accounts[8];
	policyholders[5] = accounts[3];	
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

		// var tx = await tandaPayLedger.createNewTandaGroup(
		// 	secretary,// address _secretary,
		// 	policyholders, // address[] _phAddresss,
		// 	policyholderSubgroups, // uint[] _phAddressSubgroups,
		// 	monthToRepayTheLoan, // uint _monthToRepayTheLoan, 
		// 	premiumCostDai, // uint _premiumCostDai,
		// 	maxClaimDai, // uint _maxClaimDai
		// 	{from:backend}).should.be.fulfilled;
		// id = await getGroupId(tx);		
	});

	before(async() => {
	});

	describe('ITandaPayLedgerInfo interface', function(){
		describe('getTandaGroupCountForSecretary()', function () {
			it('1: Should return 0 if no groups',async() => {
				var count = await tandaPayLedger.getTandaGroupCountForSecretary(secretary);
				assert.equal(count.toNumber(), 0);
			});

			it('2: Should return 0 if no groups for current secretary',async() => {
				var secretary2 = accounts[2];
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);	

				var count = await tandaPayLedger.getTandaGroupCountForSecretary(secretary2);
				assert.equal(count.toNumber(), 0);				
			});

			it('3: Should return 1 if one group',async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);	

				var count = await tandaPayLedger.getTandaGroupCountForSecretary(secretary);
				assert.equal(count.toNumber(), 1);						
			});
		});

		describe('getTandaGroupIDForSecretary()', function () {
			it('4: Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);	
				var groupId = await tandaPayLedger.getTandaGroupIDForSecretary(secretary, 1).should.be.rejectedWith('revert');
			});

			it('5: Should return valid group ID if index is OK', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);	
				var groupId = await tandaPayLedger.getTandaGroupIDForSecretary(secretary, 0).should.be.fulfilled;
			});
		});

		describe('getTandaGroupCount()', function () {
			it('6: Should return 0 if no groups',async() => {
				var count = await tandaPayLedger.getTandaGroupCount();
				assert.equal(count.toNumber(), 0);		
			});

			it('7: Should return 1 if one group',async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);	

				var count = await tandaPayLedger.getTandaGroupCount();
				assert.equal(count.toNumber(), 1);		
			});
		});

		describe('getTandaGroupID()', function () {
			it('8: Should fail if index is wrong', async() => {
				await tandaPayLedger.getTandaGroupID(1).should.be.rejectedWith('revert');
			});

			it('9: Should return valid group ID if index is OK', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;				
				var groupId = await tandaPayLedger.getTandaGroupID(0).should.be.fulfilled;
				assert.equal(groupId, 0);
			});
		});

		describe('getGroupInfo()', function () {
			it('10: Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await tandaPayLedger.getGroupInfo(id+1).should.be.rejectedWith('revert');
			});

			it('11: Should return all data', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var groupData = await tandaPayLedger.getGroupInfo(id).should.be.fulfilled;
				assert.equal(groupData[0], secretary);
				assert.equal(groupData[1].toNumber(), 9);
				assert.equal(groupData[2].toNumber(), monthToRepayTheLoan);
				assert.equal(groupData[3].toNumber(), premiumCostDai);
				assert.equal(groupData[4].toNumber(), maxClaimDai);
			});
		});

		describe('getGroupInfo2()', function () {
			it('12: Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				
				var periodIndex = 1;
				var groupData = await tandaPayLedger.getGroupInfo2(id+1, periodIndex).should.be.rejectedWith('revert');
			});

			it('13: Should return all data for pre-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var periodIndex = 1;
				var groupData = await tandaPayLedger.getGroupInfo2(id, periodIndex).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);
			});

			it('14: Should return updated data for active period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await time.increase(time.duration.days(3));

				var periodIndex = 1;
				var groupData = await tandaPayLedger.getGroupInfo2(id, periodIndex).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);				
			});

			it('15: Should return updated data for post-period period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await time.increase(time.duration.days(30));
				
				var periodIndex = 1;
				var groupData = await tandaPayLedger.getGroupInfo2(id. periodIndex).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);				
			});

			it('16: Should return all data for next period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await time.increase(time.duration.days(30));

				var periodIndex = 1;
				var groupData = await tandaPayLedger.getGroupInfo2(id, periodIndex).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);					
			});
		});

		describe('getSubgroupInfo()', function () {
			// 	returns(uint policyholdersCount, address[] policyholders);			
			it('17: Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id+1, subgroupIndex).should.be.rejectedWith('revert');
			});

			it('18: Should fail if subgroup index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var subgroupIndex = 99;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.rejectedWith('revert');				
			});

			it('19: Should return valid data', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 5);
				for(var i=0; i<5; i++) {
					assert.equal(info[1][i], policyholders[i]);	
				}
			});

			it('20: Should return valid data when policyholder requested to change the subgroup', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var newSubgroup = 1;
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;

				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 5);
				for(var i=0; i<5; i++) {
					assert.equal(info[1][i], policyholders[i]);	
				}

				var subgroupIndex = 1;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 5);
				for(var i=0; i<5; i++) {
					assert.equal(info[1][i], policyholders[i+5]);	
				}
			});

			it('21: Should return valid data after subgroup was auto changed for policyholder', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var newSubgroup = 1;
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;

				var subgroupIndex = 1;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0].toNumber(), 5);
				assert.equal(info[1][0], policyholders[5]);
				assert.equal(info[1][1], policyholders[6]);
				assert.equal(info[1][2], policyholders[7]);
				assert.equal(info[1][3], policyholders[8]);
				assert.equal(info[1][4], policyholders[9]);

				await time.increase(time.duration.days(30));

				var subgroupIndex = 1;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 6);
				assert.equal(info[1][0], policyholders[0]);
				assert.equal(info[1][1], policyholders[5]);
				assert.equal(info[1][2], policyholders[6]);
				assert.equal(info[1][3], policyholders[7]);
				assert.equal(info[1][4], policyholders[8]);
				assert.equal(info[1][5], policyholders[9]);
				
			});
		});

		describe('getPolicyholderInfo()', function () {
			it('22: Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await tandaPayLedger.getPolicyholderInfo(id+1, policyholders[0]).should.be.rejectedWith('revert');
			});

			it('23: Should fail if address is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await tandaPayLedger.getPolicyholderInfo(id, outsider).should.be.rejectedWith('revert');
			});

			it('24: Should return valid data', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var data = await tandaPayLedger.getPolicyholderInfo(id, policyholders[49]).should.be.fulfilled;
				assert.equal(data[0], 9);
				assert.equal(data[1], 9);			
			});

			it('25: Should return valid data when policyholder requested to change the subgroup', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);

				var newSubgroup = 1;
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;				
			
				var data = await tandaPayLedger.getPolicyholderInfo(id, policyholders[0]).should.be.fulfilled;
				assert.equal(data[0], 0);
				assert.equal(data[1], 1);					
			});

			it('26: Should return valid data after subgroup was auto changed for policyholder', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);

				var newSubgroup = 1;
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;				
				time.increase(time.duration.days(30));
				var data = await tandaPayLedger.getPolicyholderInfo(id, policyholders[0]).should.be.fulfilled;
				assert.equal(data[0], 1);
				assert.equal(data[1], 1);
			});
		});

		describe('getAmountToPay(id, policyholders[0])', function () {
			it('27: Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id+1, policyholders[0]).should.be.rejectedWith('revert');
			});

			it('28: Should fail if address is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, outsider).should.be.rejectedWith('revert');			
			});

			it('29: Should fail if not a pre-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				await time.increase(time.duration.days(3));
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]).should.be.rejectedWith('revert');
			});

			it('30: Should return 0 if already paid', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);

				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var shouldPayTotal = amountData[0].toNumber() + amountData[1].toNumber() + amountData[2].toNumber();
				assert.equal(shouldPayTotal, 0);
			});

			// current period (#2)- first 3 days (pre-period)
			// previous period (#1) - last 3 days of active period
			it('31: Should return correct if pre-period of a new period, but old one is still running', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);

				await time.increase(time.duration.days(30));
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				assert.equal(amountData[0].toNumber()/1e18, 20);
				assert.equal(amountData[1].toNumber()/1e18, 5);
				assert.equal(amountData[2].toNumber()/1e18, 12.5);
			});

			it('32: Should return correct value for 5 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $5 
				// loan repayment should be $12.5
				var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					policyholders, 
					policyholderSubgroups, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);				
				assert.equal(amountData[0].toNumber()/1e18, 20);
				assert.equal(amountData[1].toNumber()/1e18, 5);
				assert.equal(amountData[2].toNumber()/1e18, 12.5);
			});

			it('33: Should return correct value for 6 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $4 
				// loan repayment should be ??? 

				var policyholderSubgroupsModified = [ 
					0, 0, 0, 0, 0, 0,
					1, 1, 1, 1, 1, 1,
					2, 2, 2, 2, 2, 2,
					3, 3, 3, 3, 3, 3,
					4, 4, 4, 4, 4, 4,
					5, 5, 5, 5, 5, 5,
					6, 6, 6, 6, 6, 6, 6,
					7, 7, 7, 7, 7, 7, 7
				]				
				var tx = await tandaPayLedger.
					createNewTandaGroup(
						secretary,
						policyholders, 
						policyholderSubgroupsModified,
						monthToRepayTheLoan, 
						premiumCostDai, 
						maxClaimDai, 
						{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);				
				assert.equal(amountData[0].toNumber()/1e18, 20);
				assert.equal(amountData[1].toNumber()/1e18, 4);
				assert.equal(amountData[2].toNumber()/1e18, 12);			
			});

			it('34: Should return correct value for 7 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $3.34 
				// loan repayment should be ??? 
				var policyholderSubgroupsModified = [ 
					0, 0, 0, 0, 0, 0, 0,
					1, 1, 1, 1, 1, 1,
					2, 2, 2, 2, 2, 2,
					3, 3, 3, 3, 3, 3,
					4, 4, 4, 4, 4, 4,
					5, 5, 5, 5, 5, 5,
					6, 6, 6, 6, 6, 6,
					7, 7, 7, 7, 7, 7, 7
				]				
				var tx = await tandaPayLedger.
					createNewTandaGroup(
						secretary,
						policyholders, 
						policyholderSubgroupsModified,
						monthToRepayTheLoan, 
						premiumCostDai, 
						maxClaimDai, 
						{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);				
				assert.equal(amountData[0].toNumber()/1e18, 20);
				assert.equal(amountData[1].toNumber()/1e18, 3.34);
				assert.equal(amountData[2].toNumber()/1e18, 11.67);				
			});
		});

		describe('getCurrentPeriodInfo()', function () {
			beforeEach(async() => {
				var tx = await tandaPayLedger.
					createNewTandaGroup(
						secretary,
						policyholders, 
						policyholderSubgroups, 
						monthToRepayTheLoan, 
						premiumCostDai, 
						maxClaimDai, 
						{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
			});

			it('35: Should fail if groupID is wrong', async() => {
				var data = await tandaPayLedger.getCurrentPeriodInfo(id+1).should.be.rejectedWith('revert');
			});

			it('36: Should return period 0, pre-period', async() => {
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 1);
				assert.equal(data[1].toNumber(), 0);
			});

			it('37: Should return period 0, active', async() => {
				await time.increase(time.duration.days(3));
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 1);
				assert.equal(data[1].toNumber(), 1);				
			});

			it('38: Should return (overlapping) period 0, last 3 days of active and period 1, pre-period', async() => {
				// 1 - move time 30+ days -> second period starts 
				// 2 - call getCurrentPeriodInfo() -> should return periodIndex==1 and subperiodType==PrePeriod
				await time.increase(time.duration.days(30));
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 2);
				assert.equal(data[1].toNumber(), 0);					
			});

			it('39: Should return (overlapping) period 0, post-peiod and period 1, active', async() => {
				// 1 - move time 33+ days -> second period is in the active state
				// 2 - call getCurrentPeriodInfo() -> should return periodIndex==1 and subperiodType==ActivePeriod
				await time.increase(time.duration.days(33));
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 2);
				assert.equal(data[1].toNumber(), 1);	
			});
		});

		describe('getClaimCount()', function () {
			beforeEach(async() => {
				var tx = await tandaPayLedger.
					createNewTandaGroup(
						secretary,
						policyholders, 
						policyholderSubgroups, 
						monthToRepayTheLoan, 
						premiumCostDai, 
						maxClaimDai, 
						{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
			});

			it('40: Should fail if groupID is wrong', async() => {
				var period = 1;
				await time.increase(time.duration.days(3));
				var data = await tandaPayLedger.getClaimCount(id+1, period).should.be.rejectedWith('revert');
			});

			it('41: Should fail if wrong period', async() => {
				var period = 1;
				await time.increase(time.duration.days(3));
				var data = await tandaPayLedger.getClaimCount(id, period+1).should.be.rejectedWith('revert');
			});

			it('42: Should fail if not active period or post-period', async() => {
				var period = 1;
				var data = await tandaPayLedger.getClaimCount(id, period).should.be.rejectedWith('revert');
			});

			it('43: Should return 0 if no claims open', async() => {
				var period = 1;
				await time.increase(time.duration.days(3));
				var data = await tandaPayLedger.getClaimCount(id, period);	
				assert.equal(data.toNumber(), 0);
			});

			it('44: Should return valid count', async() => {
				var period = 1;
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				var tx = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var data = await tandaPayLedger.getClaimCount(id, period);	
				assert.equal(data.toNumber(), 1);				
			});
		});

		describe('getClaimInfo()', function () {
			beforeEach(async() => {
				var tx = await tandaPayLedger.
					createNewTandaGroup(
						secretary,
						policyholders, 
						policyholderSubgroups, 
						monthToRepayTheLoan, 
						premiumCostDai, 
						maxClaimDai, 
						{from:backend}).should.be.fulfilled;
				var id = await getGroupId(tx);
			});


			it('45: Should fail if groupID is wrong', async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 1;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id+1, periodIndex, claimIndex).should.be.rejectedWith('revert');
			});

			it('46: Should fail if wrong period', async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 1;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex+1, claimIndex).should.be.rejectedWith('revert');				
			});

			it('47: Should fail if not active period or post-period', async() => {
				var periodIndex = 1;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex).should.be.rejectedWith('revert');				
			});

			it('48: Should fail if claimIndex is wrong', async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 1;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex+1).should.be.rejectedWith('revert');				
			});

			it('49: Should return valid data', async() => {
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await time.increase(time.duration.days(3));
				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 1;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex);

				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), 0); // coz no finalizeClaims
			});

			// New tests:
			it('50: Should return valid claimAmountDai if claim is still not finalized', async() => {
				// If claim is still not finalized -> claimAmountDai = (_premiumCostDai * group count) / numberOfOpenClaims
				// (but never more than _maxClaimDai)
				
				// 1 - create 3 claims 
				// 2 - check the claimAmountDai value
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[1]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[2]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[3]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[4]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[5]);


				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var premium = data[0].toNumber();

				await time.increase(time.duration.days(3));

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[2], {from:backend}).should.be.fulfilled;
				await time.increase(time.duration.days(30));
				var period = 1;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[3]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[4]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[5]}).should.be.fulfilled;

				var data = await tandaPayLedger.getClaimInfo(id, period, 0);
				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), premium*6/3);

				var data = await tandaPayLedger.getClaimInfo(id, period, 1);
				assert.equal(data[0], policyholders[1]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), premium*6/3);

				var data = await tandaPayLedger.getClaimInfo(id, period, 2);
				assert.equal(data[0], policyholders[2]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), premium*6/3);											
			});

			it('51: Should return valid claimAmountDai if claim is finalized and APPROVED', async() => {
				// If claim is finalized and approved -> claimAmountDai (_premiumCostDai * group count) / numberOfAprovedClaims
				// (but never more than _maxClaimDai)
				//
				// 1 - create 3 claims 
				// 2 - approve 2 of them
				// 3 - check the claimAmountDai value for approved claims
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[1]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[2]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[3]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[4]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[5]);

				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var premium = data[0].toNumber();

				await time.increase(time.duration.days(3));

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[2], {from:backend}).should.be.fulfilled;
				await time.increase(time.duration.days(30));
				var period = 1;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[3]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[4]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, period, false, {from:policyholders[5]}).should.be.fulfilled;

				var data = await tandaPayLedger.getClaimInfo(id, period, 0);
				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), (5*premium)/3);

				var data = await tandaPayLedger.getClaimInfo(id, period, 1);
				assert.equal(data[0], policyholders[1]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), (5*premium)/3);
			});

			it('52: Should return claimAmountDai==ZERO if claim is finalized but REJECTED', async() => {
				// If claim is finalized and rejected -> claimAmountDai is ZERO
				//
				// 1 - create 3 claims 
				// 2 - approve 2 of them
				// 3 - check the claimAmountDai value for rejected claims
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[0]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[1]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[2]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[3]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[4]);
				await payPremium(daiContract, tandaPayLedger, backend, id, policyholders[5]);

				var data = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var premium = data[0].toNumber();

				await time.increase(time.duration.days(3));

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[2], {from:backend}).should.be.fulfilled;
				await time.increase(time.duration.days(30));
				var period = 1;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[3]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, period, true, {from:policyholders[4]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, period, false, {from:policyholders[5]}).should.be.fulfilled;

				var data = await tandaPayLedger.getClaimInfo(id, period, 2);
				assert.equal(data[0], policyholders[2]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), 0);				
			});
		});

		/*describe('getClaimInfo2()', function () {
			// TODO: add a lot of tests here!
			it('53: Should ...',async() => {
			});
		});*/
	});

})
