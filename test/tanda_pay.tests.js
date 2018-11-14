var TandaPayLedger = artifacts.require("./TandaPayLedger");

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('TandaPayLedger', (accounts) => {
	const creator = accounts[0];

	before(async() => {

	});

	beforeEach(async() => {

	});

	describe('ITandaPayLedger interface', function(){

		describe('transferBackendAccount()', function () {
			it('Should not be callable by non backend account',async() => {
			});

			it('Should change the backend account',async() => {
			});
		});

		describe('transferCronAccount()', function () {
			it('Should not be callable by non backend account',async() => {
			});

			it('Should change the cron account',async() => {
			});
		});

		describe('createNewTandaGroup()', function () {
			it('Should not be callable by non backend account',async() => {
			});

			it('Should not be callable with different count of _policyholders and _policyholderSubgroups',async() => {
			});

			it('Should not be callable with _policyholders.count less than GROUP_SIZE_AT_CREATION_MIN',async() => {
			});

			it('Should not be callable with _policyholders.count more than GROUP_SIZE_AT_CREATION_MAX',async() => {
			});

			it('Should not be callable with _monthToRepayTheLoan less than MONTH_TO_REPAY_LOAN_MIN',async() => {
			});

			it('Should not be callable with _monthToRepayTheLoan more than MONTH_TO_REPAY_LOAN_MAX',async() => {
			});
			
			it('Should not be callable with _premiumCostDai==0',async() => {
			});

			it('Should not be callable with _maxClaimDai==0',async() => {
			});

			it('Should not be callable with _maxClaimDai>=(_premiumCostDai * group count)',async() => {
			});

			/*
			it('Should not create a group if any policyholder is in >1 subgroup',async() => {
				// check NOT IMPLEMENTED IN SMART CONTRACTS!!!
			});

			it('Should not create a group if any subgroup has <5 members and/or >7 members',async() => {
				// check NOT IMPLEMENTED IN SMART CONTRACTS!!!
			});
			*/

			it('Should create new group and return new ID',async() => {

			});

			it('Should create 2 groups with different IDs',async() => {

			});
		});

		describe('addClaim()', function () {
			it('Should not be callable by non backend account',async() => {
			});

			it('Should fail if wrong GroupID',async() => {
			});

			it('Should fail if period!=active',async() => {
			});

			it('Should fail if policyholder (_claimantAddress) is not in the current group',async() => {
			});

			it('Should fail if policyholder has not paid during pre-period',async() => {
			});

			it('Should fail if policyholder has already opened claim',async() => {
			});

			it('Should open claim and return valid claim index',async() => {
			});

			it('Should open 2 claims and return valid claim indexes',async() => {
			});
		});

		describe('removePolicyholderFromGroup()', function () {
			it('Should not be callable by non backend account',async() => {
			});

			it('Should fail if wrong GroupID',async() => {
			});

			it('Should fail if policyholder is not in the current group',async() => {
			});

			it('Should fail if period!=active AND period!=pre-period',async() => {
			});

			it('Should fail if premium is paid by policyholder',async() => {
			});

			it('Should succeed if all params are OK',async() => {
			});
		});


		describe('commitPremium()', function () {
			it('Should not be callable by non policyholder account',async() => {
			});

			it('Should fail if wrong GroupID',async() => {
			});

			it('Should fail if period!=pre-period',async() => {
			});

			it('Should fail if user did not approved DAIs',async() => {
			});

			it('Should fail if user paid before',async() => {
			});
		});

		describe('addChangeSubgroupRequest()', function () {
			it('Should not be callable by non policyholder account',async() => {
			});

			it('Should fail if wrong GroupID',async() => {
			});

			it('Should fail if period!=active (first 27 days only!)',async() => {
			});

			it('Should fail if user has open claims',async() => {
			});

			it('Should fail if user already requested subgroup switch',async() => {
			});

			it('Should add request to change the subgroup',async() => {
				// TODO: check the current subgroup and next subgroup here!
			});

			it('Should switch group automatically if 27 days of active period ended',async() => {
				// TODO: check the current subgroup and next subgroup here!
			});
		});

		describe('finalizeClaims()', function () {
			it('Should not be callable by non policyholder account',async() => {
			});

			it('Should fail if wrong GroupID',async() => {
			});

			it('Should fail if user has opened claim',async() => {

			});

			it('Should fail if period!=post-period',async() => {

			});

			it('Should fail if user already finalized (selected loyalist/defector option before)',async() => {
			});

			it('Should auto choose <loyalist> if no answer in 3 days (when post period ended)',async() => {
			});
		});

		describe('processGroup()', function () {
			// TODO: still not sure
		});
	});
});
