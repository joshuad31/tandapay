var TandaPayLedger = artifacts.require("./TandaPayLedger");
var DaiContract = artifacts.require("./DaiContract");

import { getSubgroups, 
	    getPolicyholders, 
	    payPremium, 
	    getGroupId } from "./helpers/helpers.js";

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

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
		daiContract = await DaiContract.new();
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

	const creator = accounts[0];

	before(async() => {

	});

	describe('ITandaPayLedgerInfo interface', function(){

		describe('getTandaGroupCountForSecretary()', function () {
			it('Should return 0 if no groups',async() => {
				var count = var await tandaPayLedger.getTandaGroupCountForSecretary(secretary);
				assert.equal(count.toNumber(), 0);
			});

			it('Should return 0 if no groups for current secretary',async() => {
				var secretary2 = accounts[2];
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);	

				var count = var await tandaPayLedger.getTandaGroupCountForSecretary(secretary);
				assert.equal(count.toNumber(), 0);				
			});

			it('Should return 1 if one group',async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);	

				var count = var await tandaPayLedger.getTandaGroupCountForSecretary(secretary);
				assert.equal(count.toNumber(), 1);						
			});
		});

		describe('getTandaGroupIDForSecretary()', function () {
			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);	
				var groupId = var await tandaPayLedger.getTandaGroupIDForSecretary(secretary, 1).should.be.rejectedWith('revert');
			});

			it('Should return valid group ID if index is OK', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);	
				var groupId = var await tandaPayLedger.getTandaGroupIDForSecretary(secretary, 0).should.be.fulfilled;
			});
		});

		describe('getTandaGroupCount()', function () {
			it('Should return 0 if no groups',async() => {
				var count = await tandaPayLedger.getTandaGroupCount();
				assert.equal(count.toNumber(), 0);		
			});

			it('Should return 1 if one group',async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);	

				var count = await tandaPayLedger.getTandaGroupCount();
				assert.equal(count.toNumber(), 1);		
			});
		});

		describe('getTandaGroupID()', function () {
			it('Should fail if index is wrong', async() => {
				await tandaPayLedger.getTandaGroupID().should.be.rejectedWith('revert');
			});

			it('Should return valid group ID if index is OK', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});				
				var groupId = await tandaPayLedger.getTandaGroupID(0).should.be.fulfilled;
				// TODO: what is valid? Is _index == groupId?
			});
		});

		describe('getGroupInfo()', function () {
			// returns(address secretary, uint subgroupsTotal, uint monthToRepayTheLoan, uint premiumCostDai, uint maxClaimDai); 
			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});
				var id = await getGroudId(tx);
				await tandaPayLedger.getGroupInfo(id+1).should.be.rejectedWith('revert');
			});

			it('Should return all data', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});
				var id = await getGroudId(tx);
				var groupData = await tandaPayLedger.getGroupInfo(id).should.be.fulfilled;
				assert.equal(groupData[0], secretary);
				assert.equal(groupData[1].toNumber(), 10);
				assert.equal(groupData[2].toNumber(), monthToRepayTheLoan);
				assert.equal(groupData[3].toNumber(), premiumCostDai);
				assert.equal(groupData[4].toNumber(), maxClaimDai);
			});
		});

		describe('getGroupInfo2()', function () {
			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});
				var id = await getGroudId(tx);
				var groupData = await tandaPayLedger.getGroupInfo2(id+1).should.be.rejectedWith('revert');
			});

			it('Should return all data for pre-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});
				var id = await getGroudId(tx);
				var groupData = await tandaPayLedger.getGroupInfo2(id).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);
			});

			it('Should return updated data for active period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});
				var id = await getGroudId(tx);
				await passHours(3*24);

				var groupData = await tandaPayLedger.getGroupInfo2(id).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);				
			});

			it('Should return updated data for post-period period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend});
				var id = await getGroudId(tx);
				await passHours(30*24);
				
				var groupData = await tandaPayLedger.getGroupInfo2(id).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);				
			});

			it('Should return all data for next period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await passHours(30*24);
				
				var groupData = await tandaPayLedger.getGroupInfo2(id).should.be.fulfilled;
				
				var premiumsTotalDai = 0;
				var overpaymentTotalDai = 0;
				var loanRepaymentTotalDai = 0;
				assert.equal(groupData[0], premiumsTotalDai);
				assert.equal(groupData[1].toNumber(), overpaymentTotalDai);
				assert.equal(groupData[2].toNumber(), loanRepaymentTotalDai);					
			});
		});

		describe('getSubgroupInfo()', function () {
			// function getSubgroupInfo(uint _groupID, uint _subgroupIndex) public view 
			// 	returns(uint policyholdersCount, address[] policyholders);			
			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id+1, subgroupIndex).should.be.rejectedWith('revert');
			});

			it('Should fail if subgroup index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var subgroupIndex = 10;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.rejectedWith('revert');				
			});

			it('Should return valid data', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 5);
				for(var i=0; i<5; i++) {
					assert.equal(info[1][i], policyholders[i]);	
				}
			});

			it('Should return valid data when policyholder requested to change the subgroup', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);

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

			it('Should return valid data after subgroup was auto changed for policyholder', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);

				await tandaPayLedger.addChangeSubgroupRequest(id, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;

				var subgroupIndex = 0;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 4);
				for(var i=0; i<4; i++) {
					assert.equal(info[1][i], policyholders[i+1]);	
				}	

				var subgroupIndex = 1;
				var info = await tandaPayLedger.getSubgroupInfo(id, subgroupIndex).should.be.fulfilled;
				assert.equal(info[0], 6);
				
				assert.equal(info[1][0], policyholders[5]);
				assert.equal(info[1][1], policyholders[6]);
				assert.equal(info[1][2], policyholders[7]);

				assert.equal(info[1][3], policyholders[8]);
				assert.equal(info[1][4], policyholders[9]);
				assert.equal(info[1][5], policyholders[0]);
			});
		});

		describe('getPolicyholderInfo()', function () {
		// function getPolicyholderInfo(uint _groupID, address _policyholder) public view 
			// returns(uint8 currentSubgroupIndex, uint8 nextSubgroupIndex, PolicyholderStatus status);

			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await tandaPayLedger.getPolicyholderInfo(id+1, policyholders[0]).should.be.rejectedWith('revert');
			});

			it('Should fail if address is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await tandaPayLedger.getPolicyholderInfo(id, accounts[99]).should.be.rejectedWith('revert');
			});

			it('Should return valid data', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var data = await tandaPayLedger.getPolicyholderInfo(id, policyholders[0]).should.be.fulfilled;
				assert.equal(data[0], 0);
				assert.equal(data[1], 0);			
			});

			it('Should return valid data when policyholder requested to change the subgroup', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);

				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;				
			
				var data = await tandaPayLedger.getPolicyholderInfo(id, policyholders[0]).should.be.fulfilled;
				assert.equal(data[0], 0);
				assert.equal(data[1], 1);					
			});

			it('Should return valid data after subgroup was auto changed for policyholder', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);

				var newSubgroup = 1;
				await tandaPayLedger.addChangeSubgroupRequest(id+1, newSubgroup, {from:policyholders[0]}).should.be.fulfilled;				
				passHours(30*24);
				var data = await tandaPayLedger.getPolicyholderInfo(id, policyholders[0]).should.be.fulfilled;
				assert.equal(data[0], 1);
				assert.equal(data[1], 1);
			});
		});

		describe('getAmountToPay()', function () {
		// function getAmountToPay(uint _groupID, address _policyholder) public view 
			// returns(uint premiumDai, uint overpaymentDai, uint loanRepaymentDai);			
			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id+1, policyholders[0]).should.be.rejectedWith('revert');
			});

			it('Should fail if address is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, outsider).should.be.rejectedWith('revert');			
			});

			it('Should fail if not a pre-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await passHours(3*24);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]).should.be.rejectedWith('revert');§
			});

			it('Should return 0 if already paid', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);

				var shouldPayTotal = amountData[0].toNumber() + amountData[1].toNumber() + amountData[2].toNumber();
				await payPremium(id, policyholders[0]);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var shouldPayTotal = amountData[0].toNumber() + amountData[1].toNumber() + amountData[2].toNumber();
				assert.equal(shouldPayTotal, 0);
			});

			// current period (#2)- first 3 days (pre-period)
			// previous period (#1) - last 3 days of active period
			it('Should return correct if pre-period of a new period, but old one is still running', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await passHours(30*24);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				assert.equal(amountData[0], 0);
				assert.equal(amountData[1], 0);
				assert.equal(amountData[2], 0);
			});

			it('Should return correct value for 5 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $5 
				// loan repayment should be $12.5
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);				
				assert.equal(amountData[0].toNumber(), 20e18);
				assert.equal(amountData[1].toNumber(), 5e18);
				assert.equal(amountData[2].toNumber(), 12.5*1e18);
			});

			it('Should return correct value for 6 subgroup members and $20 premium', async() => {
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
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroupsModified,
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);				
				assert.equal(amountData[0].toNumber(), 20e18);
				assert.equal(amountData[1].toNumber(), 4e18);
				assert.equal(amountData[2].toNumber(), /*TODO*/);			
			});

			it('Should return correct value for 7 subgroup members and $20 premium', async() => {
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
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroupsModified,
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);				
				assert.equal(amountData[0].toNumber(), 20e18);
				assert.equal(amountData[1].toNumber(), 3.34*1e18);
				assert.equal(amountData[2].toNumber(), /*TODO*/);				
			});
		});

		describe('getCurrentPeriodInfo()', function () {
		// function getCurrentPeriodInfo(uint _groupID) public view 
			// returns(uint8 periodIndex, SubperiodType subperiodType);	
			beforeEach(async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
			});

			it('Should fail if groupID is wrong', async() => {
				var data = await tandaPayLedger.getCurrentPeriodInfo(id+1).should.be.rejectedWith('revert');
			});

			it('Should return period 0, pre-period', async() => {
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 0);
				assert.equal(data[1].toNumber(), 0);
			});

			it('Should return period 0, active', async() => {
				await passHours(3*24);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 0);
				assert.equal(data[1].toNumber(), 1);				
			});

			it('Should return (overlapping) period 0, last 3 days of active and period 1, pre-period', async() => {
				// 1 - move time 30+ days -> second period starts 
				// 2 - call getCurrentPeriodInfo() -> should return periodIndex==1 and subperiodType==PrePeriod
				await passHours(30*24);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 1);
				assert.equal(data[1].toNumber(), 0);					
			});

			it('Should return (overlapping) period 0, post-peiod and period 1, active', async() => {
				// 1 - move time 33+ days -> second period is in the active state
				// 2 - call getCurrentPeriodInfo() -> should return periodIndex==1 and subperiodType==ActivePeriod
				await passHours(33*24);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 1);
				assert.equal(data[1].toNumber(), 1);	
			});
		});

		describe('getClaimCount()', function () {
		// function getClaimCount(uint _groupID, uint _periodIndex) public view 
			// returns(uint countOut);		
			beforeEach(async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
			});

			it('Should fail if groupID is wrong', async() => {
				var period = 0;
				await passHours(3*24);
				var data = await tandaPayLedger.getClaimCount(id+1, period).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong period', async() => {
				var period = 0;
				await passHours(3*24);
				var data = await tandaPayLedger.getClaimCount(id, period+1).should.be.rejectedWith('revert');
			});

			it('Should fail if not active period or post-period', async() => {
				var period = 0;
				var data = await tandaPayLedger.getClaimCount(id, period).should.be.rejectedWith('revert');
			});

			it('Should return 0 if no claims open', async() => {
				var period = 0;
				await passHours(3*24);
				var data = await tandaPayLedger.getClaimCount(id, period);	
				assert.equal(data.toNumber(), 0);
			});

			it('Should return valid count', async() => {
				var period = 0;
				await payPremium(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var data = await tandaPayLedger.getClaimCount(id, period);	
				assert.equal(data.toNumber(), 1);				
			});
		});

		describe('getClaimInfo()', function () {
		// function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view 
			// returns(address claimant, ClaimState claimState, uint claimAmountDai);
			beforeEach(async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
			});

			it('Should fail if groupID is wrong', async() => {
				await payPremium(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id+1, periodIndex, claimIndex).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong period', async() => {
				await payPremium(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex+1, claimIndex).should.be.rejectedWith('revert');				
			});

			it('Should fail if not active period or post-period', async() => {
				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex).should.be.rejectedWith('revert');				
			});

			it('Should fail if claimIndex is wrong', async() => {
				await payPremium(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex+1).should.be.rejectedWith('revert');				
			});

			it('Should return valid data', async() => {
				await payPremium(id, policyholders[0]);
				await passHours(3*24);

				var data = await tandaPayLedger.getAmountToPay();
				var premium = data[0].toNumber();

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex);

				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[1].toNumber(), 0); // coz no finalizeClaims
			});

			// New tests:
			it('Should return valid claimAmountDai if claim is still not finalized', async() => {
				// If claim is still not finalized -> claimAmountDai = (_premiumCostDai * group count) / numberOfOpenClaims
				// (but never more than _maxClaimDai)
				
				// 1 - create 3 claims 
				// 2 - check the claimAmountDai value

				await payPremium(id, policyholders[0]);
				await payPremium(id, policyholders[1]);
				await payPremium(id, policyholders[2]);
				await passHours(3*24);

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[2], {from:backend}).should.be.fulfilled;

				var data = await tandaPayLedger.getAmountToPay();
				var premium = data[0].toNumber();

				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, 0);
				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), 0);

				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, 1);
				assert.equal(data[0], policyholders[1]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), 0);

				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, 2);
				assert.equal(data[0], policyholders[2]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[2].toNumber(), 0);											
			});

			it('Should return valid claimAmountDai if claim is finalized and APPROVED', async() => {
				// If claim is finalized and approved -> claimAmountDai (_premiumCostDai * group count) / numberOfAprovedClaims
				// (but never more than _maxClaimDai)
				//
				// 1 - create 3 claims 
				// 2 - approve 2 of them
				// 3 - check the claimAmountDai value for approved claims

				await payPremium(id, policyholders[0]);
				await payPremium(id, policyholders[1]);
				await payPremium(id, policyholders[2]);
				await passHours(3*24);

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[2], {from:backend}).should.be.fulfilled;

				await tandaPayLedger.finalizeClaims(id, true, {from:policyholders[0]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, true, {from:policyholders[1]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, false, {from:policyholders[2]}).should.be.fulfilled;
				var data = await tandaPayLedger.getAmountToPay();
				var premium = data[0].toNumber();

				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, 0);
				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[1].toNumber(), (2*premium)/3);

				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, 1);
				assert.equal(data[0], policyholders[1]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[1].toNumber(), (2*premium)/3);
			});

			it('Should return claimAmountDai==ZERO if claim is finalized but REJECTED', async() => {
				// If claim is finalized and rejected -> claimAmountDai is ZERO
				//
				// 1 - create 3 claims 
				// 2 - approve 2 of them
				// 3 - check the claimAmountDai value for rejected claims

				await payPremium(id, policyholders[0]);
				await payPremium(id, policyholders[1]);
				await payPremium(id, policyholders[2]);
				await passHours(3*24);

				await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[1], {from:backend}).should.be.fulfilled;
				await tandaPayLedger.addClaim(id, policyholders[2], {from:backend}).should.be.fulfilled;

				await tandaPayLedger.finalizeClaims(id, true, {from:policyholders[0]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, true, {from:policyholders[1]}).should.be.fulfilled;
				await tandaPayLedger.finalizeClaims(id, false, {from:policyholders[2]}).should.be.fulfilled;
				var data = await tandaPayLedger.getAmountToPay();
				var premium = data[0].toNumber();


				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, 2);
				assert.equal(data[0], policyholders[2]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[1].toNumber(), 0);				
			});
		});

		describe('getClaimInfo2()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});
	});

})
