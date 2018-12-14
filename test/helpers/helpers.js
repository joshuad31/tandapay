function getSubgroups(count) {
	// this is used to get array like that [0,0,0,1,1,1,1,2,2,2,2...]
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

function getRandomSymb() {
	var x = Math.random();
	if(x<0.1) {
		return '0';
	} else if(x<0.2){
		return '1';
	} else if(x<0.3){
		return '2';
	} else if(x<0.4){
		return '3';
	} else if(x<0.5){
		return '4';
	} else if(x<0.6){
		return '5';
	} else{
		return 'a';
	}
}

function getPolicyholders(count) {
	var arr = [];
	for(var i=0; i<count; i++) {
		var addr = '0x';
		for(var j=0; j<40; j++) {
			addr += getRandomSymb();
		}	
		arr.push(addr);
	}
	return arr;
}


async function payPremium(daiContract, tandaPayLedger, backend, id, pc) {
	var data = await tandaPayLedger.getAmountToPay(id, pc);
	var premium = new web3.BigNumber(data[0]);
	var overpaymentDai = new web3.BigNumber(data[1]);
	var loanRepaymentDai = new web3.BigNumber(data[2]);
	var amountToPay = premium.add(overpaymentDai).add(loanRepaymentDai);
	await daiContract.mint(pc, amountToPay, {from:backend});
	await daiContract.approve(tandaPayLedger.address, amountToPay, {from:pc});
	await tandaPayLedger.commitPremium(id, amountToPay, {from:pc});
}

function isInArray(arr, o) {
	var out = false;
	for(var i=0; i<arr.length; i++) {
		if(arr[i]==o) {
			out = true;
		}
	}
	return out;
}

async function payPremiumsForThem(daiContract, tandaPayLedger, backend, id, pcArr) {
	var data;
	var premium;
	for(var i=0; i<pcArr.length; i++) {
		// console.log('------------------', i);
		// var PremiumToPay =  (await tandaPayLedger.getPremium(id,pcArr[i])).toNumber();
		// console.log('Premium:', PremiumToPay);
		// var LoanRepaymentToPay =  (await tandaPayLedger.getLoanRepayment(id,pcArr[i])).toNumber();
		// console.log('LoanRepayment:', LoanRepaymentToPay);
		// var OverpaymentToPay =  (await tandaPayLedger.getOverpayment(id,pcArr[i])).toNumber();	
		// console.log('Overpayment:', OverpaymentToPay);		



		// var PremiumToPay =  (await tandaPayLedger.getPremiumToPay(id,pcArr[i])).toNumber();
		// console.log('PremiumToPay:', PremiumToPay);
		// var LoanRepaymentToPay =  (await tandaPayLedger.getLoanRepaymentToPay(id,pcArr[i])).toNumber();
		// console.log('LoanRepaymentToPay:', LoanRepaymentToPay);
		// var OverpaymentToPay =  (await tandaPayLedger.getOverpaymentToPay(id,pcArr[i])).toNumber();	
		// console.log('OverpaymentToPay:', OverpaymentToPay);		

		data = await tandaPayLedger.getAmountToPay(id,pcArr[i]);
		premium = data[0].toNumber();

		await payPremium(daiContract, tandaPayLedger, backend, id, pcArr[i]);
	}
}

async function addClaimsForThem(tandaPayLedger, backend, id, pcArr) {
	for(var i=0; i<pcArr.length; i++) {
		await tandaPayLedger.addClaim(id, pcArr[i], {from:backend});
	}
}

async function finalizeClaimsForThem(tandaPayLedger, backend, id, pcArr, ansArr) {
	for(var i=0; i<pcArr.length; i++) {
		await tandaPayLedger.finalizeClaims(id, ansArr[i], {from:pcArr[i]});
	}
}

async function checkBalancesForThem(daiContract, pcArr, balArr) {
	for(var i=0; i<pcArr.length; i++) {
		var balance = await daiContract.balanceOf(pcArr[i]);
		if(typeof(pcArr[i])==="object"){
			assert.equal(balance.toNumber(), balArr[i].toNumber());
		} else {
			assert.equal(balance.toNumber(), balArr[i]);
		}
	}
}

const getGroupId = tx=> tx.logs.filter(l => l.event == 'NewGroup')[0].args._groupId.toNumber();
const getClaimId = tx=> tx.logs.filter(l => l.event == 'NewClaim')[0].args._claimId.toNumber();

module.exports.getSubgroups = getSubgroups;
module.exports.getPolicyholders = getPolicyholders;
module.exports.payPremium = payPremium;
module.exports.getGroupId = getGroupId;
module.exports.getClaimId = getClaimId;
module.exports.isInArray = isInArray;
module.exports.payPremiumsForThem = payPremiumsForThem;
module.exports.addClaimsForThem = addClaimsForThem;
module.exports.finalizeClaimsForThem = finalizeClaimsForThem;
module.exports.checkBalancesForThem = checkBalancesForThem;