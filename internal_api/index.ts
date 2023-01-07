import { pool } from './db';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
dotenv.config();

const app = express();
app.use(bodyParser.json({limit: "550mb"}));
app.use(bodyParser.urlencoded({limit: "150mb", extended: true, parameterLimit:50000}));

const corsOptions = {
    origin: '*',
    // origin: 'https://www.rafflefi.xyz'
    optionSuccessStatus: 200,
    methods: ['GET']
}

app.use(cors(corsOptions));
app.use(express.json());
app.options('*', cors());

interface SignatureRaffle {
    currency: string 
    price: string
    raffleId: number
    ticketId: string 
    boughtBy: string 
    seller: string
    signature: string 
    currencyName: string
    currencyDecimals: number 
}

// create a new signature 
app.post('/signatures', async (req, res) => {
    try {
        const data: SignatureRaffle = req.body
        const db = await pool.getConnection()
        await db.query(`INSERT INTO orders (
            currency, price, raffleId, ticketId, 
            bought, boughtBy, seller, signature,
            currencyName, currencyDecimals) VALUES(
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )`, [
                data.currency, data.price, data.raffleId, data.ticketId, 
                "false", data.boughtBy, data.seller, data.signature, 
                data.currencyName, data.currencyDecimals
            ])
        res.status(200).json('Success')
    } catch (error) {
        console.log(error)
        res.status(500).json('Error')
    }
})

// Get a raffle winner
app.get('/raffles/winner/:raffleId', async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        // Get the latest lottery data
        const result = await db.query(
            `SELECT winner FROM raffles WHERE raffleId=?`, [req.params.raffleId]);
        if (result.length > 0) {
            res.status(200).json(result);
        } else {
            res.status(204);
        }
    } catch(err) {
        res.status(500);
    } finally {
        if (db) await db.release();
    }
})


// Get current monthly lottery
app.get('/monthly_lottery/erc721', async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        // Get the latest lottery data
        const result = await db.query(`SELECT * FROM monthly_lottery_erc721 ORDER BY lotteryId DESC LIMIT 1;`);
        if (result.length > 0) {
            res.status(200).json(result);
        } else {
            res.status(204);
        }
    } catch(err) {
        res.status(500);
    } finally {
        if (db) await db.release();
    }
});

// Get the lottery data for a user
app.get('/monthly_lottery/erc721/:account/:month', async function(req, res) {
    let db: any;
    const account: string = req.params.account;
    if (!ethers.utils.isAddress(account)) {
        res.status(500);
        return 
    }
    const month = req.params.month;
    try {
        db = await pool.getConnection();
        // Get the latest lottery data
        const result = await db.query(`
            SELECT * FROM monthly_lottery_tickets_erc721 
            WHERE account=? AND lotteryId=?;`, [account, month]);
        if (result.length > 0) {
            res.status(200).json(result);
        } else {
            res.status(204);
        }
    } catch(err) {
        res.status(500);
    } finally {
        if (db) await db.release();
    }
})

// Get the proofs for a monthly erc721 lottery 
app.get('/proofs/:address/:id', async function(req, res) {
    let db: any;
    try {
        const address = req.params.address;
        const id = req.params.id;
        db = await pool.getConnection();
        if (!ethers.utils.isAddress(address)) {
            res.status(500).json("Not a valid EVM address")
        } else {
            const rows = await pool.query(`SELECT * FROM monthly_lottery_erc721_shares WHERE address=? AND id=?`, [
                address, id
            ]);
            if (rows.length > 0) {
                // Proof data needs to be converted from base64
                res.status(200).json(rows);
            } else {
                res.status(204);
            }
        }
    } catch(e) {
        res.status(500).json("Failed to get the proof")
    } finally {
        if (db) await db.release();
    }
});

// Get the assets contributed in the lottery
app.get('/monthly_lottery/erc721/assets/:id', async function(req, res) {
    let db: any;
    try {
        const id = req.params.id;
        db = await pool.getConnection();
        const rows = await pool.query(`SELECT * FROM monthly_lottery_erc721_assets WHERE id=?`, [
            id
        ]);
        if (rows.length > 0) {
            res.status(200).json(rows);
        } else {
            res.status(204);
        }
        
    } catch(e) {
        res.status(500).json("Failed to get the assets")
    } finally {
        if (db) await db.release();
    }
});

// Get current weekly lottery
app.get('/weeklylottery', async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        const result = await db.query(
            `SELECT * FROM weekly_lottery ORDER BY lotteryId DESC LIMIT 1;` 
        );
        if (result.length > 0) res.status(200).json(result)
        else res.status(204)
    } catch(err) {
        console.log(err)
        res.status(500)
    } finally {
        if (db) await db.release()
    }
});

// get the whitelisted tokens for weekly lottery
app.get('/weeklylottery/whitelistedtokens', async function (req, res) {
    let db: any 
    try {
        db = await pool.getConnection();
        const result = await db.query(`SELECT * FROM weekly_lottery_currencies;`)
        if (result.length > 0) res.status(200).json(result)
        else res.status(204)
    } catch (e) {
        console.log(e)
        res.status(500) 
    } finally {
        if (db) await db.release()
    }
})

app.get('/weeklylottery/tickets/:address/current', async function(req, res) {
    let db: any 
    const address = req.params.address
    if (!ethers.utils.isAddress(address)) {
        res.status(500)
        return 
    }
    try {
        db = await pool.getConnection();

        const id = await db.query(
            `SELECT lotteryId from weekly_lottery ORDER BY lotteryId DESC LIMIT 1;`
        )
        if (id.length === 0) {
            res.status(500)
            return 
        }

        const result = await db.query(`
            SELECT * FROM weekly_lottery_tickets
            WHERE account=? AND lotteryId=?`, [address, id[0].lotteryId])
        if (result.length > 0) res.status(200).json(result)
        else res.status(204)
    } catch (e) {
        console.log(e)
        res.status(500) 
    } finally {
        if (db) await db.release()
    }
})

app.get('/weeklylottery/tickets/:address', async function(req, res) {
    let db: any 
    const address = req.params.address
    if (!ethers.utils.isAddress(address)) {
        res.status(500)
        return 
    }
    try {
        db = await pool.getConnection();
        const result = await db.query(`
            SELECT * FROM weekly_lottery_tickets
            WHERE account=?`, [address])
        if (result.length > 0) res.status(200).json(result)
        else res.status(204)
    } catch (e) {
        console.log(e)
        res.status(500) 
    } finally {
        if (db) await db.release()
    }
})

app.get('/weeklylottery/tokens/current', async function(req, res) {
    let db: any 
    try {
        db = await pool.getConnection();

        const id = await db.query(
            `SELECT lotteryId from weekly_lottery ORDER BY lotteryId DESC LIMIT 1;`
        )
        if (id.length === 0) {
            res.status(500)
            return 
        }
        const result = await db.query(`
        SELECT weekly_lottery_tokens.currency,
        weekly_lottery_tokens.amount,
        weekly_lottery_currencies.decimals,
        weekly_lottery_currencies.name,
        weekly_lottery_currencies.symbol
        FROM weekly_lottery_tokens
        INNER JOIN weekly_lottery_currencies ON
        weekly_lottery_tokens.currency=weekly_lottery_currencies.address
        WHERE weekly_lottery_tokens.lotteryId=?;`,
        [id[0].lotteryId])
        if (result.length > 0) res.status(200).json(result)
        else res.status(204)
    } catch (e) {
        console.log(e)
        res.status(500) 
    } finally {
        if (db) await db.release()
    }
})

// ERC721 whitelisted raffles
app.get('/whitelisted/:type/:merkle_root', async function(req, res) {
    let db: any;
    try {
        const raffleType: string = req.params.type;
        if (!['erc20', 'erc721'].includes(raffleType.toLowerCase())) {
            res.status(500).json("Invalid raffle type");
            return
        }
        db = await pool.getConnection();
        const rows = await db.query(`SELECT * FROM raffles WHERE MerkleRoot=? AND raffleType=?;`, [req.params.merkle_root, raffleType.toUpperCase()]);
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows);
        }
    } catch(err) {
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release()
    }
});

// All whitelisted raffles
app.get('/whitelisted/:merkle_root', async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(`SELECT * FROM raffles WHERE MerkleRoot=?;`, 
        [req.params.merkle_root]);
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows);
        }
    } catch(err) {
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release()
    }
})

// all erc721 raffles that a user created
app.get('/raffles/erc721/created/:address', async function(req, res)  {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(`SELECT * FROM raffles WHERE raffleOwner=? AND raffleType='ERC721';`, [req.params.address]);
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows);
        }
    } catch(err) {
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release()
    }
});

// Get created raffles for a user
app.get('/raffles/:type/created/:address', async function(req, res) {
    let db: any;
    try {
        const raffleType: string = req.params.type;
        if (!['erc20', 'erc721'].includes(raffleType.toLowerCase())) {
            res.status(500).json("Invalid raffle type");
            return
        }
        const raffleOwner = req.params.address;
        if (!ethers.utils.isAddress(raffleOwner)) {
            console.log('not valid addr')
            res.status(500).json("Not a valid address");
            return 
        }
        db = await pool.getConnection();
        const rows = await db.query(`SELECT * FROM raffles WHERE raffleOwner=? AND raffleType=?`, [
            raffleOwner, raffleType.toUpperCase()
        ]);
        if (rows.length > 0) {
            res.status(200).json(rows);
        } else {
            res.status(204).json("No data");
        }
    } catch (e) {
        console.log(e);
        res.status(500).json("Failed to get the data");
    } finally {
        if (db) await db.release();
    }
});

// all raffles
app.get('/raffles/:type/:status', async function(req, res)  {
    let db: any;
    try {
        const raffleType: string = req.params.type;
        const status: string = req.params.status;
        if (!['erc20', 'erc721'].includes(raffleType.toLowerCase())) {
            res.status(500).json("Invalid raffle type");
            return 
        }
        if (!['active', 'finished'].includes(status.toLowerCase())) {
            res.status(500).json("Invalid status");
            return
        }

        db = await pool.getConnection();
        const query = status === 'active' ? `SELECT * FROM raffles WHERE raffleState=? AND raffleType=?;` :
        `SELECT * FROM raffles WHERE raffleState!=? AND raffleType=?`
        const rows = await db.query(
            query, [
            'IN_PROGRESS', raffleType.toUpperCase()
        ]);
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            const sorted = rows.reduce((group: any, item: any) => {
                const title = item.assetContractName;
                group[title] = group[title] ?? [];
                group[title].push(item);
                return group;             
            }, {});
            res.status(200).json(sorted);
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// All tickets for a specific raffle ID 
app.get('/tickets/raffle/:raffleId', async function(req, res)  {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(`SELECT * FROM tickets WHERE raffleId=?;`, [req.params.raffleId])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows);
        }
    } catch (err) {
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// Get a ticket on sale for a certain raffle id 
app.get("/tickets/sale/:raffleId/:ticketId", async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(
            `SELECT 
            r.assetContract, 
            r.raffleId,
            r.raffleType,
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.decimals,
            r.tokenURI,
            o.orderId, 
            o.boughtBy,
            o.signature,
            o.currency, 
            o.currencyName,
            o.currencyDecimals,
            o.price, 
            o.ticketId, 
            o.seller FROM raffles r INNER JOIN orders o ON r.raffleId=o.raffleId 
            WHERE o.raffleId=? AND o.ticketId=? AND o.bought='false';
        `, [req.params.raffleId, req.params.ticketId])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows);
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// All Tickets on sale
app.get('/tickets/raffles/sale', async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(
            `SELECT r.assetContract, 
            r.raffleId,
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.raffleType,
            r.decimals,
            r.tokenURI,
            o.orderId, 
            o.currency, 
            o.currencyName,
            o.currencyDecimals,
            o.price, 
            o.boughtBy,
            o.signature,
            o.ticketId, 
            o.signature,
            o.seller FROM raffles r INNER JOIN orders o ON r.raffleId=o.raffleId 
            WHERE 
            raffleState='IN_PROGRESS' AND o.bought='false';
        `, [])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            const sorted = rows.reduce((group: any, item: any) => {
                const title = item.assetContractName;
                group[title] = group[title] ?? [];
                group[title].push(item);
                return group;             
            }, {});
            res.status(200).json(sorted);
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// Tickets on sale for active raffles
app.get("/tickets/raffles/:type/sale", async function(req, res)  {
    let db: any;
    try {
        const raffleType = req.params.type;
        if (!['erc20', 'erc721'].includes(raffleType.toLowerCase())) {
            res.status(500).json("Invalid raffle type");
            return 
        } 
        db = await pool.getConnection();
        const rows = await db.query(
            `SELECT r.assetContract, 
            r.raffleId,
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.raffleType,
            r.decimals,
            r.tokenURI,
            r.symbol,
            o.orderId, 
            o.currency, 
            o.currencyName,
            o.currencyDecimals,
            o.price, 
            o.ticketId, 
            o.signature,
            o.boughtBy,
            o.seller FROM raffles r INNER JOIN orders o ON r.raffleId=o.raffleId 
            WHERE raffleType=? 
            AND raffleState='IN_PROGRESS' AND o.bought='false';
        `, [raffleType.toUpperCase()])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            const sorted = rows.reduce((group: any, item: any) => {
                const title = item.assetContractName;
                group[title] = group[title] ?? [];
                group[title].push(item);
                return group;             
            }, {});
            res.status(200).json(sorted);
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// Get a ticket by ticket ID, account and raffle ID 
app.get('/tickets/:raffleId/user/:account/:ticketId', async function(req, res) {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(
            `SELECT 
            t.raffleId, 
            t.ticketId, 
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.raffleType,
            r.decimals,
            r.tokenURI,
            r.symbol
            FROM tickets t
            INNER JOIN raffles r on t.raffleId=r.raffleId
            WHERE t.raffleId=? AND t.ticketId=? AND t.account=?;`, 
            [req.params.raffleId, req.params.ticketId, req.params.account]);
        if (rows.length === 0) {
            res.sendStatus(204)
        } else {
            res.status(200).json(rows)
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// All tickets for an account
app.get('/tickets/raffles/:type/user/:account/unsorted', async function(req, res)  {
    let db: any;
    try {
        const raffleType = req.params.type;
        const account = req.params.account;
        if (!ethers.utils.isAddress(account)) {
            res.status(500).json("Invalid address"); return 
        } 
        if (!['erc20', 'erc721'].includes(raffleType.toLowerCase())) {
            res.status(500).json("Invalid raffle type"); return; 
        }
        db = await pool.getConnection();
        let rows = await db.query(
            `SELECT 
            t.raffleId, 
            t.ticketId, 
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.raffleType,
            r.decimals,
            r.tokenURI,
            r.symbol
            FROM tickets t
            INNER JOIN raffles r on t.raffleId=r.raffleId
            WHERE account=? AND raffleType=?;`, [account, raffleType.toUpperCase()])
        if (rows.length === 0) {
            res.sendStatus(204)
        } else {
            res.status(200).json(rows)
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("Error")
    } finally {
        if (db) await db.release();
    }
});

// All raffles and tickets for an account
app.get('/tickets/raffles/user/:account', async function(req, res)  {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(
            `SELECT 
            t.raffleId, 
            t.ticketId, 
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.raffleType,
            r.decimals,
            r.tokenURI,
            r.symbol,
            FROM tickets t
            INNER JOIN raffles r on t.raffleId=r.raffleId
            WHERE t.account=?;`, [req.params.account])
        if (rows.length === 0) {
            res.sendStatus(204)
        } else {
            const sorted = rows.reduce((group: any, item: any) => {
                const title = item.assetContractName;
                group[title] = group[title] ?? [];
                group[title].push(item);
                return group;             
            }, {});
            res.status(200).json(sorted)
        }
    } catch (err) {
        res.status(500).json("There was an error");
    } finally {
        if (db) await db.release();
    }
});

// get a raffle data from id 
app.get('/raffle/:id', async function(req, res)  {
    let db: any;
    try {
        db = await pool.getConnection();
        const rows = await db.query(`
            SELECT * FROM raffles WHERE raffleId=?;`, [req.params.id]
        )
        if (rows.length === 0) {
            res.sendStatus(204)
        } else {
            res.status(200).json(rows)
        }

    } catch (err) {
        res.status(500).json("Error")
    } finally {
        if (db) await db.release();
    }
});

// All tickets for an account
app.get('/tickets/raffles/:type/user/:account', async function(req, res)  {
    let db: any;
    try {
        const raffleType = req.params.type;
        const account = req.params.account;
        if (!ethers.utils.isAddress(account)) {
            res.status(500).json("Invalid address"); return 
        } 
        if (!['erc20', 'erc721'].includes(raffleType.toLowerCase())) {
            res.status(500).json("Invalid raffle type"); return; 
        }
        db = await pool.getConnection();
        let rows = await db.query(
            `SELECT 
            t.raffleId, 
            t.ticketId, 
            r.nftIdOrAmount, 
            r.assetContractName, 
            r.pricePerTicket, 
            r.ticketsSold, 
            r.numberOfTickets, 
            r.currency as raffle_currency,
            r.currencyName as raffle_currency_name,
            r.currencyDecimals as raffle_currency_decimals,
            r.endTimestamp,
            r.raffleType,
            r.decimals,
            r.tokenURI,
            r.symbol
            FROM tickets t
            INNER JOIN raffles r on t.raffleId=r.raffleId
            WHERE account=? AND raffleType=?;`, [account, raffleType.toUpperCase()])
        if (rows.length === 0) {
            res.sendStatus(204)
        } else {
            const sorted = rows.reduce((group: any, item: any) => {
                const title = item.assetContractName;
                group[title] = group[title] ?? [];
                group[title].push(item);
                return group;             
            }, {});
            res.status(200).json(sorted)
        }
    } catch (err) {
        console.log(err)
        res.status(500).json("Error")
    } finally {
        if (db) await db.release();
    }
});

// Get the whitelisted currencies
app.get('/currencies', async function(req, res)  {
    let db: any;
    try {
        db = await pool.getConnection();
        let rows = await db.query(`SELECT * FROM currencies;`, [])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows);
        }
    } catch (err) {
        res.status(500).json("Error");
    } finally {
        if (db) await db.release();
    }
});

// Get the resale tickets sold for a user
app.get('/tickets/resale/sold/:address', async function (req, res) {
    let db: any;
    try {
        if (!ethers.utils.isAddress(req.params.address)) {
            res.status(500).json('Invalid address')
            console.log('invalid address')
            return 
        }
        db = await pool.getConnection();
        let rows = await db.query(`
        SELECT COUNT(raffleId) AS count
        FROM orders WHERE bought='true' AND seller=?;`, [req.params.address])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows[0].count.toString());
        }
    } catch (err) {
        res.status(500).json("Error");
        console.log(err)
    } finally {
        if (db) await db.release();
    }
})

// Get the amount of raffles created by a user
app.get('/raffles/created/amount/:address', async function(req, res) {
    let db: any;
    try {
        if (!ethers.utils.isAddress(req.params.address)) {
            res.status(500).json('Invalid address')
            console.log('invalid address')
            return 
        }
        db = await pool.getConnection();
        let rows = await db.query(`
        SELECT COUNT(raffleId) AS count
        FROM raffles WHERE raffleOwner=?;`, [req.params.address])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows[0].count.toString());
        }
    } catch (err) {
        res.status(500).json("Error");
        console.log(err)
    } finally {
        if (db) await db.release();
    }
})

app.get('/tickets/bought/amount/:address', async function(req, res) {
    let db: any;
    try {
        if (!ethers.utils.isAddress(req.params.address)) {
            res.status(500).json('Invalid address')
            console.log('invalid address')
            return 
        }
        db = await pool.getConnection();
        let rows = await db.query(`
        SELECT COUNT(account) AS count
        FROM tickets WHERE account=?;`, [req.params.address])
        if (rows.length === 0) {
            res.sendStatus(204);
        } else {
            res.status(200).json(rows[0].count.toString());
        }
    } catch (err) {
        res.status(500).json("Error");
        console.log(err)
    } finally {
        if (db) await db.release();
    }
})

app.listen(8000);