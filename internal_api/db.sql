CREATE TABLE currencies (
    address VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    decimals INT
);

CREATE TABLE orders (
    orderId INT AUTO_INCREMENT PRIMARY KEY,
    currency VARCHAR(255),
    currencyName VARCHAR(100),
    currencyDecimals INT,
    price VARCHAR(255),
    raffleId INT,
    ticketId VARCHAR(255),
    bought VARCHAR(20),
    boughtBy VARCHAR(50),
    seller VARCHAR(100),
    signature TEXT
);

CREATE TABLE raffles (
    raffleId INT PRIMARY KEY,
    assetContract VARCHAR(100),
    raffleOwner VARCHAR(100),
    raffleWinner VARCHAR(100),
    raffleState VARCHAR(30),
    raffleType VARCHAR(20),
    nftIdOrAmount VARCHAR(255),
    currency VARCHAR(100),
    pricePerTicket VARCHAR(255),
    merkleRoot VARCHAR(100),
    endTimestamp VARCHAR(255),
    ticketsSold VARCHAR(255),
    minimumTicketsSold VARCHAR(255),
    numberOfTickets VARCHAR(255),
    assetContractName VARCHAR(100),
    tokenURI VARCHAR(255),
    currencyName VARCHAR(100),
    decimals INT,
    currencyDecimals INT,
    symbol VARCHAR(255)
);

CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    raffleId INT,
    ticketID VARCHAR(255),
    account VARCHAR(100)
);

CREATE TABLE callbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receiver VARCHAR(255),
    assetContract VARCHAR(255),
    isERC721 VARCHAR(10),
    amountOrNftIdToReceiver VARCHAR(255),
    increaseTotalAmountClaimable VARCHAR(255),
    callBackTimestamp VARCHAR(255),
    processed VARCHAR(10)
);

CREATE TABLE weekly_lottery (
    lotteryId INT PRIMARY KEY,
    total_tickets_sold VARCHAR(255),
    winner VARCHAR(160),
    status VARCHAR(16)
);

CREATE TABLE weekly_lottery_tokens (
    currency VARCHAR(255),
    amount VARCHAR(255), 
    lotteryId INT
);

CREATE TABLE weekly_lottery_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lotteryId INT,
    init_ticket VARCHAR(255),
    end_ticket VARCHAR(255),
    account VARCHAR(255)
);

CREATE TABLE weekly_lottery_currencies (
    address VARCHAR(255) PRIMARY KEY,
    decimals INT,
    name VARCHAR(255),
    symbol VARCHAR(255)
);

CREATE TABLE monthly_lottery_erc20 (
    lotteryId INT PRIMARY KEY,
    current_value VARCHAR(255),
    winner VARCHAR(100),
    status VARCHAR(16)
);

CREATE TABLE monthly_lottery_tickets_erc20 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lotteryId VARCHAR(255),
    init_ticket VARCHAR(255),
    end_ticket VARCHAR(255),
    account VARCHAR(160)
);

CREATE TABLE monthly_lottery_erc721 (
    lotteryId INT AUTO_INCREMENT PRIMARY KEY,
    current_value VARCHAR(255),
    status VARCHAR(16),
    total_tickets_sold VARCHAR(255),
    merkle_root VARCHAR(255),
    winner VARCHAR(160)
);

CREATE TABLE monthly_lottery_erc721_assets (
    nftId VARCHAR(255) PRIMARY KEY,
    address VARCHAR(255),
    lotteryId INT,
    FOREIGN KEY (lotteryId) REFERENCES monthly_lottery_erc721(lotteryId)
);

CREATE TABLE monthly_lottery_erc721_shares (
    address VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    floorPrice INT,
    shares INT,
    proof TEXT
);

CREATE TABLE monthly_lottery_tickets_erc721 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lotteryId INT,
    init_ticket VARCHAR(255),
    end_ticket VARCHAR(255),
    account VARCHAR(160),
    FOREIGN KEY (lotteryId) REFERENCES monthly_lottery_erc721(lotteryId)
);