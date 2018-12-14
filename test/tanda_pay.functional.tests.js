var TandaPayLedger = artifacts.require("./TandaPayLedger");
var DaiContract = artifacts.require("./DaiContract");

const time = require('./helpers/time');
const {	isInArray,
		getSubgroups, 
		getPolicyholders,
		payPremium, 
		getGroupId,
		getClaimId,
		payPremiumsForThem,
		addClaimsForThem,
		finalizeClaimsForThem,
		checkBalancesForThem
	} = require("./helpers/helpers.js");

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('TandaPayLedger|Functional', (accounts) => {
	const backend = accounts[0];
	const cronAccount = accounts[1]; // same as secreary
	const secretary = accounts[1]; // same as cron

	var daiContract;
	var tandaPayLedger; 
	var tandaPayBase;
	var id = 0;

	var GROUP_SIZE_AT_CREATION_MIN = 50;
	var GROUP_SIZE_AT_CREATION_MAX = 55;
	var MONTH_TO_REPAY_LOAN_MIN = 3;
	var MONTH_TO_REPAY_LOAN_MAX = 255;

	var pc = getPolicyholders(GROUP_SIZE_AT_CREATION_MIN);
	pc[0] = accounts[2];
	pc[1] = accounts[3];
	pc[2] = accounts[4];
	pc[3] = accounts[5];
	pc[4] = accounts[6];
	pc[5] = accounts[7];
	pc[6] = accounts[8];
	pc[7] = accounts[9];
	var policyholderSubgroups = getSubgroups(GROUP_SIZE_AT_CREATION_MIN);
	var monthToRepayTheLoan = MONTH_TO_REPAY_LOAN_MIN;
	var premiumCostDai = 20e18;
	var maxClaimDai = 500e18;
	
	describe('Functional tests', function(){
		it('Should return correct values: 3 periods, 8 policyholders, 2 policyholders from 0 subgroup not receive money, 2 policyholders from 1 subgroup receive',async() => {
			daiContract = await DaiContract.new();
			tandaPayLedger = await TandaPayLedger.new(daiContract.address, backend, cronAccount);		
			
				var policyholderSubgroupsModified = [ 
					0, 0, 0, 0, 1, 1, 1, 1,
					0, 0, 0, 1, 1, 1,
					2, 2, 2, 2, 2, 2,
					3, 3, 3, 3, 3, 3,
					4, 4, 4, 4, 4, 4,
					5, 5, 5, 5, 5, 5,
					6, 6, 6, 6, 6, 6,
					7, 7, 7, 7, 7, 7
				]

			var tx = await tandaPayLedger.createNewTandaGroup(
					secretary,
					pc, 
					policyholderSubgroupsModified, 
					monthToRepayTheLoan, 
					premiumCostDai, 
					maxClaimDai, 
					{from:backend}).should.be.fulfilled;
			var id = await getGroupId(tx);

			var data = await tandaPayLedger.getAmountToPay(id, pc[0]);
			var premium = data[0].toNumber();
			var pcPremium = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];

		// 0 DAY
				// 1 period PHASE A
			await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);
		await time.increase(time.duration.days(3)); // 3 DAY
				// 1 period PHASE B
			await addClaimsForThem(tandaPayLedger, backend, id, [pc[0], pc[1], pc[6], pc[7]]); 
		await time.increase(time.duration.days(27)); // 30 DAY
				// 2 period PHASE A
			await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);
		await time.increase(time.duration.days(3)); // 33 DAY
				// 1 period PHASE C
			await finalizeClaimsForThem(tandaPayLedger, backend, id, 
				[pc[2], pc[3], pc[4], pc[5]],
				[false, false, true, true]);
			await tandaPayLedger.processGroup(id, {from:cronAccount});
			var balArr = [0, 0, premium, premium, 0, 0, (8-2)*premium/2, (8-2)*premium/2];
			var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
			await checkBalancesForThem(daiContract, pcToBalCheck, balArr);			
				// 2 period PHASE B
			await addClaimsForThem(tandaPayLedger, backend, id, [pc[0], pc[1], pc[6], pc[7]]);				
		await time.increase(time.duration.days(27));// 60 DAY
				// 3 period PHASE A
			await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);				
		await time.increase(time.duration.days(3)); // 63 DAY
				// 2 period PHASE C
			await finalizeClaimsForThem(tandaPayLedger, backend, id, 
				[pc[2], pc[3], pc[4], pc[5]],
				[false, false, true, true]);
			await tandaPayLedger.processGroup(id, {from:cronAccount});
			var balArr = [0, 0, 2*premium, 2*premium, 0, 0, 2*(8-2)*premium/2, 2*(8-2)*premium/2];
			var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
			await checkBalancesForThem(daiContract, pcToBalCheck, balArr);
				// 3 period PHASE B
			await addClaimsForThem(tandaPayLedger, backend, id, [pc[0], pc[1], pc[6], pc[7]]);
		await time.increase(time.duration.days(30)); // 93 DAY
				// 3 period PHASE C
			await finalizeClaimsForThem(tandaPayLedger, backend, id, 
				[pc[2], pc[3], pc[4], pc[5]],
				[false, false, true, true]);
			await tandaPayLedger.processGroup(id, {from:cronAccount});
			var balArr = [0, 0, 3*premium, 3*premium, 0, 0, 3*(8-2)*premium/2, 3*(8-2)*premium/2];
			var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
			await checkBalancesForThem(daiContract, pcToBalCheck, balArr);
		});

	// 	it('Should return correct values: 3 periods, 8 policyholders, policyholders not votes, only 1 claim; check that commitPremium at 4th period is not work',async() => {
	// 		daiContract = await DaiContract.new();
	// 		tandaPayLedger = await TandaPayLedger.new(daiContract.address, backend, cronAccount);		

	// 		var tx = await tandaPayLedger.createNewTandaGroup(
	// 				secretary,
	// 				pc, 
	// 				policyholderSubgroups, 
	// 				monthToRepayTheLoan, 
	// 				premiumCostDai, 
	// 				maxClaimDai, 
	// 				{from:backend}).should.be.fulfilled;
	// 		var id = await getGroupId(tx);

	// 		var data = await tandaPayLedger.getAmountToPay(id, pc[0]);
	// 		var premium1 = new web3.BigNumber(data[0]);
	// 		var overpaymentDai = new web3.BigNumber(data[1]);
	// 		var loanRepaymentDai = new web3.BigNumber(data[2]);
	// 		var amountToPay = premium1.add(overpaymentDai).add(loanRepaymentDai);

	// 		var premium = data[0].toNumber();
	// 		var pcPremium = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];

	// 	// 0 DAY
	// 			// 1 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);
	// 	await time.increase(time.duration.days(3)); // 3 DAY
	// 			// 1 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0]]); 
	// 	await time.increase(time.duration.days(27)); // 30 DAY
				
	// 			// 2 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);
	// 	await time.increase(time.duration.days(3)); // 33 DAY
	// 			// 1 period PHASE C
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var balArr = [8*premium];
	// 		var pcToBalCheck = [pc[0]];
	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);			
	// 			// 2 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0]]);				
	// 	await time.increase(time.duration.days(27));// 60 DAY
				
	// 			// 3 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);				
	// 	await time.increase(time.duration.days(3)); // 63 DAY
	// 			// 2 period PHASE C
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var balArr = [2*8*premium];
	// 		var pcToBalCheck = [pc[0]];
	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);
	// 			// 3 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0]]);
	// 	await time.increase(time.duration.days(27)); // 90 DAY
				
	// 			// 4 period PHASE A (revert)
	// 		var data = await tandaPayLedger.getAmountToPay(id, pc[0]).should.be.rejectedWith('revert');

	// 		await daiContract.mint(pc[0], amountToPay, {from:backend});
	// 		await daiContract.approve(tandaPayLedger.address, amountToPay, {from:pc[0]});
	// 		await tandaPayLedger.commitPremium(id, amountToPay, {from:pc[0]}).should.be.rejectedWith('revert');
	// 		await daiContract.transfer(backend, amountToPay, {from:pc[0]});
	// 	await time.increase(time.duration.days(3)); // 93 DAY

	// 			// 3 period PHASE C
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var balArr = [3*8*premium];
	// 		var pcToBalCheck = [pc[0]];
	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);
	// 	});
	
	// 	it('Should return correct values: 1 period, 8 policyholders, claims: not rejected but 0 amount',async() => {
	// 		daiContract = await DaiContract.new();
	// 		tandaPayLedger = await TandaPayLedger.new(daiContract.address, backend, cronAccount);		
			
	// 			var policyholderSubgroupsModified = [ 
	// 				7, 0, 0, 0, 1, 1, 1, 1,
	// 				0, 0, 0, 1, 1, 1,
	// 				2, 2, 2, 2, 2, 2,
	// 				3, 3, 3, 3, 3, 3,
	// 				4, 4, 4, 4, 4, 4,
	// 				5, 5, 5, 5, 5, 5,
	// 				6, 6, 6, 6, 6, 6,
	// 				7, 7, 7, 7, 7, 7
	// 			]

	// 		var tx = await tandaPayLedger.createNewTandaGroup(
	// 				secretary,
	// 				pc, 
	// 				policyholderSubgroupsModified, 
	// 				monthToRepayTheLoan, 
	// 				premiumCostDai, 
	// 				maxClaimDai, 
	// 				{from:backend}).should.be.fulfilled;
	// 		var id = await getGroupId(tx);

	// 		var data = await tandaPayLedger.getAmountToPay(id, pc[0]);
	// 		var premium = data[0].toNumber();
	// 		var pcPremium = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];

	// 	// 0 DAY
	// 			// 1 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);
	// 	await time.increase(time.duration.days(3)); // 3 DAY
	// 			// 1 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0]]); 
	// 	await time.increase(time.duration.days(27)); // 30 DAY
	// 	await time.increase(time.duration.days(3)); // 33 DAY
	// 			// 1 period PHASE C
	// 		await finalizeClaimsForThem(tandaPayLedger, backend, id, 
	// 			[pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]],
	// 			[false, false, false, false, false, false, false]);
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var balArr = [premium, premium, premium, premium, premium, premium, premium, premium];
	// 		var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);					
	// 	});

	// 	it('Should return correct values: 1 period, 8 policyholders, maxClaimDai overfill; check secretary balance',async() => {
	// 		daiContract = await DaiContract.new();
	// 		tandaPayLedger = await TandaPayLedger.new(daiContract.address, backend, cronAccount);		
			
	// 		var policyholderSubgroupsModified = [ 
	// 				0, 0, 0, 0, 1, 1, 1, 1,
	// 				0, 0, 0, 1, 1, 1,
	// 				2, 2, 2, 2, 2, 2,
	// 				3, 3, 3, 3, 3, 3,
	// 				4, 4, 4, 4, 4, 4,
	// 				5, 5, 5, 5, 5, 5,
	// 				6, 6, 6, 6, 6, 6,
	// 				7, 7, 7, 7, 7, 7
	// 			]	
	// 		maxClaimDaiModified = 3*premiumCostDai;

	// 		var tx = await tandaPayLedger.createNewTandaGroup(
	// 				secretary,
	// 				pc, 
	// 				policyholderSubgroupsModified, 
	// 				monthToRepayTheLoan, 
	// 				premiumCostDai, 
	// 				maxClaimDaiModified, 
	// 				{from:backend}).should.be.fulfilled;
	// 		var id = await getGroupId(tx);

	// 		var data = await tandaPayLedger.getAmountToPay(id, pc[0]);
	// 		var premium = data[0].toNumber();
	// 		var loanRepaymentDai = data[2].toNumber();
	// 		var pcPremium = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];

	// 	// 0 DAY
	// 			// 1 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);
	// 	await time.increase(time.duration.days(3)); // 3 DAY
	// 			// 1 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0]]); 
	// 	await time.increase(time.duration.days(27)); // 30 DAY
	// 			// 2 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);

	// 	await time.increase(time.duration.days(3)); // 33 DAY
	// 			// 1 period PHASE C
	// 		await finalizeClaimsForThem(tandaPayLedger, backend, id, 
	// 			[pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]],
	// 			[true,  true,  true,  true,  true,  true,  true]);
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
			
	// 		var premiumBN = new web3.BigNumber(premium);			
	// 		var firstCoef = new web3.BigNumber(87).div(24);
	// 		var secCoef = new web3.BigNumber(15).div(24);
	// 		var balArr = [premiumBN.mul(firstCoef), premiumBN.mul(secCoef), premiumBN.mul(secCoef), premiumBN.mul(secCoef), premiumBN.mul(secCoef), premiumBN.mul(secCoef), premiumBN.mul(secCoef), premiumBN.mul(secCoef)];
	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);			
	// 			// 2 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0], pc[1]]);				
	// 	await time.increase(time.duration.days(27));// 60 DAY
	// 			// 3 period PHASE A
	// 		await payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcPremium);				
	// 	await time.increase(time.duration.days(3)); // 63 DAY
	// 			// 2 period PHASE C
	// 		await finalizeClaimsForThem(tandaPayLedger, backend, id, 
	// 			[pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]],
	// 			[true,  true,  true,  true,  true,  true]);
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
			
	// 		var premiumBN = new web3.BigNumber(premium);			
	// 		var firstCoef = new web3.BigNumber(165).div(24);
	// 		var secCoef = new web3.BigNumber(93).div(24);
	// 		var thirdCoef = new web3.BigNumber(21).div(24);
	// 		var balArr = [premiumBN.mul(firstCoef), premiumBN.mul(secCoef), premiumBN.mul(thirdCoef), premiumBN.mul(thirdCoef), premiumBN.mul(thirdCoef), premiumBN.mul(thirdCoef), premiumBN.mul(thirdCoef), premiumBN.mul(thirdCoef)];

	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);
	// 			// 3 period PHASE B
	// 		await addClaimsForThem(tandaPayLedger, backend, id, [pc[0], pc[1], pc[2]]);
	// 	await time.increase(time.duration.days(30)); // 93 DAY
	// 			// 3 period PHASE C
	// 		await finalizeClaimsForThem(tandaPayLedger, backend, id, 
	// 			[pc[3], pc[4], pc[5], pc[6], pc[7]],
	// 			[true,  true,  true,  true,  true]);
	// 		await tandaPayLedger.processGroup(id, {from:cronAccount});
	// 		var premiumBN = new web3.BigNumber(premium);

	// 		var firstCoef = new web3.BigNumber(229).div(24);
	// 		var secCoef = new web3.BigNumber(157).div(24);
	// 		var thirdCoef = new web3.BigNumber(85).div(24);
	// 		var fourthCoef = new web3.BigNumber(21).div(24);
	// 		// var balArr = [premiumBN.mul(3 + 5/8 + 3 + 2/8 + 8/3), (5/8 + 3 + 2/8 + 8/3)*premium, (5/8 + 2/8 + 8/3)*premium, (5/8 + 2/8)*premium, (5/8 + 2/8)*premium, (5/8 + 2/8)*premium, (5/8 + 2/8)*premium, (5/8 + 2/8)*premium];
	// 		var balArr = [premiumBN.mul(firstCoef), premiumBN.mul(secCoef), premiumBN.mul(thirdCoef), premiumBN.mul(fourthCoef), premiumBN.mul(fourthCoef), premiumBN.mul(fourthCoef), premiumBN.mul(fourthCoef), premiumBN.mul(fourthCoef)];
	// 		var pcToBalCheck = [pc[0], pc[1], pc[2], pc[3], pc[4], pc[5], pc[6], pc[7]];
	// 		await checkBalancesForThem(daiContract, pcToBalCheck, balArr);

	// 		var secretaryBalanceShouldBe = 8*3*loanRepaymentDai;
	// 		var secretaryBalance = await daiContract.balanceOf(secretary);
	// 		assert.equal(secretaryBalance.toNumber(), secretaryBalanceShouldBe);
	// 	});
	});
});
