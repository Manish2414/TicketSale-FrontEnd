pragma solidity ^0.8.17;

contract TicketSale {
    struct Ticket {
        address owner;
        uint256 price;
        bool forSale;
    }

    address public manager;
    uint256 public ticketPrice;
    uint256 public totalTickets;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256) public ticketOwners;
    mapping(address => mapping(address => uint256)) public swapOffers;

    constructor(uint256 numTickets, uint256 price) {
        manager = msg.sender;
        totalTickets = numTickets;
        ticketPrice = price;
    }

    function buyTicket(uint256 ticketId) public payable {
        require(ticketId > 0 && ticketId <= totalTickets, "Invalid ticket ID");
        require(tickets[ticketId].owner == address(0), "Ticket already sold");
        require(ticketOwners[msg.sender] == 0, "You already own a ticket");
        require(msg.value == ticketPrice, "Incorrect payment amount");

        tickets[ticketId].owner = msg.sender;
        ticketOwners[msg.sender] = ticketId;
    }

    function getTicketOf(address person) public view returns (uint256) {
        return ticketOwners[person];
    }

    function offerSwap(uint256 ticketId) public {
        uint256 myTicketId = ticketOwners[msg.sender];
        require(myTicketId != 0, "You don't own a ticket");
        require(tickets[ticketId].owner != address(0), "Target ticket not sold");
        require(tickets[ticketId].owner != msg.sender, "Cannot swap with yourself");

        address targetOwner = tickets[ticketId].owner;
        swapOffers[msg.sender][targetOwner] = myTicketId;
    }

    function acceptSwap(uint256 myTicketId) public {
        require(ticketOwners[msg.sender] == myTicketId, "You don't own this ticket");

        address swapPartner;
        uint256 offeredTicketId;

        for (uint256 i = 1; i <= totalTickets; i++) {
            if (swapOffers[tickets[i].owner][msg.sender] != 0) {
                swapPartner = tickets[i].owner;
                offeredTicketId = swapOffers[swapPartner][msg.sender];
                break;
            }
        }

        require(offeredTicketId != 0, "No swap offer for you");

        tickets[myTicketId].owner = swapPartner;
        tickets[offeredTicketId].owner = msg.sender;
        ticketOwners[msg.sender] = offeredTicketId;
        ticketOwners[swapPartner] = myTicketId;

        delete swapOffers[swapPartner][msg.sender];
    }

    function resaleTicket(uint256 price) public {
        uint256 ticketId = ticketOwners[msg.sender];
        require(ticketId != 0, "You don't own a ticket");

        tickets[ticketId].price = price;
        tickets[ticketId].forSale = true;
    }

    function acceptResale(uint256 ticketId) public payable {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.forSale, "Ticket not for sale");
        require(ticketOwners[msg.sender] == 0, "You already own a ticket");
        require(msg.value == ticket.price, "Incorrect payment amount");

        address seller = ticket.owner;
        uint256 serviceFee = (ticket.price * 10) / 100;
        uint256 sellerAmount = ticket.price - serviceFee;

        payable(seller).transfer(sellerAmount);
        payable(manager).transfer(serviceFee);

        ticket.owner = msg.sender;
        ticket.forSale = false;
        ticketOwners[msg.sender] = ticketId;
        delete ticketOwners[seller];
    }

    function checkResale() public view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= totalTickets; i++) {
            if (tickets[i].forSale) {
                count++;
            }
        }

        uint256[] memory resaleTickets = new uint256[](count * 2);
        uint256 index = 0;
        for (uint256 i = 1; i <= totalTickets; i++) {
            if (tickets[i].forSale) {
                resaleTickets[index] = i;
                resaleTickets[index + 1] = tickets[i].price;
                index += 2;
            }
        }

        return resaleTickets;
    }
}
