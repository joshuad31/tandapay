var TandaPayLedger = artifacts.require("./TandaPayLedger");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('TandaPayLedger', (accounts) => {
	const backend = accounts[0];
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
										 {from:backend});
		var id = await getGroudId(tx);		
	});

	describe('ITandaPayLedgerInfo interface', function(){

		describe('getTandaGroupCountForSecretary()', function () {
			it('Should return 0 if no groups',async() => {
			});

			it('Should return 0 if no groups for current secretary',async() => {
			});

			it('Should return 1 if one group',async() => {
			});
		});

		describe('getTandaGroupIDForSecretary()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should return valid group ID if index is OK', async() => {
			});
		});

		describe('getTandaGroupCount()', function () {
			it('Should return 0 if no groups',async() => {
			});

			it('Should return 1 if one group',async() => {
			});
		});

		describe('getTandaGroupID()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should return valid group ID if index is OK', async() => {
			});
		});

		describe('getGroupInfo()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should return all data', async() => {
			});
		});

		describe('getGroupInfo2()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should return all data for pre-period', async() => {
			});

			it('Should return updated data for active period', async() => {
			});

			it('Should return updated data for post-period period', async() => {
			});

			it('Should return all data for next period', async() => {
			});
		});

		describe('getSubgroupInfo()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should fail if subgroup index is wrong', async() => {
			});

			it('Should return valid data', async() => {
			});

			it('Should return valid data when policyholder requested to change the subgroup', async() => {
			});

			it('Should return valid data after subgroup was auto changed for policyholder', async() => {
			});
		});

		describe('getPolicyholderInfo()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should fail if address is wrong', async() => {
			});

			it('Should return valid data', async() => {
			});

			it('Should return valid data when policyholder requested to change the subgroup', async() => {
			});

			it('Should return valid data after subgroup was auto changed for policyholder', async() => {
			});
		});

		describe('getAmountToPay()', function () {
			it('Should fail if index is wrong', async() => {
			});

			it('Should fail if address is wrong', async() => {
			});

			it('Should fail if not a pre-period', async() => {
			});

			it('Should return 0 if already paid', async() => {
			});

			// current period (#2)- first 3 days (pre-period)
			// previous period (#1) - last 3 days of active period
			it('Should return correct if pre-period of a new period, but old one is still running', async() => {
			});

			it('Should return correct value for 5 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $5 
				// loan repayment should be $12.5
			});

			it('Should return correct value for 6 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $4 
				// loan repayment should be ??? 
			});

			it('Should return correct value for 7 subgroup members and $20 premium', async() => {
				// premium should be $20 
				// overpayment should be $3.34 
				// loan repayment should be ??? 
			});
		});

		describe('getCurrentPeriodInfo()', function () {
			it('Should fail if groupID is wrong', async() => {
			});

			it('Should return period 0, pre-period', async() => {
			});

			it('Should return period 0, active', async() => {
			});

			it('Should return (overlapping) period 0, last 3 days of active and period 1, pre-period', async() => {
			});

			it('Should return (overlapping) period 0, post-peiod and period 1, active', async() => {
			});
		});

		describe('getClaimCount()', function () {
			it('Should fail if groupID is wrong', async() => {
			});

			it('Should fail if wrong period', async() => {
			});

			it('Should fail if not active period or post-period', async() => {
			});

			it('Should return 0 if no claims open', async() => {
			});

			it('Should return 0 if no claims open', async() => {
			});

			it('Should return valid count', async() => {
			});
		});

		describe('getClaimInfo()', function () {
			it('Should fail if groupID is wrong', async() => {
			});

			it('Should fail if wrong period', async() => {
			});

			it('Should fail if not active period or post-period', async() => {
			});

			it('Should fail if claimIndex is wrong', async() => {
			});

			it('Should return valid data', async() => {
			});
		});

		describe('getClaimInfo2()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});
	});

});
