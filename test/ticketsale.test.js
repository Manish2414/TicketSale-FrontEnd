const assert = require("assert");
const ganache = require("ganache-cli");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());
const { abi, bytecode } = require("../compile");

let accounts, ticketSale;

beforeEach(async () => {
  // Fetch all accounts
  accounts = await web3.eth.getAccounts();

  // Deploy contract with constructor parameters
  ticketSale = await new web3.eth.Contract(abi)
    .deploy({
      data: bytecode,
      arguments: [10, 100], // Set number of tickets (10) and price (100 each)
    })
    .send({ from: accounts[0], gasPrice: 8000000000, gas: 4700000 });
});

describe("TicketSale Contract", () => {
  it("deploys successfully", () => {
    assert.ok(ticketSale.options.address);
  });

  it("allows ticket purchase", async () => {
    const ticketId = 1;
    const buyer = accounts[1];
    const initialBalance = await web3.eth.getBalance(buyer);

    // Buyer purchases ticket
    await ticketSale.methods.buyTicket(ticketId).send({
      from: buyer,
      value: 100,
    });

    // Check ticket ownership
    const ticketOwned = parseInt(
      await ticketSale.methods.getTicketOf(buyer).call()
    );
    const finalBalance = await web3.eth.getBalance(buyer);

    assert.equal(ticketOwned, ticketId, "Ticket should match purchased ID");
    assert(
      web3.utils.toBN(initialBalance).gt(web3.utils.toBN(finalBalance)),
      "Buyer's balance should decrease"
    );

    // Validate buyer is now owner of the ticket
    const buyerTicket = await ticketSale.methods.tickets(ticketId).call();
    assert.equal(buyerTicket.owner, buyer, "Ticket should belong to buyer");
  });

  it("enables ticket swap offer", async () => {
    const buyer1 = accounts[2];
    const buyer2 = accounts[3];
    const ticketId1 = 2;
    const ticketId2 = 3;

    // Both buyers purchase tickets
    await ticketSale.methods.buyTicket(ticketId1).send({ from: buyer1, value: 100 });
    await ticketSale.methods.buyTicket(ticketId2).send({ from: buyer2, value: 100 });

    // Buyer1 offers to swap with buyer2's ticket
    await ticketSale.methods.offerSwap(ticketId2).send({ from: buyer1 });

    // Validate swap offer recorded correctly
    const swapOffer = parseInt(await ticketSale.methods.swapOffers(buyer1, buyer2).call());
    assert.equal(swapOffer, ticketId1, "Swap offer should match buyer1's ticket");

    // Confirm both buyers still own their original tickets
    const buyer1Ticket = parseInt(await ticketSale.methods.getTicketOf(buyer1).call());
    const buyer2Ticket = parseInt(await ticketSale.methods.getTicketOf(buyer2).call());
    assert.equal(buyer1Ticket, ticketId1, "Buyer1 should retain their ticket");
    assert.equal(buyer2Ticket, ticketId2, "Buyer2 should retain their ticket");
  });

  it("processes ticket swap acceptance", async () => {
    const buyer1 = accounts[4];
    const buyer2 = accounts[5];
    const ticketId1 = 4;
    const ticketId2 = 5;

    // Both buyers purchase tickets
    await ticketSale.methods.buyTicket(ticketId1).send({ from: buyer1, value: 100 });
    await ticketSale.methods.buyTicket(ticketId2).send({ from: buyer2, value: 100 });

    // Initial ticket ownership
    const buyer1InitialTicket = parseInt(await ticketSale.methods.getTicketOf(buyer1).call());
    const buyer2InitialTicket = parseInt(await ticketSale.methods.getTicketOf(buyer2).call());

    // Buyer1 offers to swap with buyer2's ticket
    await ticketSale.methods.offerSwap(ticketId2).send({ from: buyer1 });

    // Buyer2 accepts the swap offer
    await ticketSale.methods.acceptSwap(ticketId2).send({ from: buyer2 });

    // Validate ticket ownership post-swap
    const buyer1NewTicket = parseInt(await ticketSale.methods.getTicketOf(buyer1).call());
    const buyer2NewTicket = parseInt(await ticketSale.methods.getTicketOf(buyer2).call());
    assert.equal(buyer1NewTicket, ticketId2, "Buyer1 should now own ticket2");
    assert.equal(buyer2NewTicket, ticketId1, "Buyer2 should now own ticket1");
  });

  it("enables ticket resale", async () => {
    const buyer = accounts[6];
    const ticketId = 6;
    const initialPrice = 100;
    const resalePrice = 120;

    // Buyer purchases ticket
    await ticketSale.methods.buyTicket(ticketId).send({ from: buyer, value: initialPrice });

    // Verify initial ownership and price
    const ownedTicket = parseInt(await ticketSale.methods.getTicketOf(buyer).call());
    assert.equal(ownedTicket, ticketId, "Buyer should initially own the ticket");

    // Buyer puts ticket up for resale
    await ticketSale.methods.resaleTicket(resalePrice).send({ from: buyer });

    // Verify resale status and price
    const resaleTicketDetails = await ticketSale.methods.tickets(ticketId).call();
    assert.equal(resaleTicketDetails.price, resalePrice, "Resale price should be updated");
    assert.equal(resaleTicketDetails.forSale, true, "Ticket should be for sale");

    // Confirm ticket is in the resale list
    const resaleList = await ticketSale.methods.checkResale().call();
    assert(resaleList.includes(ticketId.toString()), "Ticket should appear in resale list");
  });

  it("facilitates resale ticket purchase", async () => {
    const seller = accounts[7];
    const buyer = accounts[8];
    const manager = await ticketSale.methods.manager().call();
    const ticketId = 7;
    const initialPrice = 100;
    const resalePrice = 120;

    // Seller purchases ticket and puts it up for resale
    await ticketSale.methods.buyTicket(ticketId).send({ from: seller, value: initialPrice });
    await ticketSale.methods.resaleTicket(resalePrice).send({ from: seller });

    // Track initial balances
    const initialSellerBalance = await web3.eth.getBalance(seller);
    const initialManagerBalance = await web3.eth.getBalance(manager);

    // Buyer purchases the resale ticket
    await ticketSale.methods.acceptResale(ticketId).send({ from: buyer, value: resalePrice });

    // Confirm new ownership and that the ticket is no longer for sale
    const newOwner = parseInt(await ticketSale.methods.getTicketOf(buyer).call());
    assert.equal(newOwner, ticketId, "Buyer should own the resale ticket");
    const ticketDetails = await ticketSale.methods.tickets(ticketId).call();
    assert.equal(ticketDetails.forSale, false, "Ticket should no longer be for sale");

    // Confirm seller no longer owns the ticket
    const sellerTicket = parseInt(await ticketSale.methods.getTicketOf(seller).call());
    assert.equal(sellerTicket, 0, "Seller should no longer own a ticket");

    // Verify financial transactions (service fee and seller amount)
    const serviceFee = web3.utils.toBN(resalePrice).mul(web3.utils.toBN(10)).div(web3.utils.toBN(100));
    const sellerAmount = web3.utils.toBN(resalePrice).sub(serviceFee);

    const finalSellerBalance = await web3.eth.getBalance(seller);
    assert.equal(
      web3.utils.toBN(finalSellerBalance).sub(web3.utils.toBN(initialSellerBalance)).toString(),
      sellerAmount.toString(),
      "Seller should receive correct resale amount"
    );

    const finalManagerBalance = await web3.eth.getBalance(manager);
    assert.equal(
      web3.utils.toBN(finalManagerBalance).sub(web3.utils.toBN(initialManagerBalance)).toString(),
      serviceFee.toString(),
      "Manager should receive correct service fee"
    );
  });
});
