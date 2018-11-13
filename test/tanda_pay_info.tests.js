var TandaPayLedger = artifacts.require("./TandaPayLedger");
var DaiContract = artifacts.require("./DaiContract");

import { getSubgroups, 
	    getPolicyholders, 
	    getPremiumFor, 
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
										 {from:backend				
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
										 {from:backend				
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
										 {from:backend				
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
			// TODO: Is this tests section OK?
			// returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai); 
			it('Should fail if index is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend				
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
										 {from:backend				
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
										 {from:backend				
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
										 {from:backend				
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
				await passHours(33*24);
				
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
			// TODO
			});

			it('Should return valid data after subgroup was auto changed for policyholder', async() => {
			// TODO
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
				await getPremiumFor(id, policyholders[0]);
				var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);
				var shouldPayTotal = amountData[0].toNumber() + amountData[1].toNumber() + amountData[2].toNumber();
				assert.equal(shouldPayTotal, 0);
			});

			// current period (#2)- first 3 days (pre-period)
			// previous period (#1) - last 3 days of active period
			it('Should return correct if pre-period of a new period, but old one is still running', async() => {
				// TODO: what is correct?
				// var tx = await tandaPayLedger.createNewTandaGroup(secretary,
				// 						 policyholders, 
				// 						 policyholderSubgroups, 
				// 						 monthToRepayTheLoan, 
				// 						 premiumCostDai, 
				// 						 maxClaimDai, 
				// 						 {from:backend}).should.be.fulfilled;
				// var id = await getGroudId(tx);
				// var amountData = await tandaPayLedger.getAmountToPay(id, policyholders[0]);			
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
			it('Should fail if groupID is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id+1).should.be.rejectedWith('revert');
			});

			it('Should return period 0, pre-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 0);
				assert.equal(data[1].toNumber(), 0);
			});

			it('Should return period 0, active', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await passHours(3*24);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 0);
				assert.equal(data[1].toNumber(), 1);				
			});

			it('Should return (overlapping) period 0, last 3 days of active and period 1, pre-period', async() => {
				// TODO: overlapping – WAT?
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await passHours(33*24);
				var data = await tandaPayLedger.getCurrentPeriodInfo(id);
				assert.equal(data[0].toNumber(), 1);
				assert.equal(data[1].toNumber(), 0);					
			});

			it('Should return (overlapping) period 0, post-peiod and period 1, active', async() => {
				// TODO: overlapping – WAT?
			});
		});

		describe('getClaimCount()', function () {
		// function getClaimCount(uint _groupID, uint _periodIndex) public view 
			// returns(uint countOut);			
			it('Should fail if groupID is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var period = 0;
				await passHours(3*24);
				var data = await tandaPayLedger.getClaimCount(id+1, period).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var period = 0;
				await passHours(3*24);
				var data = await tandaPayLedger.getClaimCount(id, period+1).should.be.rejectedWith('revert');
			});

			it('Should fail if not active period or post-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var period = 0;
				var data = await tandaPayLedger.getClaimCount(id, period).should.be.rejectedWith('revert');
			});

			it('Should return 0 if no claims open', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var period = 0;
				await passHours(3*24);
				var data = await tandaPayLedger.getClaimCount(id, period);	
				assert.equal(data.toNumber(), 0);
			});

			it('Should return valid count', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				var period = 0;
				await getPremiumFor(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var data = await tandaPayLedger.getClaimCount(id, period);	
				assert.equal(data.toNumber(), 1);				
			});
		});

		describe('getClaimInfo()', function () {
		// function getClaimInfo(uint _groupID, uint _periodIndex, uint _claimIndex) public view 
			// returns(address claimant, ClaimState claimState, uint claimAmountDai);

			it('Should fail if groupID is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await getPremiumFor(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id+1, periodIndex, claimIndex).should.be.rejectedWith('revert');
			});

			it('Should fail if wrong period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await getPremiumFor(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex+1, claimIndex).should.be.rejectedWith('revert');				
			});

			it('Should fail if not active period or post-period', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex).should.be.rejectedWith('revert');				
			});

			it('Should fail if claimIndex is wrong', async() => {
				var tx = await tandaPayLedger.createNewTandaGroup(secretary,
										 policyholders, 
										 policyholderSubgroups, 
										 monthToRepayTheLoan, 
										 premiumCostDai, 
										 maxClaimDai, 
										 {from:backend}).should.be.fulfilled;
				var id = await getGroudId(tx);
				await getPremiumFor(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex+1).should.be.rejectedWith('revert');				
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
				await getPremiumFor(id, policyholders[0]);
				await passHours(3*24);
				var claimId = await tandaPayLedger.addClaim(id, policyholders[0], {from:backend}).should.be.fulfilled;

				var periodIndex = 0;
				var claimIndex = 0
				var data = await tandaPayLedger.getClaimInfo(id, periodIndex, claimIndex);

				assert.equal(data[0], policyholders[0]);
				assert.equal(data[1].toNumber(), 0);
				assert.equal(data[1].toNumber(), maxClaimDai); // TODO: or not?
			});
		});

		describe('getClaimInfo2()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});
	});

})
