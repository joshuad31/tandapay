pragma solidity ^0.4.23;

import "./ITandaPayLedger.sol";
import "./ITandaPayLedgerInfo.sol";

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

///////////////////////////////////////////////
// TODO:
contract TandaPayLedger is ITandaPayLedgerInfo, ITandaPayLedger {
	address public backendAccount;
	address public cronAccount;
		
	constructor(ERC20 daiContract) public {
		// TODO:
	}
}
